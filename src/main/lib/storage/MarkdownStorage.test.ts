/**
 * MarkdownStorage テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import fs from 'node:fs'
import { MarkdownStorage } from './MarkdownStorage'

// モック用
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-chat-zen')
  }
}))

describe('MarkdownStorage', () => {
  const testDir = '/tmp/test-chat-zen/threads'
  let storage: MarkdownStorage

  // テスト前に一時ディレクトリを準備
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })

    storage = new MarkdownStorage()
  })

  // テスト後に一時ディレクトリを削除
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('スレッド操作', () => {
    it('スレッドを作成できること', async () => {
      const threadId = 'test-thread-id'
      await storage.createThread(threadId)

      const threadDir = join(testDir, threadId)
      expect(fs.existsSync(threadDir)).toBe(true)

      const metadataFile = join(threadDir, 'metadata.json')
      expect(fs.existsSync(metadataFile)).toBe(true)

      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'))
      expect(metadata.id).toBe(threadId)
      expect(metadata.title).toBe('')
    })

    it('スレッドタイトルを更新できること', async () => {
      const threadId = 'test-thread-id'
      const title = 'Test Thread Title'

      await storage.createThread(threadId)
      await storage.updateThreadTitle({ id: threadId, title })

      const thread = await storage.getThread(threadId)
      expect(thread.title).toBe(title)
    })

    it('スレッドを削除できること', async () => {
      const threadId = 'test-thread-id'

      await storage.createThread(threadId)
      const threadDir = join(testDir, threadId)
      expect(fs.existsSync(threadDir)).toBe(true)

      await storage.deleteThread(threadId)
      expect(fs.existsSync(threadDir)).toBe(false)
    })

    it('スレッド一覧を取得できること', async () => {
      // スレッドを複数作成
      await storage.createThread('thread-1')
      await storage.updateThreadTitle({ id: 'thread-1', title: 'Thread 1' })

      await storage.createThread('thread-2')
      await storage.updateThreadTitle({ id: 'thread-2', title: 'Thread 2' })

      const result = await storage.getThreads()

      expect(result.total).toBe(2)
      expect(result.threads.length).toBe(2)
      expect(result.threads.some((t) => t.id === 'thread-1')).toBe(true)
      expect(result.threads.some((t) => t.id === 'thread-2')).toBe(true)
    })
  })

  describe('メッセージ操作', () => {
    const threadId = 'test-thread-id'

    beforeEach(async () => {
      await storage.createThread(threadId)
    })

    it('ユーザーメッセージを作成できること', async () => {
      await storage.createMessage({
        threadId,
        role: 'user',
        content: 'Hello, world!'
      })

      const messages = await storage.getMessages(threadId)
      expect(messages.length).toBe(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello, world!')
    })

    it('アシスタントメッセージを作成できること', async () => {
      await storage.createMessage({
        threadId,
        role: 'assistant',
        content: 'Hello, I am an assistant!'
      })

      const messages = await storage.getMessages(threadId)
      expect(messages.length).toBe(1)
      expect(messages[0].role).toBe('assistant')
      expect(messages[0].content).toBe('Hello, I am an assistant!')
    })

    it('ツールメッセージを作成できること', async () => {
      await storage.createMessage({
        threadId,
        role: 'tool',
        toolName: 'calculator',
        toolReq: '1 + 1',
        toolRes: '2'
      })

      const messages = await storage.getMessages(threadId)
      expect(messages.length).toBe(1)
      expect(messages[0].role).toBe('tool')
      expect(messages[0].toolName).toBe('calculator')
      expect(messages[0].toolReq).toBe('1 + 1')
      expect(messages[0].toolRes).toBe('2')
    })

    it('複数のメッセージを作成し、正しい順序で取得できること', async () => {
      await storage.createMessage({
        threadId,
        role: 'user',
        content: 'Hello'
      })

      await storage.createMessage({
        threadId,
        role: 'assistant',
        content: 'Hi there!'
      })

      await storage.createMessage({
        threadId,
        role: 'user',
        content: 'How are you?'
      })

      const messages = await storage.getMessages(threadId)
      expect(messages.length).toBe(3)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].role).toBe('assistant')
      expect(messages[1].content).toBe('Hi there!')
      expect(messages[2].role).toBe('user')
      expect(messages[2].content).toBe('How are you?')
    })
  })

  describe('検索機能', () => {
    beforeEach(async () => {
      // テスト用のスレッドとメッセージを作成
      await storage.createThread('thread-1')
      await storage.updateThreadTitle({ id: 'thread-1', title: 'Thread about cats' })

      await storage.createMessage({
        threadId: 'thread-1',
        role: 'user',
        content: 'I love cats'
      })

      await storage.createMessage({
        threadId: 'thread-1',
        role: 'assistant',
        content: 'Cats are wonderful pets'
      })

      await storage.createThread('thread-2')
      await storage.updateThreadTitle({ id: 'thread-2', title: 'Thread about dogs' })

      await storage.createMessage({
        threadId: 'thread-2',
        role: 'user',
        content: 'I love dogs'
      })

      await storage.createMessage({
        threadId: 'thread-2',
        role: 'assistant',
        content: 'Dogs are loyal pets'
      })
    })

    it('タイトルでスレッドを検索できること', async () => {
      const result = await storage.searchThread('cats')

      expect(result.total).toBe(1)
      expect(result.threads.length).toBe(1)
      expect(result.threads[0].id).toBe('thread-1')
    })

    it('メッセージ内容でスレッドを検索できること', async () => {
      const result = await storage.searchThread('loyal')

      expect(result.total).toBe(1)
      expect(result.threads.length).toBe(1)
      expect(result.threads[0].id).toBe('thread-2')
    })

    it('複数のスレッドにマッチする検索ができること', async () => {
      const result = await storage.searchThread('pets')

      expect(result.total).toBe(2)
      expect(result.threads.length).toBe(2)
    })

    it('マッチしない検索ではゼロ件の結果を返すこと', async () => {
      const result = await storage.searchThread('elephants')

      expect(result.total).toBe(0)
      expect(result.threads.length).toBe(0)
    })
  })
})
