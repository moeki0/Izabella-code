import { agent, chat, detectSearchNeed, model } from '../lib/llm'
import { mainWindow } from '..'
import { createMessage } from '../lib/message'
import { saveToKnowledgeBase } from '../lib/knowledgeTools'
import { generateKnowledgeId } from '../lib/generateKnowledgeId'

export type Assistant = {
  name: string
  instructions: string
  tools: Array<string>
  autoApprove: boolean
}

export const handleSend = async (_, input): Promise<void> => {
  try {
    const useSearchGrounding = await detectSearchNeed(input)
    const m = await model(useSearchGrounding)
    const stream = await chat(await agent(m, useSearchGrounding), input, useSearchGrounding)

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
    let id: string | undefined = undefined
    id = await createMessage({
      role: 'user',
      content: input
    })
    mainWindow.webContents.send('message-saved', id)

    globalThis.Interrupt = false

    for await (const chunk of stream.fullStream) {
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
          mainWindow.webContents.send('message-saved', id)
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
        mainWindow.webContents.send('message-saved', id)

        const result = JSON.stringify(chunk.result)
        if (result.match(/(content|text|body|value)/m) || result.length > 300) {
          const knowledgeId = await generateKnowledgeId(result, chunk.toolName)

          saveToKnowledgeBase({
            text: result,
            id: knowledgeId,
            similarityThreshold: 0.8
          })
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

          id = await createMessage({
            role: 'assistant',
            content,
            sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
          })
          mainWindow.webContents.send('message-saved', id)
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
            role: 'assistant',
            content,
            sources: sourcesArray.length > 0 ? JSON.stringify(sourcesArray) : undefined
          })
        }
      }
    }
  } catch (e) {
    if (e !== 'Interrupt' && e !== 'ToolRejected') {
      mainWindow.webContents.send('error', typeof e === 'string' ? e : String(e))
    }
  }
}
