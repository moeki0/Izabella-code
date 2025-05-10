import { describe, expect, it, vi, beforeEach } from 'vitest'
import { join } from 'node:path'

// Mock dependencies
const mockExec = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockRun = vi.fn()
const mockAllFn = vi.fn().mockReturnValue([])
const mockPrepare = vi.fn().mockReturnValue({
  all: mockAllFn,
  get: mockGet,
  run: mockRun
})
const mockDatabase = vi.fn().mockImplementation(() => ({
  exec: mockExec,
  prepare: mockPrepare
}))

// Mock migrations
vi.mock('./migrations', () => ({
  migrations: [
    {
      version: 1,
      description: 'Initial schema',
      sql: `
        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          title TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        
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
        );

        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          title TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_title ON workflows(title);

        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
          content,
          thread_id UNINDEXED,
          role UNINDEXED,
          created_at UNINDEXED,
          content='messages',
          content_rowid='rowid'
        );
      `
    }
  ]
}))

vi.mock('better-sqlite3', () => {
  return {
    default: mockDatabase
  }
})

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data/path')
  }
}))

describe('database', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Default mock for getCurrentVersion
    mockGet.mockReturnValue({ version: 0 })
  })

  it('SQLite database is correctly initialized', async () => {
    // Import the module under test
    const { database } = await import('./database')

    // Execute database initialization
    const db = await database()

    // Test dependencies
    const { app } = await import('electron')
    expect(app.getPath).toHaveBeenCalledWith('userData')

    // Verify that better-sqlite3 was initialized with the correct path
    expect(mockDatabase).toHaveBeenCalledWith(join('/mock/user/data/path', 'db.sqlite'))

    // Verify table creation queries were executed
    expect(mockExec).toHaveBeenCalled()

    // Verify the returned object is as expected
    expect(db).toEqual(
      expect.objectContaining({
        exec: expect.any(Function),
        prepare: expect.any(Function)
      })
    )
  })

  it('creates migrations table on initialization', async () => {
    // Clear any previous calls
    mockExec.mockClear()

    const { database } = await import('./database')
    await database()

    // Verify that migrations table creation query was executed
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
    )
  })

  it('checks current migration version on initialization', async () => {
    // Clear any previous calls
    mockPrepare.mockClear()
    mockGet.mockClear()

    const { database } = await import('./database')
    await database()

    // Verify that query to get current version was executed
    expect(mockPrepare).toHaveBeenCalledWith('SELECT MAX(version) as version FROM migrations')
    expect(mockGet).toHaveBeenCalled()
  })

  it('applies pending migrations when current version is 0', async () => {
    // Clear any previous calls
    mockExec.mockClear()
    mockPrepare.mockClear()
    mockRun.mockClear()

    // Simulate database with no migrations applied yet
    mockGet.mockReturnValue({ version: 0 })

    const { database } = await import('./database')
    await database()

    // Verify that transaction was started and committed
    expect(mockExec).toHaveBeenCalledWith('BEGIN TRANSACTION')
    expect(mockExec).toHaveBeenCalledWith('COMMIT')

    // Verify that migration was recorded in the migrations table
    expect(mockPrepare).toHaveBeenCalledWith(
      'INSERT INTO migrations (version, description, applied_at) VALUES (?, ?, ?)'
    )
    expect(mockRun).toHaveBeenCalledWith(1, 'Initial schema', expect.any(String))
  })

  it('does not apply migrations when already at latest version', async () => {
    // For simplicity, we'll just verify that no insert happens for the migration
    // Create a custom implementation that tracks inserts
    const insertCount = { value: 0 }

    // Track inserts
    mockRun.mockImplementation(() => {
      insertCount.value++
    })

    // First run with version 0 to record the normal insert count
    mockGet.mockReturnValue({ version: 0 })
    const { database } = await import('./database')
    await database()

    // Reset and prepare for the actual test
    const normalInsertCount = insertCount.value
    insertCount.value = 0

    // Now simulate already migrated database
    mockGet.mockReturnValue({ version: 1 })
    await database()

    // No new inserts should have happened
    expect(insertCount.value).toBeLessThan(normalInsertCount)
  })

  it('applies multiple migrations in order', async () => {
    // Clear any previous calls
    vi.clearAllMocks()

    // Mock multiple migrations in wrong order
    vi.mock('./migrations', () => ({
      migrations: [
        {
          version: 2,
          description: 'Second migration',
          sql: 'ALTER TABLE messages ADD COLUMN test TEXT'
        },
        {
          version: 1,
          description: 'Initial schema',
          sql: 'CREATE TABLE messages (id TEXT PRIMARY KEY)'
        }
      ]
    }))

    // Simulate database with no migrations applied yet
    mockGet.mockReturnValue({ version: 0 })

    // Custom implementation to track order
    interface MigrationRecord {
      version: number
      description: string
    }
    const migrationRecords: MigrationRecord[] = []
    mockRun.mockImplementation((version, description) => {
      migrationRecords.push({ version, description })
    })

    const { database } = await import('./database')
    await database()

    // Verify migrations were executed in version order
    expect(migrationRecords.length).toBe(2)
    expect(migrationRecords[0].version).toBe(1)
    expect(migrationRecords[1].version).toBe(2)
  })
})
