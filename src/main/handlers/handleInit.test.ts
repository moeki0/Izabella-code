import { describe, expect, it, vi, beforeEach } from 'vitest'
import { handleInit } from './handleInit'
import { getMessages } from '../lib/message'
import { getThread } from '../lib/thread'

vi.mock('../lib/message', () => ({
  getMessages: vi.fn()
}))

vi.mock('../lib/thread', () => ({
  getThread: vi.fn()
}))

vi.mock('../lib/llm', () => ({
  tools: undefined
}))

const messages = [{ id: '1', role: 'user' as const, content: 'test' }]
const thread = {
  id: '1',
  title: 'Test Thread',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('handleInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toolsが設定されるまで待機すること', async () => {
    vi.mocked(getMessages).mockResolvedValue(messages)
    vi.mocked(getThread).mockResolvedValue(thread)

    const initPromise = handleInit(null, '1')

    // toolsを設定
    setTimeout(() => {
      vi.mock('../lib/llm', () => ({
        tools: {}
      }))
    }, 50)

    const result = await initPromise
    expect(result).toEqual({ messages, title: thread.title })
  })

  it('メッセージとスレッド情報を返すこと', async () => {
    vi.mocked(getMessages).mockResolvedValue(messages)
    vi.mocked(getThread).mockResolvedValue(thread)

    vi.mock('../lib/llm', () => ({
      tools: {}
    }))

    const result = await handleInit(null, '1')

    expect(getMessages).toHaveBeenCalledWith('1')
    expect(getThread).toHaveBeenCalledWith('1')
    expect(result).toEqual({ messages, title: thread.title })
  })
})
