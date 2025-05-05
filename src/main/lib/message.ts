/**
 * メッセージ関連の処理をストレージインターフェースを使用して実装
 */

import { getStorage, Message } from './storage'

export type { Message }

export const getMessages = async (threadId: string): Promise<Array<Message>> => {
  const storage = await getStorage()
  return storage.getMessages(threadId)
}

export const createMessage = async (params: {
  threadId: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  toolName?: string
  toolReq?: string
  toolRes?: string
}): Promise<void> => {
  const storage = await getStorage()
  await storage.createMessage(params)
}
