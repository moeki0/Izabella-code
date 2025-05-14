import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { store } from './store'
import { Agent, LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import log from 'electron-log/main'
import { searchKnowledge, vectorDelete } from './knowledgeTools'
import { messageSearch } from './messageSearchTool'
import { webSearchInstructions } from '../instructions/webSearchInstructions'
import { systemInstructions } from '../instructions/systemInstructions'
import { generateObject, LanguageModelV1 } from 'ai'
import { z } from 'zod'
import { getMessages } from './message'
import { replaceWorkingMemoryTool } from './workingMemoryTool'
import { TokenLimiter } from '@mastra/memory/processors'
import { enhanceInstructionsWithKnowledge } from './promptVectorSearch'

log.initialize()

export interface MessageType {
  role: 'system' | 'user' | 'assistant'
  content: string
}

process.env.PATH =
  shellPathSync() ||
  ['./node_modules/.bin', '/.nodebrew/current/bin', '/usr/local/bin', process.env.PATH].join(':')

let mcp
let tools

export const detectSearchNeed = async (input: string): Promise<boolean> => {
  try {
    const model = google('gemini-2.0-flash-lite')
    const recentMessages = await getMessages(3)
    const result = await generateObject({
      model,
      schema: z.object({
        search: z.boolean()
      }),
      temperature: 0,
      prompt: `
  あなたはウェブ検索が必要かどうかを判断するシステムです。
  外部情報（ファイル、コード）の読み書きをユーザーが要求する場合やユーザーの個人的な情報（ナレッジ）を検索する場合は、search: false（デフォルト）を返してください。
  ユーザーの質問に対して、最新の情報、ニュース、ファクトチェック、データが必要な場合は search: true を返してください。
  URLが渡された場合には search: true を返してください。
  ユーザーの質問: ${input}
  履歴: ${JSON.stringify(recentMessages)}`
    })
    return result.object.search as unknown as boolean
  } catch {
    return false
  }
}

export const initializeMCP = async (): Promise<void> => {
  const mcpServers = store.get('mcpServers') as
    | Record<
        string,
        {
          command: string
          args: string[]
          env?: Record<string, string>
        }
      >
    | undefined

  mcp = new MCPConfiguration({
    servers: mcpServers || {}
  })

  const knowledgeTools = {
    search_knowledge: searchKnowledge,
    delete_knowledge: vectorDelete
  }
  const messageTools = {
    search_message: messageSearch
  }
  const workingMemoryTools = {
    replace_memory: replaceWorkingMemoryTool
  }
  const mcpTools = await mcp.getTools()
  tools = { ...messageTools, ...workingMemoryTools, ...mcpTools, ...knowledgeTools }
}

export const model = async (useSearchGrounding: boolean): Promise<LanguageModel> => {
  if (useSearchGrounding) {
    return google('gemini-2.5-flash-preview-04-17', {
      useSearchGrounding: useSearchGrounding
    })
  } else {
    return google('gemini-2.5-flash-preview-04-17')
  }
}

export const getFilteredTools = (): Record<string, unknown> => {
  const enabledTools = store.get('enabledTools') as string[] | undefined

  if (!enabledTools || enabledTools.length === 0) {
    log.info('No tools enabled, returning empty tools object')
    return {}
  }

  const filteredTools = Object.entries(tools).reduce((filtered, [name, tool]) => {
    if (enabledTools.includes(name)) {
      filtered[name] = tool
    }
    return filtered
  }, {})

  log.info(`Filtered tools: ${Object.keys(filteredTools).join(', ')}`)
  return filteredTools
}

export const agent = async (
  model: LanguageModelV1,
  useSearchGrounding: boolean
): Promise<Agent> => {
  const agentTools = useSearchGrounding ? {} : getFilteredTools()

  log.info(
    `Creating agent with ${Object.keys(agentTools).length} tools. Search grounding: ${useSearchGrounding}`
  )

  return new Agent({
    instructions: '',
    name: 'Assistant',
    model,
    tools: agentTools
  })
}

export const formatMessageForLLM = (message: {
  role: string
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
  metadata?: string
}): MessageType | null => {
  if (message.role === 'tool') {
    return null
  }

  let contentToUse = message.content || ''

  // If message has metadata, try to include both content and metadata in a JSON structure
  if (message.metadata) {
    try {
      // Check if content is already in JSON format
      let content = contentToUse
      try {
        const parsed = JSON.parse(contentToUse)
        if (parsed.content) {
          content = parsed.content
        }
      } catch {
        // Content is not JSON, use as is
      }

      // Parse metadata
      const metadata = JSON.parse(message.metadata)

      // Create a combined object with content and metadata
      const combinedObj = {
        content: content,
        metadata: metadata
      }

      contentToUse = JSON.stringify(combinedObj)
    } catch (error) {
      console.error('Error formatting message with metadata:', error)
    }
  }

  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: contentToUse
  }
}

export const chat = async (
  agent: Agent,
  input: string,
  useSearchGrounding: boolean
): Promise<StreamReturn> => {
  const recentMessages = await getMessages()
  const formattedMessages = recentMessages
    .reverse()
    .map(formatMessageForLLM)
    .filter((message): message is MessageType => message !== null)

  let baseInstructions = useSearchGrounding
    ? await webSearchInstructions()
    : await systemInstructions()

  // Enhance instructions with vector search results based on user prompt and recent message history
  // Extract message content from the last 7 messages (or fewer if not available)
  const recentMessageContents = recentMessages
    .filter((message) => message.role === 'assistant' || message.role === 'user')
    .slice(0, 3)
    .map((msg) => msg.content || '')
    .filter((content) => content && content.trim() !== '')

  baseInstructions = await enhanceInstructionsWithKnowledge(
    input,
    baseInstructions,
    recentMessageContents
  )

  formattedMessages.push({ role: 'assistant', content: baseInstructions })
  formattedMessages.push({ role: 'user', content: input })

  const limitedMessages = new TokenLimiter(254000).process(formattedMessages)

  return await agent.stream(limitedMessages, {
    toolChoice: 'auto',
    maxSteps: 10,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048
        }
      }
    }
  })
}

initializeMCP()

export { mcp, tools }
