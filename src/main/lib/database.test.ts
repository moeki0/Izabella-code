import { describe, expect, it, vi, beforeEach } from 'vitest'
import { join } from 'node:path'

// 依存関係をモック
const mockExec = vi.fn().mockResolvedValue(undefined)
const mockDatabase = vi.fn().mockImplementation(() => ({
  exec: mockExec
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

    // すべてのテーブル作成クエリが実行されたか確認
    expect(mockExec).toHaveBeenCalledTimes(5)

    // 返されたオブジェクトが期待通りか確認
    expect(db).toEqual(
      expect.objectContaining({
        exec: expect.any(Function)
      })
    )
  })

  it('すべてのテーブルとインデックスの作成クエリが実行されること', async () => {
    const { database } = await import('./database')
    await database()

    // すべてのクエリが実行されたか確認
    expect(mockExec).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS threads')
    )
    expect(mockExec).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS messages')
    )
    expect(mockExec).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS workflows')
    )
    expect(mockExec).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_messages_thread_id')
    )
    expect(mockExec).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_workflows_title')
    )
  })

  it('threadテーブルが期待される構造で作成されること', async () => {
    const { database } = await import('./database')
    await database()

    const threadsQuery = mockExec.mock.calls[0][0]
    expect(threadsQuery).toContain('id TEXT PRIMARY KEY')
    expect(threadsQuery).toContain('title TEXT')
    expect(threadsQuery).toContain('created_at TEXT NOT NULL')
    expect(threadsQuery).toContain('updated_at TEXT NOT NULL')
  })

  it('messagesテーブルが期待される構造で作成されること', async () => {
    const { database } = await import('./database')
    await database()

    const messagesQuery = mockExec.mock.calls[1][0]
    expect(messagesQuery).toContain('id TEXT PRIMARY KEY')
    expect(messagesQuery).toContain('thread_id TEXT NOT NULL')
    expect(messagesQuery).toContain('role TEXT NOT NULL')
    expect(messagesQuery).toContain('content TEXT')
    expect(messagesQuery).toContain('tool_name TEXT')
    expect(messagesQuery).toContain('tool_req TEXT')
    expect(messagesQuery).toContain('tool_res TEXT')
    expect(messagesQuery).toContain('created_at TEXT NOT NULL')
    expect(messagesQuery).toContain('updated_at TEXT NOT NULL')
    expect(messagesQuery).toContain(
      'FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE'
    )
  })

  it('workflowsテーブルが期待される構造で作成されること', async () => {
    const { database } = await import('./database')
    await database()

    const workflowsQuery = mockExec.mock.calls[2][0]
    expect(workflowsQuery).toContain('id TEXT PRIMARY KEY')
    expect(workflowsQuery).toContain('title TEXT NOT NULL')
    expect(workflowsQuery).toContain('prompt TEXT NOT NULL')
    expect(workflowsQuery).toContain('created_at TEXT NOT NULL')
    expect(workflowsQuery).toContain('updated_at TEXT NOT NULL')
  })
})
