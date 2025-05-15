import { chat } from '../lib/chat'
import { mainWindow } from '..'
import { createMessage, getMessages } from '../lib/message'
import { processConversationForKnowledge } from '../lib/extractKnowledge'
import { processConversationForWorkingMemory } from '../lib/generateWorkingMemory'
import { checkAndCompressWorkingMemory } from '../lib/compressWorkingMemory'

export type Assistant = {
  name: string
  instructions: string
  tools: Array<string>
  autoApprove: boolean
}

async function extractAndSaveTheme(
  originalContent: string,
  sourcesArray: Array<Record<string, unknown>>
): Promise<void> {
  try {
    await createMessage({
      role: 'assistant',
      content: originalContent,
      sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
    })
  } catch (error) {
    console.error('テーマ抽出またはメッセージ保存エラー:', error)
  }
}

async function processMessageContent(
  content: string,
  sourcesArray: Array<Record<string, unknown>>,
  id: string | undefined
): Promise<void> {
  if (content.length === 0) return

  if (sourcesArray.length > 0) {
    mainWindow.webContents.send('source', {
      sources: sourcesArray,
      isPartial: false
    })
  }

  const now = new Date()
  mainWindow.webContents.send('message-saved', id, {
    created_at: now.toISOString()
  })

  await extractAndSaveTheme(content, sourcesArray)
}

export const handleSend = async (_, input): Promise<void> => {
  try {
    let id: string | undefined = undefined
    id = await createMessage({
      role: 'user',
      content: input,
      metadata: JSON.stringify({})
    })

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
    mainWindow.webContents.send('message-saved', id, {
      created_at: new Date().toISOString()
    })

    globalThis.Interrupt = false

    for await (const chunk of (await chat(input)).fullStream) {
      if (chunk.type === 'error') {
        throw chunk.error
      }
      if (globalThis.interrupt) {
        globalThis.interrupt = false
        if (content.length > 0) {
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
        content += chunk.textDelta
        mainWindow.webContents.send('stream', chunk.textDelta)
      }
      if (chunk.type === 'step-finish') {
        mainWindow.webContents.send('step-finish')
        await processMessageContent(content, sourcesArray, id)
        content = ''
        sourcesArray = []
      }
      if (chunk.type === 'finish') {
        mainWindow.webContents.send('finish')
        await processMessageContent(content, sourcesArray, id)

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
