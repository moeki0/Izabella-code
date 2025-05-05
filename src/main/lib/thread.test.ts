import { describe, it, expect, vi } from 'vitest'
import { searchThread, getThreads, getThread, deleteThread } from './thread'

// getStorage関数をモック化
vi.mock('./storage', () => ({
  getStorage: vi.fn().mockResolvedValue({
    searchThread: vi.fn().mockResolvedValue({
      threads: [
        {
          id: 'thread-1',
          title: 'Test Thread 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'message-1',
              threadId: 'thread-1',
              role: 'user',
              content: 'Hello world',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      ],
      total: 1,
      totalPages: 1
    }),
    getThreads: vi.fn().mockResolvedValue({
      threads: [
        {
          id: 'thread-1',
          title: 'Test Thread 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: 'message-1',
              threadId: 'thread-1',
              role: 'user',
              content: 'Hello world',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        }
      ],
      total: 1,
      totalPages: 1
    }),
    getThread: vi.fn().mockResolvedValue({
      id: 'thread-1',
      title: 'Test Thread 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    deleteThread: vi.fn().mockResolvedValue(undefined)
  }),
  Thread: {},
  ThreadsWithPagination: {}
}))

describe('thread', () => {
  describe('searchThread', () => {
    it('指定した検索クエリにマッチするスレッドとそのメッセージを取得できること', async () => {
      const result = await searchThread('test query', 1, 10)
      expect(result.threads.length).toBe(1)
      expect(result.threads[0].id).toBe('thread-1')
      expect(result.threads[0].messages[0].content).toBe('Hello world')
    })
  })

  describe('getThreads', () => {
    it('全てのスレッドとそのメッセージを取得できること', async () => {
      const result = await getThreads(1, 10)
      expect(result.threads.length).toBe(1)
      expect(result.threads[0].id).toBe('thread-1')
    })
  })

  describe('getThread', () => {
    it('指定したIDのスレッドを取得できること', async () => {
      const thread = await getThread('thread-1')
      expect(thread.id).toBe('thread-1')
      expect(thread.title).toBe('Test Thread 1')
    })
  })

  describe('deleteThread', () => {
    it('指定したIDのスレッドを削除できること', async () => {
      await expect(deleteThread('thread-1')).resolves.toBeUndefined()
    })
  })
})
