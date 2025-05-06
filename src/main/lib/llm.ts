import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { Agent, ToolsInput } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { store } from './store'
import { LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import { deepseek } from '@ai-sdk/deepseek'
import log from 'electron-log/main'
import { memory } from './memory'

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
  tools = await mcp.getTools()
}

const model = (): LanguageModel | LanguageModel => {
  const modelName = (store.get('model') || '') as string
  let model
  if (modelName.includes('gpt')) {
    process.env.OPENAI_API_KEY = store.get('apiKeys.openai') as string
    model = openai.responses(modelName)
  } else if (modelName.includes('claude')) {
    process.env.ANTHROPIC_API_KEY = store.get('apiKeys.anthropic') as string
    model = anthropic(modelName)
  } else if (modelName.includes('gemini')) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string
    model = google(modelName, {
      useSearchGrounding: true
    })
  } else if (modelName.includes('deepseek')) {
    process.env.DEEPSEEK_API_KEY = store.get('apiKeys.deepseek') as string
    model = deepseek(modelName)
  }
  return model
}

export const agent = async (
  instructions = '',
  availableTools: Array<unknown> = tools
): Promise<Agent> => {
  const modelName = (store.get('model') || '') as string
  let currentTools = availableTools as unknown as ToolsInput
  if (modelName.includes('gpt')) {
    currentTools.web_search_preview = openai.tools.webSearchPreview({
      searchContextSize: 'high'
    })
  }
  currentTools = Object.keys(currentTools).length > 0 ? currentTools : tools
  return new Agent({
    name: 'Assistant',
    instructions: instructions + ((store.get('instructions') as string) || 'You help users.'),
    model: model(),
    tools: currentTools,
    memory
  })
}

export const titleAgent = async (): Promise<Agent> => {
  return new Agent({
    name: 'titleAgent',
    instructions:
      'Please give a title to this exchange between ASSISTANT and USER. Please use the language of the input.',
    model: model()
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
