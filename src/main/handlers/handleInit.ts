import { tools } from '../lib/llm'
import { getMessages, Message } from '../lib/message'

const waitForTools = async (): Promise<void> => {
  while (!tools) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

export const handleInit = async (): Promise<{ messages: Array<Message> }> => {
  await waitForTools()

  const messages = await getMessages()

  return {
    messages
  }
}
