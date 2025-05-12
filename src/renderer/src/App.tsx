import { Routes, Route, HashRouter } from 'react-router'
import { useEffect, useState } from 'react'
import Chat from './components/Chat'
import mermaid from 'mermaid'
import hljs from 'highlight.js'
import { initializeLocale } from './lib/locale'

const chatProps = {
  send: window.api.send,
  getTools: window.api.getTools,
  getEnabledTools: window.api.getEnabledTools,
  updateToolEnabled: window.api.updateToolEnabled,
  link: window.api.link,
  interrupt: window.api.interrupt,
  randomUUID: window.crypto.randomUUID.bind(window.crypto),
  registerKnowledgeSavedListener: (callback: (data: { ids: string[] }) => void) => {
    window.electron.ipcRenderer.on('knowledge-saved', (_, data) => callback(data))
    return () => window.electron.ipcRenderer.removeAllListeners('knowledge-saved')
  },
  registerMemoryUpdatedListener: (callback: (data: { success: boolean }) => void) => {
    window.electron.ipcRenderer.on('memory-updated', (_, data) => callback(data))
    return () => window.electron.ipcRenderer.removeAllListeners('memory-updated')
  },
  registerStreamListener: (callback: (chunk: string) => void) => {
    window.electron.ipcRenderer.on('stream', (_, chunk) => callback(chunk))
    return () => window.electron.ipcRenderer.removeAllListeners('stream')
  },
  registerRetryListener: (callback: (error) => void) => {
    window.electron.ipcRenderer.on('retry', (_, error) => callback(error))
    return () => window.electron.ipcRenderer.removeAllListeners('retry')
  },
  registerToolCallListener: (
    callback: (content: { toolName: string; args: string }, pending: boolean) => void
  ) => {
    window.electron.ipcRenderer.on('tool-call', (_, content, pending) => callback(content, pending))
    return () => window.electron.ipcRenderer.removeAllListeners('tool-call')
  },
  registerStepFinishListener: (callback: (id: string) => void) => {
    window.electron.ipcRenderer.on('step-finish', (_, id) => callback(id))
    return () => window.electron.ipcRenderer.removeAllListeners('step-finish')
  },
  registerMessageSavedListener: (callback: (id: string) => void) => {
    window.electron.ipcRenderer.on('message-saved', (_, id) => callback(id))
    return () => window.electron.ipcRenderer.removeAllListeners('message-saved')
  },
  registerInterruptListener: (callback: () => void) => {
    window.electron.ipcRenderer.on('interrupt', callback)
    return () => window.electron.ipcRenderer.removeAllListeners('interrupt')
  },
  registerFinishListener: (callback: () => void) => {
    window.electron.ipcRenderer.on('finish', callback)
    return () => window.electron.ipcRenderer.removeAllListeners('finish')
  },
  registerErrorListener: (callback: (chunk: string) => void) => {
    window.electron.ipcRenderer.on('error', (_, chunk) => callback(chunk))
    return () => window.electron.ipcRenderer.removeAllListeners('error')
  },
  registerToolResultListener: (callback: (content: { toolName: string; args: string }) => void) => {
    window.electron.ipcRenderer.on('tool-result', (_, content) => callback(content))
    return () => window.electron.ipcRenderer.removeAllListeners('tool-result')
  },
  registerTitleListener: (callback: (chunk: string) => void) => {
    window.electron.ipcRenderer.on('title', (_, chunk) => callback(chunk))
    return () => window.electron.ipcRenderer.removeAllListeners('title')
  },
  registerNewThreadListener: (callback: () => void) => {
    window.electron.ipcRenderer.on('new', callback)
    return () => window.electron.ipcRenderer.removeAllListeners('new')
  },
  registerSourceListener: (
    callback: (content: { sources: Array<Record<string, unknown>>; isPartial: boolean }) => void
  ) => {
    window.electron.ipcRenderer.on('source', (_, content) => callback(content))
    return () => window.electron.ipcRenderer.removeAllListeners('source')
  },
  showMessageContextMenu: (text: string, messageId?: string, isAssistantMessage?: boolean) => {
    window.electron.ipcRenderer.send(
      'show-message-context-menu',
      text,
      messageId,
      isAssistantMessage
    )
  },
  mermaidInit: mermaid.initialize,
  mermaidRun: mermaid.run,
  highlightAll: hljs.highlightAll,
  init: window.api.init,
  approveToolCall: (approved: boolean) => {
    window.electron.ipcRenderer.send('tool-approval', approved)
  }
}

function App(): React.JSX.Element {
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false)

  useEffect(() => {
    // Initialize locale from system settings
    initializeLocale().catch(console.error)

    // Check for API keys and open settings sidebar if missing
    const checkApiKeys = async (): Promise<void> => {
      try {
        const apiKeys = await window.api.getConfig('apiKeys')
        const hasOpenAIKey = apiKeys?.openai && apiKeys.openai.trim() !== ''
        const hasGoogleKey = apiKeys?.google && apiKeys.google.trim() !== ''

        // If both API keys are missing, open the settings sidebar
        if (!hasOpenAIKey && !hasGoogleKey) {
          setIsSettingsSidebarOpen(true)
        }
      } catch (error) {
        console.error('Error checking API keys:', error)
      }
    }

    checkApiKeys()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={<Chat {...chatProps} initialSettingsSidebarOpen={isSettingsSidebarOpen} />}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
