/**
 * DataStorageのインターフェース
 * スレッドとメッセージの保存・取得・検索のためのインターフェースを定義
 */

export type Thread = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  toolName?: string
  toolReq?: string
  toolRes?: string
  createdAt: string
  updatedAt: string
}

export type ThreadWithMessages = Thread & {
  messages: Message[]
}

export type PaginationParams = {
  page: number
  itemsPerPage: number
}

export type ThreadsWithPagination = {
  threads: Array<ThreadWithMessages>
  total: number
  totalPages: number
}

export interface IStorage {
  // Thread操作
  getThreads(params?: PaginationParams): Promise<ThreadsWithPagination>
  getThread(id: string): Promise<Thread>
  createThread(id: string): Promise<void>
  updateThreadTitle(params: { id: string; title: string }): Promise<void>
  deleteThread(id: string): Promise<void>
  getOrCreateThread(id: string): Promise<Thread>

  // Message操作
  getMessages(threadId: string): Promise<Array<Message>>
  createMessage(params: {
    threadId: string
    role: 'user' | 'assistant' | 'tool'
    content?: string
    toolName?: string
    toolReq?: string
    toolRes?: string
  }): Promise<void>

  // 検索
  searchThread(query: string, params?: PaginationParams): Promise<ThreadsWithPagination>
}
