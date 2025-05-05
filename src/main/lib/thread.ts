import { database } from './database'

export type Thread = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export const searchThread = async (
  query: string,
  page: number = 1,
  itemsPerPage: number = 12
): Promise<ThreadsWithPagination> => {
  const db = await database()

  // First, get the total count of matching threads
  const countResult = await db
    .prepare(
      `
      SELECT COUNT(DISTINCT t.id) as count
      FROM threads t
      LEFT JOIN messages m ON t.id = m.thread_id
      WHERE
        t.title LIKE ?
        OR m.content LIKE ?
      `
    )
    .get(`%${query}%`, `%${query}%`)

  const total = countResult.count
  const totalPages = Math.ceil(total / itemsPerPage)

  // Calculate offset
  const offset = (page - 1) * itemsPerPage

  // Get matching threads with pagination
  const rows = await db
    .prepare(
      `
      SELECT DISTINCT
        t.id as thread_id,
        t.title as thread_title,
        t.created_at as thread_created_at,
        m.id as message_id,
        m.content as message_content,
        m.role as message_role,
        m.created_at as message_created_at
      FROM threads t
      LEFT JOIN messages m ON t.id = m.thread_id
      WHERE t.id IN (
        SELECT DISTINCT t.id
        FROM threads t
        LEFT JOIN messages m ON t.id = m.thread_id
        WHERE
          t.title LIKE ?
          OR m.content LIKE ?
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      )
      ORDER BY m.created_at DESC
    `
    )
    .all(`%${query}%`, `%${query}%`, itemsPerPage, offset)

  const result = rows.reduce((acc, row) => {
    if (!acc[row.thread_id]) {
      acc[row.thread_id] = {
        id: row.thread_id,
        title: row.thread_title,
        created_at: row.thread_created_at,
        messages: []
      }
    }
    if (row.message_id) {
      acc[row.thread_id].messages.push({
        id: row.message_id,
        content: row.message_content,
        role: row.message_role,
        created_at: row.message_created_at
      })
    }
    return acc
  }, {})

  return {
    threads: Object.values(result),
    total,
    totalPages
  }
}

export type ThreadsWithPagination = {
  threads: Array<Thread>
  total: number
  totalPages: number
}

export const getThreads = async (
  page: number = 1,
  itemsPerPage: number = 12
): Promise<ThreadsWithPagination> => {
  const db = await database()

  // First, get the total count of threads
  const countResult = await db.prepare('SELECT COUNT(DISTINCT id) as count FROM threads').get()
  const total = countResult.count
  const totalPages = Math.ceil(total / itemsPerPage)

  // Calculate offset
  const offset = (page - 1) * itemsPerPage

  // Get threads with pagination
  const rows = await db
    .prepare(
      `
    SELECT t.id as thread_id, t.title as thread_title, t.created_at as thread_created_at,
           m.id as message_id, m.content as message_content, m.role as message_role, m.created_at as message_created_at
    FROM threads t
    LEFT JOIN messages m ON t.id = m.thread_id
    WHERE t.id IN (
      SELECT id FROM threads
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    )
    ORDER BY m.created_at DESC
  `
    )
    .all(itemsPerPage, offset)

  const result = rows.reduce((acc, row) => {
    if (!acc[row.thread_id]) {
      acc[row.thread_id] = {
        id: row.thread_id,
        title: row.thread_title,
        created_at: row.thread_created_at,
        messages: []
      }
    }
    if (row.message_id) {
      acc[row.thread_id].messages.push({
        id: row.message_id,
        content: row.message_content,
        role: row.message_role,
        created_at: row.message_created_at
      })
    }
    return acc
  }, {})

  return {
    threads: Object.values(result),
    total,
    totalPages
  }
}

export const deleteThread = async (id): Promise<void> => {
  const db = await database()
  await db.prepare('DELETE FROM threads WHERE id = ?').run(id)
}

export const getThread = async (id): Promise<Thread> => {
  const db = await database()
  return db.prepare('SELECT * FROM threads WHERE id = ?').get(id)
}

export const createThread = async (id: string): Promise<void> => {
  const db = await database()
  await db
    .prepare(
      'INSERT INTO threads (id, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    )
    .run(id)
}

export const updateThreadTitle = async (params: { id: string; title: string }): Promise<void> => {
  const db = await database()
  await db.prepare('UPDATE threads SET title = ? WHERE id = ?').run(params.title, params.id)
}

export const getOrCreateThread = async (id: string): Promise<Thread> => {
  const db = await database()
  const existing = await db.prepare('SELECT id FROM threads WHERE id = ?').get(id)
  if (!existing) {
    await createThread(id)
  }
  return getThread(id)
}
