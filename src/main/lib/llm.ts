import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { Agent } from '@mastra/core/agent'
import { store } from './store'
import { LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import log from 'electron-log/main'
import { vectorSearchAndUpsert, vectorSearch, vectorDelete } from './vectorStoreTools'
import { messageSearch } from './messageSearchTool'
import { knowledgeInstructions } from '../instructions/knowledgeInstructions'
import { webSearchInstructions } from '../instructions/webSearchInstructions'
import { systemInstructions } from '../instructions/systemInstructions'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getMessages } from './message'
import { updateWorkingMemoryTool } from './workingMemoryTool'
import { TokenLimiter } from '@mastra/memory/processors'
import { workingMemoryInstructions } from '../instructions/workingMemoryInstructions'

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

const detectSearchNeed = async (input: string): Promise<boolean> => {
  try {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string
    const model = google('gemini-2.0-flash-lite')
    const recentMessages = await getMessages(5)
    const result = await generateObject({
      model,
      schema: z.object({
        search: z.boolean()
      }),
      temperature: 0,
      prompt: `
You are a system that determines if web search is needed.
Return search: false (default) if the user requests to read or write external information (files, codes).
For user questions, return search: true if recent information, news, fact checking, or data is required.
User question: ${input}
History: ${JSON.stringify(recentMessages)}`
    })
    return result.object.search as unknown as boolean
  } catch {
    return false
  }
}

export const initializeMCP = async (): Promise<void> => {
  const avairableServers = {}
  const serverConfig = store.get('mcpServers') as object
  if (serverConfig) {
    Object.keys(serverConfig).forEach((key) => {
      avairableServers[key] = serverConfig[key]
      if (avairableServers[key].url) {
        avairableServers[key].url = new URL(avairableServers[key].url)
      }
    })
  }
  mcp = new MCPConfiguration({
    servers: avairableServers || {}
  })
  const knowledgeTools = {
    knowledge_search_and_upsert: vectorSearchAndUpsert,
    knowledge_search: vectorSearch,
    knowledge_delete: vectorDelete
  }
  const messageTools = {
    message_search: messageSearch
  }
  const workingMemoryTools = {
    update_working_memory: updateWorkingMemoryTool
  }
  const mcpTools = await mcp.getTools()
  tools = { ...mcpTools, ...knowledgeTools, ...messageTools, ...workingMemoryTools }
}

const model = async (useSearchGrounding: boolean): Promise<LanguageModel> => {
  const modelName = 'gemini-2.5-flash-preview-04-17'
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string

  if (useSearchGrounding) {
    return google(modelName, {
      useSearchGrounding
    })
  } else {
    return google(modelName)
  }
}

export const agent = async (input: string): Promise<Agent> => {
  const useSearchGrounding = await detectSearchNeed(input)
  const baseInstructions = useSearchGrounding
    ? webSearchInstructions + (await systemInstructions())
    : workingMemoryInstructions + knowledgeInstructions + (await systemInstructions())

  const agentInstructions = baseInstructions

  const mode = await model(useSearchGrounding)

  return new Agent({
    name: 'Assistant',
    instructions: agentInstructions,
    model: mode,
    tools
  })
}

export const formatMessageForLLM = (message: {
  role: string
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
}): MessageType | null => {
  if (message.role === 'tool') {
    return null
  }
  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content || ''
  }
}

export const chat = async (agent: Agent, input: string): Promise<StreamReturn> => {
  const recentMessages = await getMessages()
  const formattedMessages = recentMessages
    .reverse()
    .map(formatMessageForLLM)
    .filter((message): message is MessageType => message !== null)

  formattedMessages.push({ role: 'user', content: input })

  const limitedMessages = new TokenLimiter(254000).process(formattedMessages)

  return await agent.stream(limitedMessages, {
    toolChoice: 'auto',
    maxSteps: 10
  })
}

initializeMCP()

export { mcp, tools }
export { handleToolApproval } from '../handlers/handleSend'
