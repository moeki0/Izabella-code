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

// 特定のメッセージIDの前後のメッセージを取得する
export const getMessageContext = async (
  messageId: string,
  count: number = 20
): Promise<Array<MessageWithId>> => {
  const db = await database()

  try {
    // まず対象のメッセージのrowid（SQLiteの内部ID）を取得
    const messageRow = await db.prepare('SELECT rowid FROM messages WHERE id = ?').get(messageId)

    if (!messageRow) {
      return []
    }

    const targetRowId = messageRow.rowid

    // 対象メッセージの前後の指定件数のメッセージを取得（reasoningパターンを除外）
    const contextMessages = await db
      .prepare(
        `
      SELECT * FROM messages
      WHERE rowid BETWEEN ? AND ? AND (content NOT LIKE '%'''reasoning%' OR content IS NULL)
      ORDER BY created_at ASC
    `
      )
      .all(
        Math.max(1, targetRowId - count), // 最小rowid = 1
        targetRowId + count
      )

    return contextMessages
  } catch (error) {
    console.error('Error getting message context:', error)
    return []
  }
}

export const searchMessages = async (
  params: SearchMessagesParams
): Promise<MessagesWithPagination> => {
  const db = await database()
  const { query = '', role, startTime, endTime, page = 1, itemsPerPage = 20 } = params

  const whereConditions: Array<string> = []
  const whereParams: Array<string | number> = []

  // 検索結果取得のための変数
  let messages: any[] = []
  let total = 0
  let totalPages = 0

  // クエリ文字列がある場合は全文検索を使用
  if (query && query.trim()) {
    // クエリからタイムスタンプを除去（フロントエンドでタイムスタンプを追加している場合）
    let cleanQuery = query.trim()

    // 末尾に数字がある場合（タイムスタンプ）は除去
    cleanQuery = cleanQuery.replace(/\s+\d+$/, '')

    console.log(`Original query: "${query}", Cleaned query: "${cleanQuery}"`)

    // FTSを使ったクエリを構築
    const ftsQuery = `${cleanQuery}*`
    const ftsParams: (string | number)[] = [ftsQuery]

    // role制約がある場合
    let roleFilter = ''
    if (role) {
      roleFilter = 'AND role = ?'
      ftsParams.push(role)
    }

    // 日付範囲の制約
    let dateFilter = ''
    if (startTime) {
      const utcStartTime = new Date(startTime).toISOString()
      dateFilter += ' AND datetime(created_at) >= datetime(?)'
      ftsParams.push(utcStartTime)
    }

    if (endTime) {
      const utcEndTime = new Date(endTime).toISOString()
      dateFilter += ' AND datetime(created_at) <= datetime(?)'
      ftsParams.push(utcEndTime)
    }

    // reasoningを含むメッセージを除外するフィルター
    const reasoningFilter = "AND (content NOT LIKE '%reasoning%' OR content IS NULL)"

    // テーブル結合を使って検索
    const countFtsSql = `
      SELECT COUNT(*) as count
      FROM messages_fts
      JOIN messages ON messages_fts.rowid = messages.rowid
      WHERE messages_fts MATCH ? ${roleFilter} ${dateFilter} ${reasoningFilter}
    `

    const countResult = await db.prepare(countFtsSql).get(...ftsParams)
    total = countResult.count
    totalPages = Math.ceil(total / itemsPerPage)
    const offset = (page - 1) * itemsPerPage

    // 実際のメッセージを取得
    const querySql = `
      SELECT messages.*
      FROM messages_fts
      JOIN messages ON messages_fts.rowid = messages.rowid
      WHERE messages_fts MATCH ? ${roleFilter} ${dateFilter} ${reasoningFilter}
      ORDER BY messages.created_at DESC
      LIMIT ? OFFSET ?
    `

    messages = await db.prepare(querySql).all(...ftsParams, itemsPerPage, offset)
  } else {
    // 通常の検索（クエリ文字列なし）
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

    // ```reasoning パターンを除外
    whereConditions.push("(content NOT LIKE '%'''reasoning%' OR content IS NULL)")

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const countSql = `SELECT COUNT(*) as count FROM messages ${whereClause}`
    const countResult = await db.prepare(countSql).get(...whereParams)

    total = countResult.count
    totalPages = Math.ceil(total / itemsPerPage)
    const offset = (page - 1) * itemsPerPage

    const querySql = `
      SELECT * FROM messages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    messages = await db.prepare(querySql).all(...whereParams, itemsPerPage, offset)
  }

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
}): Promise<string> => {
  const db = await database()
  const id = randomUUID()
  if (params.role === 'tool') {
    await db
      .prepare(
        'INSERT INTO messages (id, role, tool_name, tool_req, tool_res, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
      )
      .run(id, params.role, params.toolName, params.toolReq, params.toolRes)
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
  return id
}
