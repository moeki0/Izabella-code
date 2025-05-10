import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { handleInit } from './handlers/handleInit'
import { handleSend } from './handlers/handleSend'
import { handleToolsGet } from './handlers/handleToolsGet'
import { handleLink } from './handlers/handleLink'
import { handleInterrupt } from './handlers/handleInterrupt'
import { createWindow } from './lib/createWindow'
import { handleMessageContextMenu } from './handlers/handleMessageContextMenu'
import { updateElectronApp } from 'update-electron-app'
import { store } from './lib/store'
import { initializeConfig } from './lib/initializeConfig'
import { handleToolApproval } from './handlers/handleToolApproval'
import { handleDeleteMessage } from './handlers/handleDeleteMessage'
import { handleSummarize } from './handlers/handleMemory'
import {
  handleGetMemoryContent,
  handleGetKnowledgeIndexContent,
  handleSummarizeMemoryContent,
  handleUpdateKnowledgeIndex
} from './handlers/handleMemoryContent'

let mainWindow: BrowserWindow

app.whenReady().then(async () => {
  if (process.env.DISABLE_UPDATE !== 'true') {
    updateElectronApp()
  }

  initializeConfig()

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  mainWindow = await createWindow()

  ipcMain.on('show-message-context-menu', handleMessageContextMenu)
  ipcMain.handle('link', handleLink)
  ipcMain.handle('get-tools', handleToolsGet)
  ipcMain.handle('init', handleInit)
  ipcMain.handle('interrupt', handleInterrupt)
  ipcMain.handle('send', handleSend)
  ipcMain.handle('set-config', (_, name, input) => store.set(name, input))
  ipcMain.handle('get-config', (_, name) => store.get(name))
  ipcMain.handle('delete-message', handleDeleteMessage)
  ipcMain.handle('summarize', () => handleSummarize())
  ipcMain.handle('summarizeMemoryContent', () => handleSummarizeMemoryContent())
  ipcMain.handle('getMemoryContent', () => handleGetMemoryContent())
  ipcMain.handle('getKnowledgeIndexContent', () => handleGetKnowledgeIndexContent())
  ipcMain.handle('updateKnowledgeIndex', (_, content) => handleUpdateKnowledgeIndex(content))
  ipcMain.on('tool-approval', async (_, approved) => {
    await handleToolApproval(approved)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
