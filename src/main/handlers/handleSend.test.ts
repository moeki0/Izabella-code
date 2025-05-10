import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSend } from './handleSend'
import { agent, chat } from '../lib/llm'
import { createMessage } from '../lib/message'
import { mainWindow } from '..'
import { Agent } from '@mastra/core/agent'
import { StreamReturn } from '@mastra/core'

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/path')
  }
}))

// Googleのモックを追加
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      message: {
        content: 'ツール'
      }
    })
  }))
}))

vi.mock('../lib/store', () => ({
  store: {
    get: vi.fn().mockReturnValue(false), // デフォルト値を設定
    set: vi.fn()
  }
}))

vi.mock('../lib/llm', () => ({
  agent: vi.fn(),
  chat: vi.fn(),
  tools: {},
  detectSearchNeed: vi.fn().mockResolvedValue(false),
  model: vi.fn().mockResolvedValue({})
}))

// Mock vectorStoreTools to prevent actual API calls
vi.mock('../lib/vectorStoreTools', () => ({
  saveToKnowledgeBase: vi
    .fn()
    .mockResolvedValue(JSON.stringify({ action: 'inserted', id: 'test-id' })),
  upsertKnowledge: {
    execute: vi.fn().mockResolvedValue(JSON.stringify({ action: 'inserted', id: 'test-id' }))
  },
  searchKnowledge: {
    execute: vi.fn().mockResolvedValue(JSON.stringify({ results: [] }))
  },
  vectorDelete: {
    execute: vi.fn().mockResolvedValue(JSON.stringify({ deleted: ['test-id'] }))
  }
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

    vi.mocked(agent).mockResolvedValue(mockAgent as Agent)
    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)

    await handleSend(null, 'Hello')

    expect(agent).toHaveBeenCalled()
    expect(chat).toHaveBeenCalledWith(mockAgent, 'Hello', false)
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('stream', 'Hello')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('step-finish')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('finish')

    expect(createMessage).toHaveBeenCalledWith({
      role: 'user',
      content: 'Hello'
    })
    expect(createMessage).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'Hello',
      sources: undefined
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

    vi.mocked(agent).mockResolvedValue(mockAgent as Agent)
    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)

    await handleSend(null, 'Hello')

    expect(createMessage).toHaveBeenCalledWith({
      role: 'tool',
      toolName: 'test-tool',
      toolReq: JSON.stringify({ test: true }),
      toolRes: JSON.stringify({ success: true })
    })
  })

  it('エラーが発生した場合、エラーメッセージが送信されること', async () => {
    const error = new Error('Test error')
    vi.mocked(chat).mockRejectedValue(error)

    await handleSend(null, 'Hello')

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('error', 'Error: Test error')
  })
})
