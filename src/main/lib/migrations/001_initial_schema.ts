import { Migration } from '../types/migration'

export const migration: Migration = {
  version: 1,
  description: 'Initial schema',
  sql: `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT,
      tool_name TEXT,
      tool_req TEXT,
      tool_res TEXT,
      sources TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      role UNINDEXED,
      created_at UNINDEXED,
      content='messages',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, role, created_at)
      VALUES (new.rowid, new.content, new.role, new.created_at);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, role, created_at)
      VALUES('delete', old.rowid, old.content, old.role, old.created_at);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, role, created_at)
      VALUES('delete', old.rowid, old.content, old.role, old.created_at);
      INSERT INTO messages_fts(rowid, content, role, created_at)
      VALUES (new.rowid, new.content, new.role, new.created_at);
    END;
  `
}
