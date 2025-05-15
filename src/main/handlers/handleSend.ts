import { agent, chat, detectSearchNeed, model } from '../lib/llm'
import { mainWindow } from '..'
import { createMessage, getMessages } from '../lib/message'
import { processConversationForKnowledge } from '../lib/extractKnowledge'
import { processConversationForWorkingMemory } from '../lib/generateWorkingMemory'
import { checkAndCompressWorkingMemory } from '../lib/compressWorkingMemory'
import { extractTheme, getThemeFromMetadata } from '../lib/extractTheme'
import { cleanContentForDisplay } from '../lib/cleanContent'

export type Assistant = {
  name: string
  instructions: string
  tools: Array<string>
  autoApprove: boolean
}

/**
 * コンテンツからテーマを抽出して保存する関数
 * @param originalContent メッセージのコンテンツ
 * @param sourcesArray ソース情報の配列
 * @param previousTheme 以前のテーマ（存在する場合）
 */
async function extractAndSaveTheme(
  originalContent: string,
  sourcesArray: Array<Record<string, unknown>>,
  previousTheme?: string
): Promise<void> {
  try {
    // テーマの抽出
    const theme = await extractMessageTheme(originalContent, previousTheme)
    const metadata = { theme }

    // Store message with metadata (オリジナルコンテンツを保存)
    const savedMessageId = await createMessage({
      role: 'assistant',
      content: originalContent,
      sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined,
      metadata: JSON.stringify(metadata)
    })

    // 保存が完了したらテーマ情報をUIに送信
    mainWindow.webContents.send('message-saved', savedMessageId, {
      theme: metadata.theme
    })
  } catch (error) {
    console.error('テーマ抽出またはメッセージ保存エラー:', error)
  }
}

/**
 * メッセージの内容からテーマを抽出する関数
 * @param content メッセージの内容
 * @param previousTheme 以前のテーマ（存在する場合）
 * @returns 抽出されたテーマ
 */
async function extractMessageTheme(content: string, previousTheme?: string): Promise<string> {
  // LLMがJSON形式でメタデータを提供しているかチェック
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const jsonObj = JSON.parse(content.trim())
      if (jsonObj.metadata && jsonObj.metadata.theme) {
        const theme = jsonObj.metadata.theme
        console.log(`LLM出力のJSONからテーマを直接抽出しました: ${theme}`)
        return theme
      }
    } catch {
      // JSONパースエラー、通常の抽出に進む
    }
  }

  // 過去5件のメッセージを取得
  const recentMessagesForTheme = await getMessages()
  const formattedMessages = recentMessagesForTheme
    .reverse()
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content || ''
    }))
    .filter((message) => message.content.trim() !== '')

  // 現在のメッセージも追加
  formattedMessages.push({
    role: 'assistant',
    content: cleanContentForDisplay(content)
  })

  const theme = await extractTheme(formattedMessages, previousTheme)
  console.log(`抽出されたテーマ: ${theme} (前のテーマ: ${previousTheme || 'なし'})`)

  return theme
}

/**
 * メッセージコンテンツの処理を行う共通関数
 * @param content メッセージのコンテンツ
 * @param sourcesArray ソース情報の配列
 * @param previousTheme 以前のテーマ（存在する場合）
 * @param id メッセージID
 */
async function processMessageContent(
  content: string,
  sourcesArray: Array<Record<string, unknown>>,
  previousTheme: string | undefined,
  id: string | undefined
): Promise<void> {
  // 空のコンテンツは処理しない
  if (content.length === 0) return

  // ソース情報の送信
  if (sourcesArray.length > 0) {
    mainWindow.webContents.send('source', {
      sources: sourcesArray,
      isPartial: false
    })
  }

  // 日付情報を先に通知（現在時刻をUTCではなくローカル時間で）
  const now = new Date()
  mainWindow.webContents.send('message-saved', id, {
    created_at: now.toISOString()
  })

  await extractAndSaveTheme(content, sourcesArray, previousTheme)
}

export const handleSend = async (_, input): Promise<void> => {
  try {
    // Get the most recent messages to find the previous theme
    const recentMessages = await getMessages(2)
    let previousTheme: string | undefined = undefined

    if (recentMessages.length > 0) {
      const lastMessage = recentMessages[0]
      previousTheme = getThemeFromMetadata(lastMessage)
      console.log(
        `前回のテーマ: ${previousTheme || 'なし'}, 最新メッセージのID: ${lastMessage.id || '未定義'}`
      )
    }

    // Create user message with empty metadata for now
    let id: string | undefined = undefined
    id = await createMessage({
      role: 'user',
      content: input,
      metadata: JSON.stringify({})
    })

    const useSearchGrounding = await detectSearchNeed(input)
    const m = await model(useSearchGrounding)
    const stream = await chat(await agent(m, useSearchGrounding), input, useSearchGrounding)

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
    // ユーザーメッセージにはテーマ情報はないが、日付情報は送信
    mainWindow.webContents.send('message-saved', id, {
      created_at: new Date().toISOString()
    })

    globalThis.Interrupt = false

    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'error') {
        throw chunk.error
      }
      if (globalThis.interrupt) {
        globalThis.interrupt = false
        if (content.length > 0) {
          // 中断時も同様の処理を行うが、テーマは抽出しない
          // メッセージを保存
          id = await createMessage({
            role: 'assistant',
            content,
            sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
          })

          // 中断時のメッセージ保存時にも日付情報を送信
          const now = new Date()
          mainWindow.webContents.send('message-saved', id, {
            created_at: now.toISOString()
          })
        }
        throw 'Interrupt'
      }
      if (chunk.type === 'tool-call') {
        mainWindow.webContents.send('tool-call', chunk, false)
      }
      if (chunk.type === 'tool-result') {
        mainWindow.webContents.send('tool-result', chunk)

        id = await createMessage({
          role: 'tool',
          toolName: chunk.toolName,
          toolReq: JSON.stringify(chunk.args),
          toolRes: JSON.stringify(chunk.result)
        })
        // ツール結果保存時にも日付情報を送信
        mainWindow.webContents.send('message-saved', id, {
          created_at: new Date().toISOString()
        })
      }
      if (chunk.type === 'source') {
        const newSource = chunk.source

        const getSourceUrl = (source): string | null => {
          if (typeof source === 'string' && /^https?:\/\//.test(source)) return source
          if (source && typeof source === 'object') {
            return (
              source.url ||
              (source.source && source.source.url) ||
              (source.metadata && source.metadata.url)
            )
          }
          return null
        }
        const newSourceUrl = getSourceUrl(newSource)

        let isDuplicate = false
        if (newSourceUrl) {
          isDuplicate = sourcesArray.some((existingSource) => {
            const existingUrl = getSourceUrl(existingSource)
            return existingUrl && existingUrl === newSourceUrl
          })
        }

        if (!isDuplicate) {
          sourcesArray.push(newSource)
        }
      }
      if (chunk.type === 'text-delta') {
        // オリジナルのコンテンツには常に追加
        content += chunk.textDelta

        // すべてのテキストをそのままクライアントに送信
        // フロントエンド側でJSONの処理を行う
        mainWindow.webContents.send('stream', chunk.textDelta)
      }
      if (chunk.type === 'step-finish') {
        mainWindow.webContents.send('step-finish')
        // リファクタリングした共通関数を使用
        await processMessageContent(content, sourcesArray, previousTheme, id)
        content = ''
        sourcesArray = []
      }
      if (chunk.type === 'finish') {
        mainWindow.webContents.send('finish')
        // リファクタリングした共通関数を使用
        await processMessageContent(content, sourcesArray, previousTheme, id)

        // 処理後にcontentをクリア
        content = ''
        sourcesArray = []
        // 会話履歴からナレッジを抽出して保存
        try {
          const recentMessages = await getMessages(10)
          const formattedMessages = recentMessages
            .map((message) => ({
              role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
              content: message.content || ''
            }))
            .filter((message) => message.content.trim() !== '')

          // 別のLLMでナレッジを抽出して保存する処理
          const savedKnowledgeIds = await processConversationForKnowledge(
            formattedMessages.slice(0, 2).reverse()
          )

          // 保存されたナレッジIDをUIに通知
          if (savedKnowledgeIds.length > 0) {
            mainWindow.webContents.send('knowledge-saved', {
              ids: savedKnowledgeIds
            })

            // ナレッジベースへの記録をツールメッセージとして保存
            await createMessage({
              role: 'tool',
              toolName: 'knowledge_record',
              toolReq: JSON.stringify({ conversation_id: id }),
              toolRes: JSON.stringify({ saved_knowledge_ids: savedKnowledgeIds })
            })
          }

          // ワーキングメモリを更新
          try {
            const memoryUpdated = await processConversationForWorkingMemory(formattedMessages)

            if (memoryUpdated) {
              // ワーキングメモリ更新をツールメッセージとして保存
              await createMessage({
                role: 'tool',
                toolName: 'memory_update',
                toolReq: JSON.stringify({ conversation_id: id }),
                toolRes: JSON.stringify({ updated: true })
              })

              // UI通知を送信
              mainWindow.webContents.send('memory-updated', {
                success: true
              })

              try {
                const wasCompressed = await checkAndCompressWorkingMemory()
                if (wasCompressed) {
                  await createMessage({
                    role: 'tool',
                    toolName: 'memory_compression',
                    toolReq: JSON.stringify({ conversation_id: id }),
                    toolRes: JSON.stringify({ compressed: true })
                  })
                }
              } catch (compressionError) {
                console.error('Error compressing working memory:', compressionError)
              }
            }
          } catch (memoryError) {
            console.error('Error updating working memory:', memoryError)
          }
        } catch (error) {
          console.error('Error processing conversation for knowledge:', error)
        }
      }
    }
  } catch (e) {
    if (e !== 'Interrupt' && e !== 'ToolRejected') {
      mainWindow.webContents.send('error', typeof e === 'string' ? e : String(e))
    }
  }
}
