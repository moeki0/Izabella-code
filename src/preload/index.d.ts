import type { ElectronAPI } from '@electron-toolkit/preload'
import { Thread } from '@renderer/components/Threads'
import { Message } from '@renderer/components/Chat'
import { Tool } from '@renderer/components/Tools'
import { MessagesSearchResult } from '.'
import { SearchMessagesParams } from '../main/lib/message'

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
  send: (input: string, isRetry: boolean) => Promise<void>
  getConfig: (name: string) => Promise<unknown>
  setConfig: (name: string, input: unknown) => Promise<void>
  restartApp: () => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  searchMessages: (params: SearchMessagesParams) => Promise<MessagesSearchResult>
  getMessageContext: (
    messageId: string,
    count?: number
  ) => Promise<{
    success: boolean
    data: Array<Message> | null
    error: string | null
  }>
  summarize: () => Promise<Array<{ title: string; content: string }>>
  summarizeMemoryContent: () => Promise<Array<{ title: string; content: string }>>
  getMemoryContent: () => Promise<string>
  getKnowledgeIndexContent: () => Promise<string>
  updateKnowledgeIndexContent: (content: string) => Promise<boolean>
  getLocale: () => Promise<string>
  setLocale: (locale: string) => Promise<string>
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
  'source',
  'message-deleted'
] as const

export type ValidChannel = (typeof validChannels)[number]
