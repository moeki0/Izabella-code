import { tools } from '../lib/llm'
import { getMessages, Message } from '../lib/message'
import { getThread } from '../lib/thread'

const waitForTools = async (): Promise<void> => {
  while (!tools) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

export const handleInit = async (
  _,
  threadId
): Promise<{ title: string; messages: Array<Message> }> => {
  await waitForTools()

  if (threadId) {
    const messages = await getMessages(threadId)
    const thread = await getThread(threadId)
    return { messages, title: thread?.title }
  } else {
    return { messages: [], title: '' }
  }
}
