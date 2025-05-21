import type { ElectronAPI } from '@electron-toolkit/preload'
import { Thread } from '@renderer/components/Threads'
import { Message } from '@renderer/components/Chat'
import { Tool, ToolWithEnabled } from '@renderer/components/Tools'
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
  getEnabledTools: () => Promise<Array<ToolWithEnabled>>
  updateToolEnabled: (toolName: string, enabled: boolean) => Promise<{ success: boolean }>
  getSearchGrounding: () => Promise<{ enabled: boolean }>
  updateSearchGrounding: (enabled: boolean) => Promise<{ success: boolean }>
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
  updateKnowledgeIndexContent: (content: string) => Promise<boolean>
  getLocale: () => Promise<string>
  setLocale: (locale: string) => Promise<string>

  // アーティファクト関連API
  createKnowledge: (
    text: string,
    id?: string
  ) => Promise<{ action: string; id: string; title: string }>
  updateKnowledge: (
    text: string,
    id: string,
    targetId: string
  ) => Promise<{ action: string; id: string; originalId: string }>
  deleteKnowledge: (ids: string[]) => Promise<{ deleted: string[]; action: string }>
  searchKnowledge: (
    query: string,
    limit?: number
  ) => Promise<{ results: Array<{ content: string; id: string; similarity: number }> }>
  reindexKnowledge: () => Promise<{ success: boolean; reindexedCount: number }>
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
  'message-deleted',
  'search-query',
  'start-search',
  'search-result',
  'knowledge-saved',
  'memory-updated',
  'message-saved',
  'note-created',
  'knowledge-reindexed'
] as const

export type ValidChannel = (typeof validChannels)[number]
