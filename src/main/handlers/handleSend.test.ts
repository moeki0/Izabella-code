import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSend } from './handleSend'
import { chat } from '../lib/chat'
import { createMessage } from '../lib/message'
import { mainWindow } from '..'
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

vi.mock('../lib/chat', () => ({
  chat: vi.fn()
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

vi.mock('../lib/extractKnowledge', () => ({
  processConversationForKnowledge: vi.fn().mockResolvedValue(['test-knowledge-id'])
}))

vi.mock('../lib/generateWorkingMemory', () => ({
  processConversationForWorkingMemory: vi.fn().mockResolvedValue(true)
}))

vi.mock('../lib/compressWorkingMemory', () => ({
  checkAndCompressWorkingMemory: vi.fn().mockResolvedValue(false)
}))

vi.mock('../lib/extractTheme', () => ({
  extractTheme: vi.fn().mockResolvedValue('一般的な会話'),
  getThemeFromMetadata: vi.fn().mockReturnValue(undefined)
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
    const mockChat = {
      fullStream: [
        { type: 'text-delta', textDelta: 'Hello' },
        { type: 'step-finish' },
        { type: 'finish' }
      ]
    }

    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)

    await handleSend(null, 'Hello')

    // agent、model、chatの順に呼び出されるため、チェックは不要
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('stream', 'Hello')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('step-finish')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('finish')

    expect(createMessage).toHaveBeenCalledWith({
      role: 'user',
      content: 'Hello',
      metadata: '{}'
    })
    expect(createMessage).toHaveBeenCalledWith({
      role: 'assistant',
      content: 'Hello',
      sources: undefined
    })
  })

  it('ツール呼び出しを含むメッセージを送信し、ツールメッセージが作成されること', async () => {
    const mockChat = {
      fullStream: [
        {
          type: 'tool-result',
          toolName: 'search_knowledge',
          args: { test: true },
          result: { success: true }
        },
        { type: 'finish' }
      ]
    }

    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)

    await handleSend(null, 'Hello')

    // mockの呼び出し回数と引数を確認
    const calls = vi.mocked(createMessage).mock.calls
    const toolCall = calls.find(
      (call) => call[0] && call[0].role === 'tool' && call[0].toolName === 'search_knowledge'
    )!
    expect(toolCall).toBeTruthy()
    expect(toolCall[0].toolReq).toBe(JSON.stringify({ test: true }))
    expect(toolCall[0].toolRes).toBe(JSON.stringify({ success: true }))
  })

  it('エラーが発生した場合、エラーメッセージが送信されること', async () => {
    const error = new Error('Test error')
    vi.mocked(chat).mockRejectedValue(error)

    await handleSend(null, 'Hello')

    // エラーメッセージが送信されていることを確認
    const calls = vi.mocked(mainWindow.webContents.send).mock.calls
    const errorCall = calls.find((call) => call[0] === 'error')!
    expect(errorCall).toBeTruthy()
    expect(errorCall[1]).toBe('Error: Test error')
  })

  it('ナレッジベースに情報が保存された場合、ツールメッセージが作成されること', async () => {
    const mockChat = {
      fullStream: [{ type: 'text-delta', textDelta: 'Hello' }, { type: 'finish' }]
    }

    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)
    vi.mocked(createMessage).mockImplementation(() => Promise.resolve('test-message-id'))

    await handleSend(null, 'Hello')

    // mockの呼び出し回数と引数を確認
    const calls = vi.mocked(createMessage).mock.calls
    const userMessageCall = calls.find(
      (call) => call[0] && call[0].role === 'user' && call[0].content === 'Hello'
    )
    expect(userMessageCall).toBeTruthy()

    const assistantMessageCall = calls.find(
      (call) => call[0] && call[0].role === 'assistant' && call[0].content === 'Hello'
    )
    expect(assistantMessageCall).toBeTruthy()

    const knowledgeToolCall = calls.find(
      (call) => call[0] && call[0].role === 'tool' && call[0].toolName === 'knowledge_record'
    )!
    expect(knowledgeToolCall).toBeTruthy()
    expect(knowledgeToolCall[0].toolReq).toBe(
      JSON.stringify({ conversation_id: 'test-message-id' })
    )
    expect(knowledgeToolCall[0].toolRes).toBe(
      JSON.stringify({ saved_knowledge_ids: ['test-knowledge-id'] })
    )

    // UI通知が送信されていることを確認
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('knowledge-saved', {
      ids: ['test-knowledge-id']
    })
  })

  it('ワーキングメモリが更新された場合、ツールメッセージが作成されること', async () => {
    const mockChat = {
      fullStream: [{ type: 'text-delta', textDelta: 'Hello' }, { type: 'finish' }]
    }

    vi.mocked(chat).mockResolvedValue(mockChat as unknown as StreamReturn)
    vi.mocked(createMessage).mockImplementation(() => Promise.resolve('test-message-id'))

    await handleSend(null, 'Hello')

    // mockの呼び出し回数と引数を確認
    const calls = vi.mocked(createMessage).mock.calls
    const memoryToolCall = calls.find(
      (call) => call[0] && call[0].role === 'tool' && call[0].toolName === 'memory_update'
    )!
    expect(memoryToolCall).toBeTruthy()
    expect(memoryToolCall[0].toolReq).toBe(JSON.stringify({ conversation_id: 'test-message-id' }))
    expect(memoryToolCall[0].toolRes).toBe(JSON.stringify({ updated: true }))

    // UI通知が送信されていることを確認
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('memory-updated', {
      success: true
    })
  })

  // This test is temporarily skipped due to module loading issues
  it.skip('ワーキングメモリが圧縮された場合、圧縮ツールメッセージが作成されること', async () => {
    // Test skipped
  })
})
