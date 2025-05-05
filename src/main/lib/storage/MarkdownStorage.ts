/**
 * MarkdownStorageの実装
 * ファイルシステムを使用したMarkdownベースのストレージ実装
 */

import { app } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import glob from 'fast-glob'
import matter from 'gray-matter'
import {
  IStorage,
  Thread,
  Message,
  ThreadsWithPagination,
  PaginationParams,
  ThreadWithMessages
} from './IStorage'

export class MarkdownStorage implements IStorage {
  private baseDir: string

  constructor(basePath?: string) {
    this.baseDir = basePath || join(app.getPath('userData'), 'threads')
    this.initStorage()
  }

  private initStorage(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true })
    }
  }

  private async ensureThreadDir(threadId: string): Promise<string> {
    const threadDir = join(this.baseDir, threadId)
    const messagesDir = join(threadDir, 'messages')

    if (!existsSync(threadDir)) {
      mkdirSync(threadDir, { recursive: true })
    }
    if (!existsSync(messagesDir)) {
      mkdirSync(messagesDir, { recursive: true })
    }

    return threadDir
  }

  private async getThreadMetadataPath(threadId: string): Promise<string> {
    return join(this.baseDir, threadId, 'metadata.json')
  }

  private async readThreadMetadata(threadId: string): Promise<Thread | null> {
    const metadataPath = await this.getThreadMetadataPath(threadId)

    try {
      if (existsSync(metadataPath)) {
        const data = await fs.readFile(metadataPath, 'utf-8')
        return JSON.parse(data) as Thread
      }
    } catch (error) {
      console.error(`Error reading thread metadata for ${threadId}:`, error)
    }

    return null
  }

  private async writeThreadMetadata(thread: Thread): Promise<void> {
    const metadataPath = await this.getThreadMetadataPath(thread.id)

    try {
      await fs.writeFile(metadataPath, JSON.stringify(thread, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Error writing thread metadata for ${thread.id}:`, error)
      throw error
    }
  }

  private async getMessageFilename(message: Message): Promise<string> {
    const timestamp = new Date(message.createdAt).getTime()
    return `${timestamp}_${message.role}_${message.id}.md`
  }

  private async writeMessageToFile(message: Message): Promise<void> {
    await this.ensureThreadDir(message.threadId)

    const filename = await this.getMessageFilename(message)
    const messagePath = join(this.baseDir, message.threadId, 'messages', filename)

    // フロントマターの作成
    const frontMatter: Record<string, unknown> = {
      id: message.id,
      threadId: message.threadId,
      role: message.role,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    }

    if (message.role === 'tool') {
      frontMatter.toolName = message.toolName
      frontMatter.toolReq = message.toolReq
      frontMatter.toolRes = message.toolRes

      // ツールメッセージの場合は本文は空
      const fileContent = matter.stringify('', frontMatter)
      await fs.writeFile(messagePath, fileContent, 'utf-8')
    } else {
      // ユーザーまたはアシスタントメッセージの場合
      const content = message.content || ''
      const fileContent = matter.stringify(content, frontMatter)
      await fs.writeFile(messagePath, fileContent, 'utf-8')
    }
  }

  private async readMessageFromFile(filePath: string): Promise<Message> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const { data: frontMatter, content } = matter(fileContent)

      const message: Message = {
        id: frontMatter.id,
        threadId: frontMatter.threadId,
        role: frontMatter.role,
        createdAt: frontMatter.createdAt,
        updatedAt: frontMatter.updatedAt
      }

      if (frontMatter.role === 'tool') {
        message.toolName = frontMatter.toolName
        message.toolReq = frontMatter.toolReq
        message.toolRes = frontMatter.toolRes
      } else {
        message.content = content.trim()
      }

      return message
    } catch (error) {
      console.error(`Error reading message from file ${filePath}:`, error)
      throw error
    }
  }

  async getThreads(
    params: PaginationParams = { page: 1, itemsPerPage: 12 }
  ): Promise<ThreadsWithPagination> {
    try {
      // すべてのスレッドフォルダを取得
      const threadDirs = await glob('*', {
        cwd: this.baseDir,
        onlyDirectories: true,
        absolute: false
      })

      // スレッドのメタデータを全て読み込む
      const threadsPromises = threadDirs.map(async (dir) => {
        const threadId = dir
        const metadata = await this.readThreadMetadata(threadId)

        if (metadata) {
          // メッセージも読み込む
          const messages = await this.getMessages(threadId)

          return {
            ...metadata,
            messages
          } as ThreadWithMessages
        }
        return null
      })

      let threads = (await Promise.all(threadsPromises)).filter(
        (t): t is ThreadWithMessages => t !== null
      )

      // 作成日の降順でソート
      threads.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      const total = threads.length
      const totalPages = Math.ceil(total / params.itemsPerPage)

      // ページネーション適用
      const startIndex = (params.page - 1) * params.itemsPerPage
      const endIndex = startIndex + params.itemsPerPage
      threads = threads.slice(startIndex, endIndex)

      return {
        threads,
        total,
        totalPages
      }
    } catch (error) {
      console.error('Error getting threads:', error)
      return {
        threads: [],
        total: 0,
        totalPages: 0
      }
    }
  }

  async searchThread(
    query: string,
    params: PaginationParams = { page: 1, itemsPerPage: 12 }
  ): Promise<ThreadsWithPagination> {
    try {
      const lowerQuery = query.toLowerCase()

      // すべてのスレッドを取得
      const { threads: allThreads } = await this.getThreads({ page: 1, itemsPerPage: 1000 })

      // クエリに一致するスレッドをフィルタリング
      const matchingThreads = allThreads.filter((thread) => {
        // タイトルで検索
        if (thread.title && thread.title.toLowerCase().includes(lowerQuery)) {
          return true
        }

        // メッセージコンテンツで検索
        const hasMatchingMessage = thread.messages.some(
          (msg) => msg.content && msg.content.toLowerCase().includes(lowerQuery)
        )

        return hasMatchingMessage
      })

      const total = matchingThreads.length
      const totalPages = Math.ceil(total / params.itemsPerPage)

      // ページネーション適用
      const startIndex = (params.page - 1) * params.itemsPerPage
      const endIndex = startIndex + params.itemsPerPage
      const paginatedThreads = matchingThreads.slice(startIndex, endIndex)

      return {
        threads: paginatedThreads,
        total,
        totalPages
      }
    } catch (error) {
      console.error('Error searching threads:', error)
      return {
        threads: [],
        total: 0,
        totalPages: 0
      }
    }
  }

  async deleteThread(id: string): Promise<void> {
    const threadDir = join(this.baseDir, id)

    try {
      if (existsSync(threadDir)) {
        await fs.rm(threadDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.error(`Error deleting thread ${id}:`, error)
      throw error
    }
  }

  async getThread(id: string): Promise<Thread> {
    const thread = await this.readThreadMetadata(id)
    if (!thread) {
      throw new Error(`Thread not found: ${id}`)
    }
    return thread
  }

  async createThread(id: string): Promise<void> {
    await this.ensureThreadDir(id)

    const now = new Date().toISOString()
    const thread: Thread = {
      id,
      title: '',
      createdAt: now,
      updatedAt: now
    }

    await this.writeThreadMetadata(thread)
  }

  async updateThreadTitle(params: { id: string; title: string }): Promise<void> {
    const thread = await this.getThread(params.id)

    if (thread) {
      thread.title = params.title
      thread.updatedAt = new Date().toISOString()

      await this.writeThreadMetadata(thread)
    }
  }

  async getOrCreateThread(id: string): Promise<Thread> {
    try {
      return await this.getThread(id)
    } catch {
      await this.createThread(id)
      return await this.getThread(id)
    }
  }

  async getMessages(threadId: string): Promise<Array<Message>> {
    const messagesDir = join(this.baseDir, threadId, 'messages')

    try {
      if (!existsSync(messagesDir)) {
        return []
      }

      const messageFiles = await glob('*.md', {
        cwd: messagesDir,
        absolute: true
      })

      const messagesPromises = messageFiles.map((file) => this.readMessageFromFile(file))
      const messages = await Promise.all(messagesPromises)

      // 作成日でソート
      return messages.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })
    } catch (e) {
      console.error(`Error getting messages for thread ${threadId}:`, e)
      return []
    }
  }

  async createMessage(params: {
    threadId: string
    role: 'user' | 'assistant' | 'tool'
    content?: string
    toolName?: string
    toolReq?: string
    toolRes?: string
  }): Promise<void> {
    // スレッドが存在することを確認
    await this.getOrCreateThread(params.threadId)

    const now = new Date().toISOString()
    const message: Message = {
      id: randomUUID(),
      threadId: params.threadId,
      role: params.role,
      createdAt: now,
      updatedAt: now
    }

    if (params.role === 'tool') {
      message.toolName = params.toolName
      message.toolReq = params.toolReq
      message.toolRes = params.toolRes
    } else {
      message.content = params.content
    }

    await this.writeMessageToFile(message)

    // スレッドの更新日時を更新
    const thread = await this.getThread(params.threadId)
    if (thread) {
      thread.updatedAt = now
      await this.writeThreadMetadata(thread)
    }
  }
}
