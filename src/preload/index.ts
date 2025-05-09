import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Message } from '../main/lib/message'

export type Tool = {
  name: string
  description: string
}

const api = {
  init: (): Promise<{ message: Array<Message>; title: string }> => ipcRenderer.invoke('init'),
  getTools: (): Promise<Array<Tool>> => ipcRenderer.invoke('get-tools'),
  link: (url: string): Promise<void> => ipcRenderer.invoke('link', url),
  interrupt: (): Promise<void> => ipcRenderer.invoke('interrupt'),
  send: (input: string, resourceId: string, threadId: string, isRetry: boolean): Promise<void> =>
    ipcRenderer.invoke('send', input, resourceId, threadId, isRetry),
  getConfig: (name: string): Promise<string> => ipcRenderer.invoke('get-config', name),
  setConfig: (name: string, input: unknown): Promise<void> =>
    ipcRenderer.invoke('set-config', name, input),
  deleteMessage: (messageId: string): Promise<void> =>
    ipcRenderer.invoke('delete-message', messageId)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

// IPC Events
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => {
      const validChannels = [
        'search-threads',
        'show-message-context-menu',
        'show-thread-context-menu',
        'tool-approval'
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      }
    },
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const validChannels = [
        'stream',
        'tool-call',
        'step-finish',
        'finish',
        'error',
        'tool-result',
        'title',
        'search-threads-result',
        'new-thread',
        'retry',
        'source',
        'message-deleted'
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_, ...args) => callback(...args))
      }
    },
    removeAllListeners: (channel: string) => {
      const validChannels = [
        'stream',
        'tool-call',
        'step-finish',
        'finish',
        'error',
        'tool-result',
        'title',
        'search-threads-result',
        'new-thread',
        'retry',
        'source',
        'message-deleted'
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel)
      }
    }
  }
})
