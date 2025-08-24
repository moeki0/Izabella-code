import { Migration } from '../types/migration'

export const migration: Migration = {
  version: 4,
  description: 'Add threads table and migrate existing messages',
  sql: `
    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    ALTER TABLE messages ADD COLUMN thread_id TEXT;

    CREATE INDEX idx_messages_thread_id ON messages(thread_id);

    INSERT INTO threads (id, title, created_at, updated_at)
    SELECT 
      'default-thread-' || strftime('%s', 'now'),
      '無題',
      datetime('now'),
      datetime('now')
    WHERE NOT EXISTS (SELECT 1 FROM threads);

    UPDATE messages 
    SET thread_id = (SELECT id FROM threads LIMIT 1)
    WHERE thread_id IS NULL;
  `
}
