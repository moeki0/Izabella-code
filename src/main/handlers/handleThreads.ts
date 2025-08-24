import { ipcMain } from 'electron'
import {
  getThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  generateAndUpdateThreadTitle
} from '../lib/thread'

export const handleThreads = (): void => {
  ipcMain.handle('threads:getAll', async () => {
    try {
      return await getThreads()
    } catch (error) {
      console.error('Error getting threads:', error)
      throw error
    }
  })

  ipcMain.handle('threads:get', async (_, threadId: string) => {
    try {
      return await getThread(threadId)
    } catch (error) {
      console.error('Error getting thread:', error)
      throw error
    }
  })

  ipcMain.handle('threads:create', async (_, params = {}) => {
    try {
      return await createThread(params)
    } catch (error) {
      console.error('Error creating thread:', error)
      throw error
    }
  })

  ipcMain.handle('threads:update', async (_, params) => {
    try {
      return await updateThread(params)
    } catch (error) {
      console.error('Error updating thread:', error)
      throw error
    }
  })

  ipcMain.handle('threads:delete', async (_, threadId: string) => {
    try {
      return await deleteThread(threadId)
    } catch (error) {
      console.error('Error deleting thread:', error)
      throw error
    }
  })

  ipcMain.handle('threads:generateTitle', async (_, threadId: string) => {
    try {
      return await generateAndUpdateThreadTitle(threadId)
    } catch (error) {
      console.error('Error generating thread title:', error)
      throw error
    }
  })
}
