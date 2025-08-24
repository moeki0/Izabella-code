import { database } from './database'
import { generateThreadTitle } from './titleGenerator'

export interface Thread {
  id: string
  title: string
  created_at: string
  updated_at: string
  first_message?: string
}

export interface CreateThreadParams {
  title?: string
}

export interface UpdateThreadParams {
  id: string
  title: string
}

export const getThreads = async (): Promise<Thread[]> => {
  const db = await database()

  const threads = db
    .prepare(
      `
    SELECT 
      t.id,
      t.title,
      t.created_at,
      t.updated_at,
      (
        SELECT SUBSTR(m.content, 1, 100) 
        FROM messages m 
        WHERE m.thread_id = t.id 
        AND m.role = 'user' 
        AND m.content IS NOT NULL 
        ORDER BY m.created_at ASC 
        LIMIT 1
      ) as first_message
    FROM threads t
    ORDER BY t.updated_at DESC
  `
    )
    .all() as Thread[]

  return threads
}

export const getThread = async (id: string): Promise<Thread | null> => {
  const db = await database()

  const thread = db
    .prepare(
      `
    SELECT 
      t.id,
      t.title,
      t.created_at,
      t.updated_at,
      (
        SELECT SUBSTR(m.content, 1, 100) 
        FROM messages m 
        WHERE m.thread_id = t.id 
        AND m.role = 'user' 
        AND m.content IS NOT NULL 
        ORDER BY m.created_at ASC 
        LIMIT 1
      ) as first_message
    FROM threads t
    WHERE t.id = ?
  `
    )
    .get(id) as Thread | undefined

  return thread || null
}

export const createThread = async (params: CreateThreadParams = {}): Promise<Thread> => {
  const db = await database()

  const id = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const title = params.title || '新しいスレッド'
  const now = new Date().toISOString()

  db.prepare(
    `
    INSERT INTO threads (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `
  ).run(id, title, now, now)

  return {
    id,
    title,
    created_at: now,
    updated_at: now
  }
}

export const updateThread = async (params: UpdateThreadParams): Promise<Thread | null> => {
  const db = await database()

  const now = new Date().toISOString()

  const result = db
    .prepare(
      `
    UPDATE threads 
    SET title = ?, updated_at = ?
    WHERE id = ?
  `
    )
    .run(params.title, now, params.id)

  if (result.changes === 0) {
    return null
  }

  return await getThread(params.id)
}

export const deleteThread = async (id: string): Promise<boolean> => {
  const db = await database()

  db.prepare('BEGIN TRANSACTION').run()

  try {
    db.prepare('DELETE FROM messages WHERE thread_id = ?').run(id)
    const result = db.prepare('DELETE FROM threads WHERE id = ?').run(id)

    db.prepare('COMMIT').run()

    return result.changes > 0
  } catch (error) {
    db.prepare('ROLLBACK').run()
    throw error
  }
}

export const updateThreadTimestamp = async (threadId: string): Promise<void> => {
  const db = await database()

  const now = new Date().toISOString()

  db.prepare(
    `
    UPDATE threads 
    SET updated_at = ?
    WHERE id = ?
  `
  ).run(now, threadId)
}

export const generateAndUpdateThreadTitle = async (threadId: string): Promise<boolean> => {
  const db = await database()

  try {
    const firstMessage = db
      .prepare(
        `
      SELECT content
      FROM messages
      WHERE thread_id = ? AND role = 'user' AND content IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `
      )
      .get(threadId) as { content: string } | undefined

    if (!firstMessage?.content) {
      return false
    }

    const generatedTitle = await generateThreadTitle(firstMessage.content)

    const now = new Date().toISOString()
    const result = db
      .prepare(
        `
      UPDATE threads 
      SET title = ?, updated_at = ?
      WHERE id = ?
    `
      )
      .run(generatedTitle, now, threadId)

    return result.changes > 0
  } catch (error) {
    console.error('Error generating and updating thread title:', error)
    return false
  }
}
