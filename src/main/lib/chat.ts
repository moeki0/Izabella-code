import { shellPathSync } from 'shell-path'
import { StreamReturn } from '@mastra/core'
import { getMessages } from './message'
import { TokenLimiter } from '@mastra/memory/processors'
import { formatMessageForLLM, MessageType } from './formattedMessageForLLM'
import { detectSearchNeed } from './detectSearchNeed'
import { model } from './model'
import { agent } from './agent'
import { store } from './store'

process.env.PATH =
  shellPathSync() ||
  ['./node_modules/.bin', '/.nodebrew/current/bin', '/usr/local/bin', process.env.PATH].join(':')

export const chat = async (input: string): Promise<StreamReturn> => {
  const useSearchGroundingSetting = (store.get('useSearchGrounding') as boolean) ?? true
  const shouldUseSearch = useSearchGroundingSetting ? await detectSearchNeed(input) : false
  const m = await model(shouldUseSearch)
  const a = await agent(m, input, shouldUseSearch)
  const recentMessages = await getMessages()
  const formattedMessages = recentMessages
    .reverse()
    .map(formatMessageForLLM)
    .filter((message): message is MessageType => message !== null)

  const limitedMessages = new TokenLimiter(127000).process(formattedMessages)

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
