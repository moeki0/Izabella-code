import { Routes, Route, HashRouter } from 'react-router'
import Chat from './components/Chat'
import mermaid from 'mermaid'
import hljs from 'highlight.js'

const chatProps = {
  send: window.api.send,
  getTools: window.api.getTools,
  link: window.api.link,
  interrupt: window.api.interrupt,
  randomUUID: window.crypto.randomUUID.bind(window.crypto),
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
  registerStepFinishListener: (callback: () => void) => {
    window.electron.ipcRenderer.on('step-finish', callback)
    return () => window.electron.ipcRenderer.removeAllListeners('step-finish')
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
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Chat {...chatProps} />} />
      </Routes>
    </HashRouter>
  )
}

export default App
