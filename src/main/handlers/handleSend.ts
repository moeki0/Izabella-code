import { agent, chat } from '../lib/llm'
import { mainWindow } from '..'
import { createMessage } from '../lib/message'
import { getOrCreateThread, updateThreadTitle } from '../lib/thread'
import { store } from '../lib/store'
import { saveToKnowledgeBase } from '../lib/vectorStoreTools'

// ツール実行の承認待ちを管理するPromise
let toolApprovalResolver: ((approved: boolean) => void) | null = null

// ツール実行の承認を待つ関数
const waitForToolApproval = (): Promise<boolean> => {
  return new Promise((resolve) => {
    toolApprovalResolver = resolve
  })
}

// ツール実行の承認ハンドラー
export const handleToolApproval = async (approved: boolean): Promise<void> => {
  if (toolApprovalResolver) {
    toolApprovalResolver(approved)
    toolApprovalResolver = null
  }
}

export type Assistant = {
  name: string
  instructions: string
  tools: Array<string>
  autoApprove: boolean
}

export const handleSend = async (
  _,
  input,
  resourceId,
  threadId,
  isRetry: boolean
): Promise<void> => {
  try {
    const assistants = store.get('assistants') as Array<Assistant>
    const currentAssistantName = store.get('assistant')
    const assistant = assistants?.find((a) => a.name === currentAssistantName)

    const stream = await chat(
      await agent(assistant ? assistant.instructions : ''),
      input,
      resourceId,
      threadId
    )

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
    if (!isRetry) {
      await getOrCreateThread(threadId)
      await createMessage({
        threadId,
        role: 'user',
        content: input
      })

      // スレッドタイトルを更新
      await updateThreadTitle({
        id: threadId,
        title: 'Test Thread'
      })

      // ユーザー入力を自動的にナレッジベースに保存
      try {
        if (input && input.length > 10) {
          // 十分な長さがある場合のみ保存
          // ユニークなID生成
          const id = `user-input-${Date.now()}`

          // ナレッジベースに保存
          await saveToKnowledgeBase({
            indexName: 'knowledge',
            text: input,
            id: id,
            similarityThreshold: 0.9 // ユーザー入力はより厳密にマッチングする
          })
        }
      } catch (error) {
        // エラーを表示するが処理は継続
        console.error('Knowledge base storage error for user input:', error)
      }
    }

    globalThis.interrupt = false

    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'error') {
        await createMessage({
          threadId,
          role: 'tool',
          toolName: 'Error',
          toolRes: String(chunk.error)
        })
        throw chunk.error
      }
      if (globalThis.interrupt) {
        globalThis.interrupt = false
        throw 'Interrupt'
      }
      if (chunk.type === 'tool-call') {
        mainWindow.webContents.send('tool-call', chunk, !assistant?.autoApprove)
        const approved = assistant?.autoApprove ? true : await waitForToolApproval()
        if (!approved) {
          throw 'ToolRejected'
        }
      }
      if (chunk.type === 'tool-result') {
        mainWindow.webContents.send('tool-result', chunk)

        // メッセージ履歴に保存
        await createMessage({
          threadId,
          role: 'tool',
          toolName: chunk.toolName,
          toolReq: JSON.stringify(chunk.args),
          toolRes: JSON.stringify(chunk.result)
        })

        try {
          // ツール実行結果を自動的にナレッジベースに保存
          const toolName = chunk.toolName
          const toolResult = chunk.result

          // 保存する価値のある結果かを判断（シンプルな例）
          const shouldStore =
            // 以下の値やメソッドが存在する場合は保存しない
            toolName !== 'knowledge-search-and-upsert' &&
            toolName !== 'knowledge-search' &&
            toolName !== 'knowledge-delete' &&
            toolResult &&
            typeof toolResult === 'object'

          if (shouldStore) {
            // 結果の内容をテキスト化
            const textContent = JSON.stringify(toolResult, null, 2)

            // ユニークなID生成（ツール名とタイムスタンプの組み合わせ）
            const id = `tool-result-${toolName}-${Date.now()}`

            // ナレッジベースに保存
            await saveToKnowledgeBase({
              indexName: 'knowledge',
              text: textContent,
              id: id,
              metadata: { toolName, timestamp: Date.now() },
              similarityThreshold: 0.85
            })
          }
        } catch (error) {
          // エラーを表示するが処理は継続
          console.error('Knowledge base storage error:', error)
        }
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
        mainWindow.webContents.send('stream', chunk.textDelta)
        content += chunk.textDelta
      }
      if (chunk.type === 'step-finish') {
        mainWindow.webContents.send('step-finish')
        if (content.length > 0) {
          if (sourcesArray.length > 0) {
            mainWindow.webContents.send('source', {
              sources: sourcesArray,
              isPartial: false
            })
          }

          await createMessage({
            threadId,
            role: 'assistant',
            content,
            sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
          })

          // AIの応答を自動的にナレッジベースに保存
          try {
            if (content && content.length > 20) {
              // 十分な長さがある場合のみ保存
              // ユニークなID生成
              const id = `assistant-response-${Date.now()}`

              // ナレッジベースに保存
              await saveToKnowledgeBase({
                indexName: 'knowledge',
                text: content,
                id: id,
                metadata: { type: 'assistant_response', timestamp: Date.now() },
                similarityThreshold: 0.85
              })
            }
          } catch (error) {
            // エラーを表示するが処理は継続
            console.error('Knowledge base storage error for assistant response:', error)
          }
        }
        content = ''
        sourcesArray = []
      }
      if (chunk.type === 'finish') {
        mainWindow.webContents.send('finish')
        if (content.length > 0) {
          if (sourcesArray.length > 0) {
            mainWindow.webContents.send('source', {
              sources: sourcesArray,
              isPartial: false
            })
          }

          await createMessage({
            threadId,
            role: 'assistant',
            content,
            sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
          })

          // AIの最終応答を自動的にナレッジベースに保存
          try {
            if (content && content.length > 20) {
              // 十分な長さがある場合のみ保存
              // ユニークなID生成
              const id = `assistant-final-response-${Date.now()}`

              // ナレッジベースに保存
              await saveToKnowledgeBase({
                indexName: 'knowledge',
                text: content,
                id: id,
                metadata: { type: 'assistant_final_response', timestamp: Date.now() },
                similarityThreshold: 0.85
              })
            }
          } catch (error) {
            // エラーを表示するが処理は継続
            console.error('Knowledge base storage error for assistant final response:', error)
          }
        }
      }
    }
  } catch (e) {
    mainWindow.webContents.send('error', typeof e === 'string' ? e : String(e))
  }
}
