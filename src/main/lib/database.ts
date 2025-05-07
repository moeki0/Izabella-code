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

    const ftsExists =
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'").all()
        .length > 0

    if (ftsExists) {
      try {
        await db.exec(`DROP TABLE IF EXISTS messages_fts`)
      } catch (error) {
        console.error('Error dropping FTS table:', error)
      }
    }

    await db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        id UNINDEXED, content, tool_req, tool_res,
        tokenize='unicode61'
      )
    `)

    const hasTriggers =
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='trigger' AND name='messages_ai_insert'"
        )
        .all().length > 0

    if (hasTriggers) {
      try {
        await db.exec(`DROP TRIGGER IF EXISTS messages_ai_insert`)
        await db.exec(`DROP TRIGGER IF EXISTS messages_ad_delete`)
        await db.exec(`DROP TRIGGER IF EXISTS messages_au_update`)
      } catch (error) {
        console.error('Error dropping triggers:', error)
      }
    }

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS messages_ai_insert AFTER INSERT ON messages
      BEGIN
        INSERT INTO messages_fts(id, content, tool_req, tool_res)
        VALUES (new.id, new.content, new.tool_req, new.tool_res);
      END
    `)

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS messages_ad_delete AFTER DELETE ON messages
      BEGIN
        DELETE FROM messages_fts WHERE id = old.id;
      END
    `)

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS messages_au_update AFTER UPDATE ON messages
      BEGIN
        DELETE FROM messages_fts WHERE id = old.id;
        INSERT INTO messages_fts(id, content, tool_req, tool_res)
        VALUES (new.id, new.content, new.tool_req, new.tool_res);
      END
    `)

    try {
      await db.exec(`
        INSERT INTO messages_fts(id, content, tool_req, tool_res)
        SELECT id, content, tool_req, tool_res FROM messages
      `)
    } catch (error) {
      console.error('Error populating FTS table:', error)
    }
  } catch (error) {
    console.error('Error setting up database:', error)
  }

  return db
}
