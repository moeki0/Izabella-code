import { agent, chat, detectSearchNeed, model } from '../lib/llm'
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

export const handleSend = async (_, input): Promise<void> => {
  try {
    let id: string | undefined = undefined
    id = await createMessage({
      role: 'user',
      content: input
    })
    const useSearchGrounding = await detectSearchNeed(input)
    const m = await model(useSearchGrounding)
    const stream = await chat(await agent(m, useSearchGrounding), input, useSearchGrounding)

    let content = ''
    let sourcesArray: Array<Record<string, unknown>> = []
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
        // 会話履歴からナレッジを抽出して保存
        try {
          const recentMessages = await getMessages(10)
          const formattedMessages = recentMessages
            .reverse()
            .map((message) => ({
              role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
              content: message.content || ''
            }))
            .filter((message) => message.content.trim() !== '')

          // 別のLLMでナレッジを抽出して保存する処理
          const savedKnowledgeIds = await processConversationForKnowledge(formattedMessages)

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
