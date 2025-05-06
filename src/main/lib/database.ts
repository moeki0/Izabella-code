import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'

export const database = async (): Database => {
  const db = new Database(join(app.getPath('userData'), 'db.sqlite'))
  await db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      tool_name TEXT,
      tool_req TEXT,
      tool_res TEXT,
      sources TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE
    )`)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
  await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id)`)
  await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workflows_title ON workflows (title)`)

  try {
    const tableInfo = db.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>
    const hasSourcesColumn = tableInfo.some((column) => column.name === 'sources')

    if (!hasSourcesColumn) {
      await db.exec('ALTER TABLE messages ADD COLUMN sources TEXT')
    }
  } catch (error) {
    console.error('Error checking or adding sources column:', error)
  }

  return db
}
