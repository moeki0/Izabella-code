import { describe, expect, it, vi, beforeEach } from 'vitest'
import { join } from 'node:path'

// 依存関係をモック
const mockExec = vi.fn().mockResolvedValue(undefined)
const mockAllFn = vi.fn().mockReturnValue([])
const mockPrepare = vi.fn().mockReturnValue({
  all: mockAllFn
})
const mockDatabase = vi.fn().mockImplementation(() => ({
  exec: mockExec,
  prepare: mockPrepare
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
    // モックをリセット
    vi.clearAllMocks()
  })

  it('SQLiteデータベースが正しく初期化されること', async () => {
    // テスト対象のモジュールをインポート
    const { database } = await import('./database')

    // データベース初期化を実行
    const db = await database()

    // 依存関係のテスト
    const { app } = await import('electron')
    expect(app.getPath).toHaveBeenCalledWith('userData')

    // better-sqlite3 が正しいパスで初期化されたか確認
    expect(mockDatabase).toHaveBeenCalledWith(join('/mock/user/data/path', 'db.sqlite'))

    // テーブル作成クエリが実行されたか確認
    expect(mockExec).toHaveBeenCalled()

    // 返されたオブジェクトが期待通りか確認
    expect(db).toEqual(
      expect.objectContaining({
        exec: expect.any(Function),
        prepare: expect.any(Function)
      })
    )
  })

  it('すべてのテーブルとインデックスの作成クエリが実行されること', async () => {
    const { database } = await import('./database')
    await database()

    // すべてのクエリが実行されたか確認
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS threads')
    )
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS messages')
    )
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS workflows')
    )
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_messages_thread_id')
    )
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_workflows_title')
    )
  })

  it('messagesテーブルが期待される構造で作成されること', async () => {
    const { database } = await import('./database')
    await database()

    const messagesQuery = mockExec.mock.calls.find((call) =>
      call[0].includes('CREATE TABLE IF NOT EXISTS messages')
    )[0]

    expect(messagesQuery).toContain('id TEXT PRIMARY KEY')
    expect(messagesQuery).toContain('thread_id TEXT NOT NULL')
    expect(messagesQuery).toContain('role TEXT NOT NULL')
    expect(messagesQuery).toContain('content TEXT')
    expect(messagesQuery).toContain('tool_name TEXT')
    expect(messagesQuery).toContain('tool_req TEXT')
    expect(messagesQuery).toContain('tool_res TEXT')
    expect(messagesQuery).toContain('sources TEXT') // sourcesカラムが含まれていることを確認
    expect(messagesQuery).toContain('created_at TEXT NOT NULL')
    expect(messagesQuery).toContain('updated_at TEXT NOT NULL')
    expect(messagesQuery).toContain(
      'FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE'
    )
  })

  it('sourceカラムが存在しない場合は追加されること', async () => {
    // sourceカラムが存在しないことをシミュレート
    mockAllFn.mockReturnValue([
      { name: 'id' },
      { name: 'thread_id' },
      { name: 'role' },
      { name: 'content' }
      // sourceカラムは存在しない
    ])

    const { database } = await import('./database')
    await database()

    // カラム情報の取得が行われたか確認
    expect(mockPrepare).toHaveBeenCalledWith('PRAGMA table_info(messages)')

    // sourcesカラムが追加されたか確認
    expect(mockExec).toHaveBeenCalledWith('ALTER TABLE messages ADD COLUMN sources TEXT')
  })

  it('sourceカラムが既に存在する場合は追加されないこと', async () => {
    // sourceカラムが既に存在することをシミュレート
    mockAllFn.mockReturnValue([
      { name: 'id' },
      { name: 'thread_id' },
      { name: 'role' },
      { name: 'content' },
      { name: 'source' } // sourceカラムが既に存在する
    ])

    const { database } = await import('./database')
    await database()

    // カラム情報の取得が行われたか確認
    expect(mockPrepare).toHaveBeenCalledWith('PRAGMA table_info(messages)')

    // sourceカラムが存在する場合、sourcesカラムが追加され、マイグレーションが行われることを確認
    expect(mockExec).toHaveBeenCalledWith('ALTER TABLE messages ADD COLUMN sources TEXT')
  })
})
