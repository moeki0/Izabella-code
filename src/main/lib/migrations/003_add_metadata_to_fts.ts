import { Migration } from '../types/migration'

export const migration: Migration = {
  version: 3,
  description: 'Add metadata to FTS table',
  sql: `
    -- Drop old FTS triggers
    DROP TRIGGER IF EXISTS messages_ai;
    DROP TRIGGER IF EXISTS messages_ad;
    DROP TRIGGER IF EXISTS messages_au;
    DROP TRIGGER IF EXISTS messages_ai_metadata;
    DROP TRIGGER IF EXISTS messages_ad_metadata;
    DROP TRIGGER IF EXISTS messages_au_metadata;
    
    -- Drop old FTS virtual table
    DROP TABLE IF EXISTS messages_fts;
    
    -- Create new FTS virtual table with metadata column
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      metadata,
      role UNINDEXED,
      created_at UNINDEXED,
      content='messages',
      content_rowid='rowid'
    );
    
    -- Create new triggers to include metadata
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, metadata, role, created_at)
      VALUES (new.rowid, new.content, new.metadata, new.role, new.created_at);
    END;
    
    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, metadata, role, created_at)
      VALUES('delete', old.rowid, old.content, old.metadata, old.role, old.created_at);
    END;
    
    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content, metadata, role, created_at)
      VALUES('delete', old.rowid, old.content, old.metadata, old.role, old.created_at);
      INSERT INTO messages_fts(rowid, content, metadata, role, created_at)
      VALUES (new.rowid, new.content, new.metadata, new.role, new.created_at);
    END;
    
    -- Rebuild FTS with all existing data
    INSERT INTO messages_fts(rowid, content, metadata, role, created_at)
    SELECT rowid, content, metadata, role, created_at FROM messages;
  `
}
