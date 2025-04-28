import { database } from './database'
import { randomUUID } from 'node:crypto'

export type Message = {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
}

export const getMessages = async (threadId): Promise<Array<Message>> => {
  const db = await database()
  return await db.prepare('SELECT * FROM messages WHERE thread_id = ?').all(threadId)
}

export const createMessage = async (params: {
  threadId: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  toolName?: string
  toolReq?: string
  toolRes?: string
}): Promise<void> => {
  const db = await database()
  if (params.role === 'tool') {
    await db
      .prepare(
        'INSERT INTO messages (id, thread_id, role, tool_name, tool_req, tool_res, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(
        randomUUID(),
        params.threadId,
        params.role,
        params.toolName,
        params.toolReq,
        params.toolRes
      )
  } else {
    await db
      .prepare(
        'INSERT INTO messages (id, thread_id, role, content, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(randomUUID(), params.threadId, params.role, params.content)
  }
}
