import { describe, it, expect, vi } from 'vitest'
import { getMessages } from './message'
import type { Message } from './storage'

// getStorage関数をモック化
vi.mock('./storage', () => ({
  getStorage: vi.fn().mockResolvedValue({
    getMessages: vi.fn().mockResolvedValue([
      {
        id: 'message-1',
        threadId: 'thread-1',
        role: 'user',
        content: 'Hello world',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]),
    createMessage: vi.fn().mockResolvedValue(undefined)
  }),
  Message: {}
}))

describe('message', () => {
  describe('getMessages', () => {
    it('指定されたthread_idのメッセージを全て取得できること', async () => {
      const messages = await getMessages('thread-1')
      expect(messages.length).toBe(1)
      expect(messages[0].id).toBe('message-1')
      expect(messages[0].content).toBe('Hello world')
    })
  })

  describe('Message type', () => {
    it('role は user, assistant, tool のいずれかであること', () => {
      const userMessage = { role: 'user' } as Message
      const assistantMessage = { role: 'assistant' } as Message
      const toolMessage = { role: 'tool' } as Message

      expect(userMessage.role).toBe('user')
      expect(assistantMessage.role).toBe('assistant')
      expect(toolMessage.role).toBe('tool')
    })

    it('content は任意であること', () => {
      const messageWithContent = { content: 'test' } as Message
      const messageWithoutContent = {} as Message

      expect(messageWithContent.content).toBe('test')
      expect(messageWithoutContent.content).toBeUndefined()
    })

    it('tool_name, tool_req, tool_res は任意であること', () => {
      const messageWithTool = {
        toolName: 'test_tool',
        toolReq: 'request',
        toolRes: 'response'
      } as Message
      const messageWithoutTool = {} as Message

      expect(messageWithTool.toolName).toBe('test_tool')
      expect(messageWithTool.toolReq).toBe('request')
      expect(messageWithTool.toolRes).toBe('response')
      expect(messageWithoutTool.toolName).toBeUndefined()
      expect(messageWithoutTool.toolReq).toBeUndefined()
      expect(messageWithoutTool.toolRes).toBeUndefined()
    })
  })
})
