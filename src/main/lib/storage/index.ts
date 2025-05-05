/**
 * ストレージ実装のエクスポート
 */

import { IStorage } from './IStorage'
import { MarkdownStorage } from './MarkdownStorage'
import { store } from '../store'
import { app } from 'electron'
import { join } from 'node:path'

export interface StorageConfig {
  threadsPath?: string
}

// デフォルト設定
const defaultConfig: StorageConfig = {
  threadsPath: join(app.getPath('userData'), 'threads')
}

// ストレージインスタンスを取得
export async function getStorage(): Promise<IStorage> {
  // ストレージの設定を取得
  const config = (store.get('storage') as StorageConfig) || defaultConfig

  // 設定されたパスまたはデフォルトパスを使用
  const threadsPath = config.threadsPath || defaultConfig.threadsPath

  return new MarkdownStorage(threadsPath)
}

// ストレージパスを取得する関数
export function getStoragePath(): string {
  const config = (store.get('storage') as StorageConfig) || defaultConfig
  return config.threadsPath || defaultConfig.threadsPath!
}

// ストレージパスを設定する関数
export function setStoragePath(path: string): void {
  const config = (store.get('storage') as StorageConfig) || defaultConfig
  store.set('storage', { ...config, threadsPath: path })
}

// 型のエクスポート
export type { IStorage, Thread, Message, ThreadsWithPagination, PaginationParams } from './IStorage'
