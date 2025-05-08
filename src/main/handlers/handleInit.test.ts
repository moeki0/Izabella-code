import { describe, expect, it, vi, beforeEach } from 'vitest'
import { handleInit } from './handleInit'
import { getMessages } from '../lib/message'

vi.mock('../lib/message', () => ({
  getMessages: vi.fn()
}))

vi.mock('../lib/llm', () => ({
  tools: undefined
}))

const messages = [{ id: '1', role: 'user' as const, content: 'test' }]

describe('handleInit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toolsが設定されるまで待機すること', async () => {
    vi.mocked(getMessages).mockResolvedValue(messages)

    const initPromise = handleInit()

    // toolsを設定
    setTimeout(() => {
      vi.mock('../lib/llm', () => ({
        tools: {}
      }))
    }, 50)

    const result = await initPromise
    expect(result).toEqual({ messages })
  })

  it('メッセージを返すこと', async () => {
    vi.mocked(getMessages).mockResolvedValue(messages)

    vi.mock('../lib/llm', () => ({
      tools: {}
    }))

    const result = await handleInit()

    expect(getMessages).toHaveBeenCalled()
    expect(result).toEqual({ messages })
  })
})
