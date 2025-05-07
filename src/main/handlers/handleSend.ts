import { agent, chat } from '../lib/llm'
import { mainWindow } from '..'
import { createMessage } from '../lib/message'
import { getOrCreateThread } from '../lib/thread'
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

export const handleSend = async (_, input, resourceId, threadId): Promise<void> => {
  try {
    const assistants = store.get('assistants') as Array<Assistant>
    const currentAssistantName = store.get('assistant')
    const assistant = assistants?.find((a) => a.name === currentAssistantName)

    const stream = await chat(await agent(), input, resourceId, threadId)

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
    await getOrCreateThread(threadId)
    await createMessage({
      threadId,
      role: 'user',
      content: input
    })

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

        await createMessage({
          threadId,
          role: 'tool',
          toolName: chunk.toolName,
          toolReq: JSON.stringify(chunk.args),
          toolRes: JSON.stringify(chunk.result)
        })

        try {
          const toolName = chunk.toolName
          const toolResult = chunk.result

          const shouldStore =
            toolName !== 'knowledge-search-and-upsert' &&
            toolName !== 'knowledge-search' &&
            toolName !== 'knowledge-delete' &&
            toolName !== 'message_search' &&
            toolResult &&
            typeof toolResult === 'object'

          if (shouldStore) {
            const textContent = JSON.stringify(toolResult, null, 2)
            const id = `tool-result-${toolName}-${Date.now()}`

            await saveToKnowledgeBase({
              indexName: 'knowledge',
              text: textContent,
              id: id,
              similarityThreshold: 0.7
            })
          }
        } catch (error) {
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
        }
      }
    }
  } catch (e) {
    mainWindow.webContents.send('error', typeof e === 'string' ? e : String(e))
  }
}
