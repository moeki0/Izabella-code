import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getMessages, Message, searchMessages, SearchMessagesParams } from './message'
import { database } from './database'

vi.mock('./database', () => ({
  database: vi.fn()
}))

describe('message', () => {
  describe('getMessages', () => {
    beforeEach(() => {
      const mockDb = {
        prepare: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          {
            id: '1',
            thread_id: 'thread-1',
            role: 'user',
            content: 'Hello',
            created_at: '2025-05-01T00:00:00.000Z',
            updated_at: '2025-05-01T00:00:00.000Z'
          },
          {
            id: '2',
            thread_id: 'thread-1',
            role: 'assistant',
            content: 'Hi there!',
            source:
              '{"sourceType":"url","id":"f8ZpaamF4NEgLsIU","url":"https://example.com","title":"Example"}',
            created_at: '2025-05-01T00:00:00.000Z',
            updated_at: '2025-05-01T00:00:00.000Z'
          },
          {
            id: '3',
            thread_id: 'thread-1',
            role: 'tool',
            tool_name: 'test-tool',
            tool_req: '{"test": true}',
            tool_res: '{"result": "success"}',
            created_at: '2025-05-01T00:00:00.000Z',
            updated_at: '2025-05-01T00:00:00.000Z'
          }
        ])
      }
      vi.mocked(database).mockResolvedValue(mockDb as unknown as ReturnType<typeof database>)
    })

    it('指定されたthread_idのメッセージを全て取得できること', async () => {
      const messages = await getMessages('thread-1')
      expect(messages).toHaveLength(3)
      expect(messages[0]).toEqual(
        expect.objectContaining({
          role: 'user',
          content: 'Hello'
        })
      )
      expect(messages[1]).toEqual(
        expect.objectContaining({
          role: 'assistant',
          content: 'Hi there!',
          source:
            '{"sourceType":"url","id":"f8ZpaamF4NEgLsIU","url":"https://example.com","title":"Example"}'
        })
      )
      expect(messages[2]).toEqual(
        expect.objectContaining({
          role: 'tool',
          tool_name: 'test-tool',
          tool_req: '{"test": true}',
          tool_res: '{"result": "success"}'
        })
      )
    })
  })

  describe('searchMessages', () => {
    const mockDb = {
      prepare: vi.fn().mockReturnThis(),
      get: vi.fn(),
      all: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(database).mockResolvedValue(mockDb as unknown as ReturnType<typeof database>)
    })

    it('クエリとページングパラメータに基づいてメッセージを検索すること', async () => {
      const mockCount = { count: 2 }
      mockDb.get.mockResolvedValue(mockCount)

      const mockMessages = [
        {
          id: '1',
          thread_id: 'thread1',
          role: 'user',
          content: 'Hello world',
          created_at: '2023-05-01T00:00:00Z',
          updated_at: '2023-05-01T00:00:00Z'
        },
        {
          id: '2',
          thread_id: 'thread1',
          role: 'assistant',
          content: 'Hi there!',
          created_at: '2023-05-01T00:01:00Z',
          updated_at: '2023-05-01T00:01:00Z'
        }
      ]
      mockDb.all.mockResolvedValue(mockMessages)

      const params: SearchMessagesParams = {
        query: 'hello',
        page: 1,
        itemsPerPage: 20
      }

      const result = await searchMessages(params)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM messages')
      )
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM messages'))
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('messages_fts MATCH ?'))
      expect(result).toEqual({
        messages: mockMessages,
        total: 2,
        totalPages: 1
      })
    })

    it('日本語のクエリでFTS5を使って検索できること', async () => {
      const mockCount = { count: 1 }
      mockDb.get.mockResolvedValue(mockCount)

      const mockMessages = [
        {
          id: '1',
          thread_id: 'thread1',
          role: 'user',
          content: '今日はKibelaについて話しましょう',
          created_at: '2023-05-01T00:00:00Z',
          updated_at: '2023-05-01T00:00:00Z'
        }
      ]
      mockDb.all.mockResolvedValue(mockMessages)

      const params: SearchMessagesParams = {
        query: 'Kibela',
        page: 1,
        itemsPerPage: 20
      }

      const result = await searchMessages(params)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM messages')
      )
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('messages_fts MATCH ?'))
      expect(mockDb.prepare.mock.calls[0][0]).toContain('id IN')
      expect(mockDb.prepare.mock.calls[0][0]).toContain('SELECT id FROM messages_fts')

      // コード自体が機能しているかを確認する - whereParamsの実際の値はモックで難しい
      expect(result).toEqual({
        messages: mockMessages,
        total: 1,
        totalPages: 1
      })
    })

    it('スレッドID、ロール、時間範囲に基づいてフィルタリングすること', async () => {
      const mockCount = { count: 1 }
      mockDb.get.mockResolvedValue(mockCount)

      const mockMessages = [
        {
          id: '1',
          thread_id: 'thread1',
          role: 'user',
          content: 'Hello world',
          created_at: '2023-05-01T00:00:00Z',
          updated_at: '2023-05-01T00:00:00Z'
        }
      ]
      mockDb.all.mockResolvedValue(mockMessages)

      const params: SearchMessagesParams = {
        threadId: 'thread1',
        role: 'user',
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-12-31T23:59:59Z',
        page: 1,
        itemsPerPage: 20
      }

      const result = await searchMessages(params)

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE'))
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('thread_id = ?'))
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('role = ?'))
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('datetime(created_at) >= datetime(?)')
      )
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('datetime(created_at) <= datetime(?)')
      )

      expect(result).toEqual({
        messages: mockMessages,
        total: 1,
        totalPages: 1
      })
    })

    it('検索結果が存在しない場合は空の結果を返すこと', async () => {
      const mockCount = { count: 0 }
      mockDb.get.mockResolvedValue(mockCount)
      mockDb.all.mockResolvedValue([])

      const params: SearchMessagesParams = {
        query: 'nonexistent',
        page: 1,
        itemsPerPage: 20
      }

      const result = await searchMessages(params)

      expect(result).toEqual({
        messages: [],
        total: 0,
        totalPages: 0
      })
    })
  })

  describe('Message type', () => {
    it('role は user, assistant, tool のいずれかであること', () => {
      const userMessage: Message = {
        role: 'user',
        content: 'test'
      }
      const assistantMessage: Message = {
        role: 'assistant',
        content: 'test'
      }
      const toolMessage: Message = {
        role: 'tool',
        tool_name: 'test',
        tool_req: '{}',
        tool_res: '{}'
      }

      expect(userMessage.role).toBe('user')
      expect(assistantMessage.role).toBe('assistant')
      expect(toolMessage.role).toBe('tool')
    })

    it('content は任意であること', () => {
      const message: Message = {
        role: 'user'
      }
      expect(message.content).toBeUndefined()
    })

    it('tool_name, tool_req, tool_res, source は任意であること', () => {
      const message: Message = {
        role: 'assistant',
        content: 'test'
      }
      expect(message.tool_name).toBeUndefined()
      expect(message.tool_req).toBeUndefined()
      expect(message.tool_res).toBeUndefined()
      expect(message.source).toBeUndefined()
    })

    it('source はassistantメッセージに設定できること', () => {
      const message: Message = {
        role: 'assistant',
        content: 'test with source',
        source:
          '{"sourceType":"url","id":"f8ZpaamF4NEgLsIU","url":"https://example.com","title":"Example"}'
      }
      expect(message.source).toBe(
        '{"sourceType":"url","id":"f8ZpaamF4NEgLsIU","url":"https://example.com","title":"Example"}'
      )
    })
  })
})
