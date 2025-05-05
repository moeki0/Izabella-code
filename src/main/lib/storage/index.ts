/**
 * ストレージ実装のエクスポート
 */

import { IStorage } from './IStorage'
import { MarkdownStorage } from './MarkdownStorage'

// ストレージインスタンスを取得
export async function getStorage(): Promise<IStorage> {
  return new MarkdownStorage()
}

// 型のエクスポート
export type { IStorage, Thread, Message, ThreadsWithPagination, PaginationParams } from './IStorage'
