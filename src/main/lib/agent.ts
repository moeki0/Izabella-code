import { Agent, ToolAction } from '@mastra/core'
import { LanguageModelV1 } from 'ai'
import { getFilteredTools } from './getFilteredTools'
import { enhanceInstructionsWithKnowledge } from './promptVectorSearch'
import { webSearchInstructions } from '../instructions/webSearchInstructions'
import { systemInstructions } from '../instructions/systemInstructions'
import { getMessages } from './message'

export const agent = async (
  model: LanguageModelV1,
  input: string,
  useSearchGrounding: boolean
): Promise<Agent> => {
  const agentTools = useSearchGrounding ? {} : getFilteredTools()
  const recentMessages = await getMessages()
  let instructions = useSearchGrounding ? await webSearchInstructions() : await systemInstructions()
  const recentMessageContents = recentMessages
    .filter((message) => message.role === 'assistant' || message.role === 'user')
    .slice(0, 2)
    .map((msg) => msg.content || '')
    .filter((content) => content && content.trim() !== '')

  instructions = await enhanceInstructionsWithKnowledge(input, instructions, recentMessageContents)

  return new Agent({
    instructions,
    name: 'Assistant',
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: agentTools as Record<string, ToolAction<any, any, any>> | undefined
  })
}
