import { initializeMCP } from '../lib/initializeMCP'
import { getMessages, Message } from '../lib/message'

export const handleInit = async (): Promise<{ messages: Array<Message> }> => {
  await initializeMCP()

  const messages = await getMessages()

  return {
    messages
  }
}
