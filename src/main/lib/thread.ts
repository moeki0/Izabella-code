import { database } from './database'

export type Thread = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export const searchThread = async (query: string): Promise<Array<Thread>> => {
  const db = await database()
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
      WHERE
        t.title LIKE ?
        OR m.content LIKE ?
      ORDER BY m.created_at DESC
    `
    )
    .all(`%${query}%`, `%${query}%`)

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

  return Object.values(result)
}

export const getThreads = async (): Promise<Array<Thread>> => {
  const db = await database()
  const rows = await db
    .prepare(
      `
    SELECT t.id as thread_id, t.title as thread_title, t.created_at as thread_created_at,
           m.id as message_id, m.content as message_content, m.role as message_role, m.created_at as message_created_at
    FROM threads t
    LEFT JOIN messages m ON t.id = m.thread_id
    ORDER BY m.created_at DESC
  `
    )
    .all()

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

  return Object.values(result)
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
