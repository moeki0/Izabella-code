import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { Agent } from '@mastra/core/agent'
import { store } from './store'
import { LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import log from 'electron-log/main'
import { vectorSearchAndUpsert, vectorSearch, vectorDelete } from './vectorStoreTools'
import { knowledgeInstructions } from './knowledgeInstructions'
import { webSearchInstructions } from './webSearchInstructions'
import { memory } from './memory'
import { systemInstructions } from './systemInstructions'

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

  // Get MCP tools
  const mcpTools = await mcp.getTools()

  // Add knowledge tools
  const knowledgeTools = {
    'knowledge-search-and-upsert': vectorSearchAndUpsert,
    'knowledge-search': vectorSearch,
    'knowledge-delete': vectorDelete
  }

  // Combine MCP tools with knowledge tools
  tools = { ...mcpTools, ...knowledgeTools }
}

const model = (): LanguageModel => {
  const modelName = 'gemini-2.5-flash-preview-04-17'
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string

  const useSearchGrounding = store.get('useSearchGrounding') !== false

  if (useSearchGrounding) {
    return google(modelName, {
      useSearchGrounding
    })
  } else {
    return google(modelName)
  }
}

export const agent = async (): Promise<Agent> => {
  const useSearchGrounding = store.get('useSearchGrounding') !== false

  // Determine which instructions to use based on search grounding state
  const agentInstructions = useSearchGrounding
    ? webSearchInstructions + systemInstructions
    : knowledgeInstructions + systemInstructions

  return new Agent({
    name: 'Assistant',
    instructions: agentInstructions,
    model: model(),
    tools,
    memory
  })
}

export const chat = async (
  agent: Agent,
  input: string,
  resourceId: string,
  threadId: string
): Promise<StreamReturn> => {
  return await agent.stream(input, {
    toolChoice: 'auto',
    maxSteps: Number(store.get('maxSteps') || 10),
    resourceId,
    threadId
  })
}

initializeMCP()

export { mcp, tools }
export { handleToolApproval } from '../handlers/handleSend'
