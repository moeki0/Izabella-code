import { database } from './database'
import { randomUUID } from 'node:crypto'

export type Message = {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
  sources?: string
}

export type MessageWithId = Message & {
  id: string
  created_at: string
  updated_at: string
}

export type MessagesWithPagination = {
  messages: Array<MessageWithId>
  total: number
  totalPages: number
}

export const getMessages = async (limit = 40): Promise<Array<Message>> => {
  const db = await database()
  return await db.prepare(`SELECT * FROM messages ORDER BY created_at DESC LIMIT ${limit}`).all()
}

export type SearchMessagesParams = {
  query?: string
  role?: 'user' | 'assistant' | 'tool'
  startTime?: string
  endTime?: string
  page?: number
  itemsPerPage?: number
}

export const searchMessages = async (
  params: SearchMessagesParams
): Promise<MessagesWithPagination> => {
  const db = await database()
  const { query = '', role, startTime, endTime, page = 1, itemsPerPage = 20 } = params

  const whereConditions: Array<string> = []
  const whereParams: Array<string | number> = []

  // For content search using FTS5
  let ftsFilter = ''
  if (query) {
    ftsFilter = `
      id IN (
        SELECT id FROM messages_fts
        WHERE messages_fts MATCH ?
      )
    `
    whereParams.push(`${query}*`)
  }

  // Add FTS condition first if it exists
  if (ftsFilter) {
    whereConditions.push(ftsFilter)
  }

  if (role) {
    whereConditions.push('role = ?')
    whereParams.push(role)
  }

  if (startTime) {
    const utcStartTime = new Date(startTime).toISOString()
    whereConditions.push('datetime(created_at) >= datetime(?)')
    whereParams.push(utcStartTime)
  }

  if (endTime) {
    const utcEndTime = new Date(endTime).toISOString()
    whereConditions.push('datetime(created_at) <= datetime(?)')
    whereParams.push(utcEndTime)
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as count FROM messages ${whereClause}`
  const countResult = await db.prepare(countSql).get(...whereParams)

  const total = countResult.count
  const totalPages = Math.ceil(total / itemsPerPage)
  const offset = (page - 1) * itemsPerPage

  const querySql = `
    SELECT * FROM messages
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `

  const messages = await db.prepare(querySql).all(...whereParams, itemsPerPage, offset)

  return {
    messages,
    total,
    totalPages
  }
}

export const createMessage = async (params: {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  toolName?: string
  toolReq?: string
  toolRes?: string
  sources?: string
}): Promise<void> => {
  const db = await database()
  if (params.role === 'tool') {
    await db
      .prepare(
        'INSERT INTO messages (id, role, tool_name, tool_req, tool_res, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(randomUUID(), params.role, params.toolName, params.toolReq, params.toolRes)
  } else if (params.role === 'assistant' && params.sources) {
    await db
      .prepare(
        'INSERT INTO messages (id, role, content, sources, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(randomUUID(), params.role, params.content, params.sources)
  } else {
    await db
      .prepare(
        'INSERT INTO messages (id, role, content, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(randomUUID(), params.role, params.content)
  }
}
