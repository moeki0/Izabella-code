/**
 * スレッド関連の処理をストレージインターフェースを使用して実装
 */

import { getStorage, Thread, ThreadsWithPagination } from './storage'

export type { Thread, ThreadsWithPagination }

export const searchThread = async (
  query: string,
  page: number = 1,
  itemsPerPage: number = 12
): Promise<ThreadsWithPagination> => {
  const storage = await getStorage()
  return storage.searchThread(query, { page, itemsPerPage })
}

export const getThreads = async (
  page: number = 1,
  itemsPerPage: number = 12
): Promise<ThreadsWithPagination> => {
  const storage = await getStorage()
  return storage.getThreads({ page, itemsPerPage })
}

export const deleteThread = async (id: string): Promise<void> => {
  const storage = await getStorage()
  await storage.deleteThread(id)
}

export const getThread = async (id: string): Promise<Thread> => {
  const storage = await getStorage()
  return storage.getThread(id)
}

export const createThread = async (id: string): Promise<void> => {
  const storage = await getStorage()
  await storage.createThread(id)
}

export const updateThreadTitle = async (params: { id: string; title: string }): Promise<void> => {
  const storage = await getStorage()
  await storage.updateThreadTitle(params)
}

export const getOrCreateThread = async (id: string): Promise<Thread> => {
  const storage = await getStorage()
  return storage.getOrCreateThread(id)
}
