import { shellPathSync } from 'shell-path'
import { StreamReturn } from '@mastra/core'
import { getMessages } from './message'
import { TokenLimiter } from '@mastra/memory/processors'
import { formatMessageForLLM, MessageType } from './formattedMessageForLLM'
import { detectSearchNeed } from './detectSearchNeed'
import { model } from './model'
import { agent } from './agent'

process.env.PATH =
  shellPathSync() ||
  ['./node_modules/.bin', '/.nodebrew/current/bin', '/usr/local/bin', process.env.PATH].join(':')

export const chat = async (input: string): Promise<StreamReturn> => {
  const useSearchGrounding = await detectSearchNeed(input)
  const m = await model(useSearchGrounding)
  const a = await agent(m, input, useSearchGrounding)
  const recentMessages = await getMessages()
  const formattedMessages = recentMessages
    .reverse()
    .map(formatMessageForLLM)
    .filter((message): message is MessageType => message !== null)

  formattedMessages.push({ role: 'user', content: input })

  const limitedMessages = new TokenLimiter(254000).process(formattedMessages)

  return await a.stream(limitedMessages, {
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
