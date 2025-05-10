import { shellPathSync } from 'shell-path'
import { MCPConfiguration } from '@mastra/mcp'
import { Agent } from '@mastra/core/agent'
import { store } from './store'
import { LanguageModel, StreamReturn } from '@mastra/core'
import { google } from '@ai-sdk/google'
import log from 'electron-log/main'
import { upsertKnowledge, searchKnowledge, vectorDelete } from './knowledgeTools'
import { messageSearch } from './messageSearchTool'
import { knowledgeInstructions } from '../instructions/knowledgeInstructions'
import { webSearchInstructions } from '../instructions/webSearchInstructions'
import { systemInstructions } from '../instructions/systemInstructions'
import { generateObject, LanguageModelV1 } from 'ai'
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

export const detectSearchNeed = async (input: string): Promise<boolean> => {
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
  あなたはウェブ検索が必要かどうかを判断するシステムです。
  外部情報（ファイル、コード）の読み書きをユーザーが要求する場合やユーザーの個人的な情報（ナレッジ）を検索する場合は、search: false（デフォルト）を返してください。
  ユーザーの質問に対して、最新の情報、ニュース、ファクトチェック、データが必要な場合は search: true を返してください。
  ユーザーの質問: ${input}
  履歴: ${JSON.stringify(recentMessages)}`
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
    upsert_knowledge: upsertKnowledge,
    search_knowledge: searchKnowledge,
    delete_knowledge: vectorDelete
  }
  const messageTools = {
    search_message: messageSearch
  }
  const workingMemoryTools = {
    update_memory: updateWorkingMemoryTool
  }
  const mcpTools = await mcp.getTools()
  tools = { ...knowledgeTools, ...messageTools, ...workingMemoryTools, ...mcpTools }
}

export const model = async (useSearchGrounding: boolean): Promise<LanguageModel> => {
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

export const agent = async (
  model: LanguageModelV1,
  useSearchGrounding: boolean
): Promise<Agent> => {
  return new Agent({
    instructions: '',
    name: 'Assistant',
    model,
    tools: useSearchGrounding ? {} : tools
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

  const baseInstructions = useSearchGrounding
    ? webSearchInstructions + (await systemInstructions())
    : (await systemInstructions()) + workingMemoryInstructions + knowledgeInstructions

  formattedMessages.push({ role: 'assistant', content: baseInstructions })
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
