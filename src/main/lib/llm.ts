import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { Agent } from '@mastra/core/agent'
import { store } from './store'
import { LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import log from 'electron-log/main'
import { vectorSearchAndUpsert, vectorSearch, vectorDelete } from './vectorStoreTools'
import { messageSearch } from './messageSearchTool'
import { knowledgeInstructions } from './knowledgeInstructions'
import { webSearchInstructions } from './webSearchInstructions'
import { memory } from './memory'
import { systemInstructions } from './systemInstructions'
import { generateObject } from 'ai'
import { z } from 'zod'

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

    const result = await generateObject({
      model,
      schema: z.object({
        search: z.boolean()
      }),
      temperature: 0,
      prompt: `
    You are a system that determines if web search is needed.
    For user questions, return search: true if recent information, news, fact checking, or data is required.
    Return search: false if the user requests to read or write external information.
    User question: ${input}`
    })

    return JSON.stringify(result, null, 2).search as unknown as boolean
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
  const mcpTools = await mcp.getTools()
  const knowledgeTools = {
    'knowledge-search-and-upsert': vectorSearchAndUpsert,
    'knowledge-search': vectorSearch,
    'knowledge-delete': vectorDelete
  }
  const messageTools = {
    message_search: messageSearch
  }
  tools = { ...mcpTools, ...knowledgeTools, ...messageTools }
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

  // Determine which instructions to use based on search grounding state
  const agentInstructions = useSearchGrounding
    ? webSearchInstructions + systemInstructions
    : knowledgeInstructions + systemInstructions

  return new Agent({
    name: 'Assistant',
    instructions: agentInstructions,
    model: await model(useSearchGrounding),
    tools,
    memory
  })
}

export const chat = async (agent: Agent, input: string): Promise<StreamReturn> => {
  return await agent.stream(input, {
    toolChoice: 'auto',
    maxSteps: Number(store.get('maxSteps') || 10),
    resourceId: 'ChatZen',
    threadId: 'ChatZen'
  })
}

initializeMCP()

export { mcp, tools }
export { handleToolApproval } from '../handlers/handleSend'
