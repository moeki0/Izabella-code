import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSend } from './handleSend'
import { agent, chat, titleAgent } from '../lib/llm'
import { createMessage } from '../lib/message'
import { getOrCreateThread, updateThreadTitle } from '../lib/thread'
import { mainWindow } from '..'
import { Agent } from '@mastra/core/agent'
import { StreamReturn } from '@mastra/core'

vi.mock('../lib/store', () => ({
  store: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

vi.mock('../lib/llm', () => ({
  agent: vi.fn(),
  chat: vi.fn(),
  titleAgent: vi.fn(),
  tools: {}
}))

vi.mock('../lib/message', () => ({
  createMessage: vi.fn(),
  getMessages: vi.fn().mockResolvedValue([{ role: 'user', content: 'Test' }])
}))

vi.mock('../lib/thread', () => ({
  getOrCreateThread: vi.fn(),
  updateThreadTitle: vi.fn()
}))

vi.mock('../lib/database', () => ({
  database: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue([{ content: 'Hello' }, { content: 'Hi there!' }])
    })
  })
}))

vi.mock('..', () => ({
  mainWindow: {
    webContents: {
      send: vi.fn()
    }
  }
}))

describe('handleSend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正常系: メッセージを送信し、スレッドとメッセージが作成されること', async () => {
    const mockAgent = {}
    const mockChat = {
      fullStream: [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'step-finish' },
        { type: 'finish' }
      ]
    }
    const mockTitle = {
      stream: vi.fn().mockResolvedValue({
        partialObjectStream: [{ title: 'Test Thread' }]
      })
    }

    vi.mocked(agent).mockResolvedValue(mockAgent as Agent)
    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)
    vi.mocked(titleAgent).mockResolvedValue(mockTitle as unknown as Agent)

    await handleSend(null, 'Hello', 'resource-1', 'thread-1', false)

    expect(chat).toHaveBeenCalledWith(mockAgent, 'Hello', 'resource-1', 'thread-1')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('stream', 'Hello')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('step-finish')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('finish')

    expect(getOrCreateThread).toHaveBeenCalledWith('thread-1')
    expect(createMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      role: 'user',
      content: 'Hello'
    })
    expect(createMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      role: 'assistant',
      content: 'Hello'
    })

    expect(titleAgent).toHaveBeenCalled()
    expect(updateThreadTitle).toHaveBeenCalledWith({
      id: 'thread-1',
      title: 'Test Thread'
    })
  })

  it('ツール呼び出しを含むメッセージを送信し、ツールメッセージが作成されること', async () => {
    const mockAgent = {}
    const mockChat = {
      fullStream: [
        {
          type: 'tool-result',
          toolName: 'test-tool',
          args: { test: true },
          result: { success: true }
        },
        { type: 'finish' }
      ]
    }
    const mockTitle = {
      stream: vi.fn().mockResolvedValue({
        partialObjectStream: [{ title: 'Test Thread' }]
      })
    }

    vi.mocked(agent).mockResolvedValue(mockAgent as Agent)
    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)
    vi.mocked(titleAgent).mockResolvedValue(mockTitle as unknown as Agent)

    await handleSend(null, [{ role: 'user', content: 'Hello' }], 'resource-1', 'thread-1', false)

    expect(createMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      role: 'tool',
      toolName: 'test-tool',
      toolReq: JSON.stringify({ test: true }),
      toolRes: JSON.stringify({ success: true })
    })
  })

  it('エラーが発生した場合、エラーメッセージが送信されること', async () => {
    const error = new Error('Test error')
    vi.mocked(chat).mockRejectedValue(error)

    await handleSend(null, [{ role: 'user', content: 'Hello' }], 'resource-1', 'thread-1', false)

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('error', 'Error: Test error')
  })
})
