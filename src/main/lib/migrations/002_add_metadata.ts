import { Migration } from '../types/migration'

export const migration: Migration = {
  version: 2,
  description: 'Add metadata column to messages table',
  sql: `
    ALTER TABLE messages ADD COLUMN metadata TEXT;
    
    CREATE TRIGGER IF NOT EXISTS messages_ai_metadata AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, role, created_at)
      VALUES (new.rowid, new.content, new.role, new.created_at);
    END;
    
    CREATE TRIGGER IF NOT EXISTS messages_ad_metadata AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, role, created_at)
      VALUES('delete', old.rowid, old.content, old.role, old.created_at);
    END;
    
    CREATE TRIGGER IF NOT EXISTS messages_au_metadata AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, role, created_at)
      VALUES('delete', old.rowid, old.content, old.role, old.created_at);
      INSERT INTO messages_fts(rowid, content, role, created_at)
      VALUES (new.rowid, new.content, new.role, new.created_at);
    END;
  `
}
