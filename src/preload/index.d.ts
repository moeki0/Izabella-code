import type { ElectronAPI } from '@electron-toolkit/preload'
import { Thread } from '@renderer/components/Threads'
import { Message } from '@renderer/components/Chat'
import { Tool } from '@renderer/components/Tools'

interface ThreadsWithPagination {
  threads: Array<Thread>
  total: number
  totalPages: number
}

interface API {
  init: () => Promise<{ title: string; messages: Array<Message> }>
  getTools: () => Promise<Array<Tool>>
  interrupt: () => Promise<void>
  link: (url: string) => Promise<void>
  send: (input: string, resourceId: string, threadId: string, isRetry: boolean) => Promise<void>
  getConfig: (name: string) => Promise<unknown>
  setConfig: (name: string, input: unknown) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void
        on: (channel: string, callback: (...args: unknown[]) => void) => void
        removeAllListeners: (channel: string) => void
      }
    }
    api: API
    EditContext: boolean
  }
}

export const validChannels = [
  'search-threads',
  'show-message-context-menu',
  'show-thread-context-menu',
  'tool-approval',
  'source'
] as const

export type ValidChannel = (typeof validChannels)[number]
