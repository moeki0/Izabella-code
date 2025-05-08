import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { migrations } from './migrations'

const initializeMigrationTable = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)
}

const getCurrentVersion = (db: Database.Database): number => {
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM migrations').get()
    return result?.version || 0
  } catch {
    return 0
  }
}

const applyMigrations = (db: Database.Database): void => {
  const currentVersion = getCurrentVersion(db)

  const pendingMigrations = migrations.filter((migration) => migration.version > currentVersion)

  if (pendingMigrations.length === 0) {
    return
  }

  pendingMigrations.sort((a, b) => a.version - b.version)

  for (const migration of pendingMigrations) {
    try {
      db.exec('BEGIN TRANSACTION')

      db.exec(migration.sql)

      db.prepare('INSERT INTO migrations (version, description, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.description,
        new Date().toISOString()
      )

      db.exec('COMMIT')

      console.log(`Migration to version ${migration.version} applied successfully`)
    } catch (error) {
      db.exec('ROLLBACK')
      console.error(`Failed to apply migration to version ${migration.version}:`, error)
      throw error
    }
  }
}

export const database = async (): Promise<Database.Database> => {
  const db = new Database(join(app.getPath('userData'), 'db.sqlite'))
  initializeMigrationTable(db)
  applyMigrations(db)

  return db
}
