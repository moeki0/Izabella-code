import { IpcMainInvokeEvent } from 'electron'
import { getMessageContext } from '../lib/message'

export const handleGetMessageContext = async (
  _: IpcMainInvokeEvent,
  messageId: string,
  count: number = 20
): Promise<Record<string, unknown>> => {
  try {
    console.log(`Getting context for message: ${messageId}, count: ${count}`)

    const messages = await getMessageContext(messageId, count)

    console.log(`Found ${messages.length} messages in context`)

    return {
      success: true,
      data: messages,
      error: null
    }
  } catch (error) {
    console.error('Error getting message context:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
