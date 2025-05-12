import { app, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { handleInit } from './handlers/handleInit'
import { handleSend } from './handlers/handleSend'
import { handleToolsGet } from './handlers/handleToolsGet'
import { handleToolsEnabledGet } from './handlers/handleToolsEnabledGet'
import { handleToolsEnabledUpdate } from './handlers/handleToolsEnabledUpdate'
import { handleLink } from './handlers/handleLink'
import { handleInterrupt } from './handlers/handleInterrupt'
import { createWindow } from './lib/createWindow'
import { handleMessageContextMenu } from './handlers/handleMessageContextMenu'
import { updateElectronApp } from 'update-electron-app'
import { store } from './lib/store'
import { initializeConfig } from './lib/initializeConfig'
import { handleDeleteMessage } from './handlers/handleDeleteMessage'
import { handleSummarize } from './handlers/handleMemory'
import {
  handleGetMemoryContent,
  handleSummarizeMemoryContent
} from './handlers/handleMemoryContent'
import { handleSearchMessages } from './handlers/handleSearchMessages'
import { handleGetMessageContext } from './handlers/handleGetMessageContext'
import { handleMessageContext } from './handlers/handleMessageContext'
import { initializeMCP } from './lib/llm'
import { getLocale, setLocale, initLocale, getPreferredLocale } from './lib/intl'

// Set API keys from store
const updateApiKeys = (): void => {
  const apiKeys = store.get('apiKeys') as { openai: string; google: string } | undefined

  if (apiKeys?.openai) {
    process.env.OPENAI_API_KEY = apiKeys.openai
  }

  if (apiKeys?.google) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKeys.google
  }
}

// Initial update of API keys
updateApiKeys()

let mainWindow: BrowserWindow

app.whenReady().then(async () => {
  if (process.env.DISABLE_UPDATE !== 'true') {
    updateElectronApp()
  }

  initializeConfig()

  // Initialize intl with the preferred locale - ensure it's called before app setup
  const preferredLocale = getPreferredLocale()
  initLocale(preferredLocale)

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  mainWindow = await createWindow()

  ipcMain.on('show-message-context-menu', handleMessageContextMenu)
  ipcMain.handle('link', handleLink)
  ipcMain.handle('get-tools', handleToolsGet)
  ipcMain.handle('get-tools-enabled', handleToolsEnabledGet)
  ipcMain.handle('update-tool-enabled', (_, toolName, enabled) =>
    handleToolsEnabledUpdate(toolName, enabled)
  )
  ipcMain.handle('init', handleInit)
  ipcMain.handle('interrupt', handleInterrupt)
  ipcMain.handle('send', handleSend)
  ipcMain.handle('set-config', async (_, name, input) => {
    store.set(name, input)

    // Update API keys in environment variables when they change
    if (name === 'apiKeys') {
      updateApiKeys()
    }

    // Re-initialize MCP when server configuration changes
    if (name === 'mcpServers') {
      await initializeMCP()
    }

    return true
  })
  ipcMain.handle('get-config', (_, name) => store.get(name))
  ipcMain.handle('delete-message', handleDeleteMessage)
  ipcMain.handle('summarize', () => handleSummarize())
  ipcMain.handle('summarizeMemoryContent', () => handleSummarizeMemoryContent())
  ipcMain.handle('getMemoryContent', () => handleGetMemoryContent())
  ipcMain.handle('search-messages', handleSearchMessages)
  ipcMain.handle('get-message-context', handleGetMessageContext)
  ipcMain.handle('message-context', handleMessageContext)

  // Handler for getting the current locale
  ipcMain.handle('get-locale', () => getLocale())

  // Handler for setting the locale
  ipcMain.handle('set-locale', (_, locale) => {
    setLocale(locale)
    return getLocale()
  })

  // Handler for restarting the application
  ipcMain.handle('restart-app', () => {
    app.relaunch()
    app.exit(0)
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
