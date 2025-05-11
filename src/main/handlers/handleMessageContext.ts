import { IpcMainInvokeEvent } from 'electron'
import { getMessageContext, MessageWithId } from '../lib/message'

export const handleMessageContext = async (
  _event: IpcMainInvokeEvent,
  messageId: string,
  count: number = 20
): Promise<{
  success: boolean
  data: Array<MessageWithId> | null
  error: string | null
}> => {
  try {
    // メッセージIDの前後のメッセージを取得
    const messages = await getMessageContext(messageId, count)
    return {
      success: true,
      data: messages,
      error: null
    }
  } catch (error) {
    console.error('Error in handleMessageContext:', error)
    return {
      success: false,
      data: null,
      error: String(error)
    }
  }
}
