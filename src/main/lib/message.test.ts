import { describe, expect, it, vi } from 'vitest'
import { getMessages, Message } from './message'

vi.mock('./database', () => ({
  database: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
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
    })
  })
}))

describe('message', () => {
  describe('getMessages', () => {
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
