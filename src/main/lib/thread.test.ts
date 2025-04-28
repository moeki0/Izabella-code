import { describe, expect, it, vi } from 'vitest'
import { searchThread, getThreads, deleteThread, getThread } from './thread'

vi.mock('./database', () => ({
  database: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockImplementation((query) => {
        if (query?.includes('WHERE t.title LIKE')) {
          return [
            {
              thread_id: 'search-1',
              thread_title: 'Test Thread',
              thread_created_at: '2025-05-01T00:00:00.000Z',
              message_id: '1',
              message_content: 'Hello Test',
              message_role: 'user',
              message_created_at: '2025-05-01T00:00:00.000Z'
            }
          ]
        }
        return [
          {
            thread_id: 'thread-1',
            thread_title: 'Thread 1',
            thread_created_at: '2025-05-01T00:00:00.000Z',
            message_id: '1',
            message_content: 'Hello',
            message_role: 'user',
            message_created_at: '2025-05-01T00:00:00.000Z'
          },
          {
            thread_id: 'thread-1',
            thread_title: 'Thread 1',
            thread_created_at: '2025-05-01T00:00:00.000Z',
            message_id: '2',
            message_content: 'Hi there!',
            message_role: 'assistant',
            message_created_at: '2025-05-01T00:00:00.000Z'
          }
        ]
      }),
      run: vi.fn(),
      get: vi.fn().mockReturnValue({
        id: 'thread-1',
        title: 'Thread 1',
        created_at: '2025-05-01T00:00:00.000Z',
        updated_at: '2025-05-01T00:00:00.000Z'
      })
    })
  })
}))

describe('thread', () => {
  describe('searchThread', () => {
    it('指定した検索クエリにマッチするスレッドとそのメッセージを取得できること', async () => {
      const threads = await searchThread('test')
      expect(threads).toHaveLength(1)
      expect(threads[0]).toEqual(
        expect.objectContaining({
          id: 'thread-1',
          title: 'Thread 1',
          created_at: '2025-05-01T00:00:00.000Z',
          messages: [
            {
              id: '1',
              content: 'Hello',
              role: 'user',
              created_at: '2025-05-01T00:00:00.000Z'
            },
            {
              content: 'Hi there!',
              created_at: '2025-05-01T00:00:00.000Z',
              id: '2',
              role: 'assistant'
            }
          ]
        })
      )
    })
  })

  describe('getThreads', () => {
    it('全てのスレッドとそのメッセージを取得できること', async () => {
      const threads = await getThreads()
      expect(threads).toHaveLength(1)
      expect(threads[0]).toEqual(
        expect.objectContaining({
          id: 'thread-1',
          title: 'Thread 1',
          created_at: '2025-05-01T00:00:00.000Z',
          messages: [
            {
              id: '1',
              content: 'Hello',
              role: 'user',
              created_at: '2025-05-01T00:00:00.000Z'
            },
            {
              id: '2',
              content: 'Hi there!',
              role: 'assistant',
              created_at: '2025-05-01T00:00:00.000Z'
            }
          ]
        })
      )
    })
  })

  describe('getThread', () => {
    it('指定したIDのスレッドを取得できること', async () => {
      const thread = await getThread('thread-1')
      expect(thread).toEqual({
        id: 'thread-1',
        title: 'Thread 1',
        created_at: '2025-05-01T00:00:00.000Z',
        updated_at: '2025-05-01T00:00:00.000Z'
      })
    })
  })

  describe('deleteThread', () => {
    it('指定したIDのスレッドを削除できること', async () => {
      await expect(deleteThread('thread-1')).resolves.toBeUndefined()
    })
  })
})
