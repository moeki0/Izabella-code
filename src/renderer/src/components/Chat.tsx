import { useCallback, useEffect, useState } from 'react'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import ReactCodeMirror, { EditorView } from '@uiw/react-codemirror'
import { FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router'
import { Tool } from './Tools'
import { Header } from './Header'
import type { Mermaid } from 'mermaid'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import Messages from './Messages'
import MessageSearch from './MessageSearch'
import { SettingsSidebar } from './SettingsSidebar'
import { ToolsSidebar } from './ToolsSidebar'
import { ArtifactSidebar } from './ArtifactSidebar'
import { useIntl } from '../lib/locale'
import { cleanSearchQuery } from '../lib/utils'
import 'highlight.js/styles/dracula.css'

export type Message = {
  id?: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
  sources?: string
  metadata?: string
  open?: boolean
  created_at?: string
  updated_at?: string
}

export interface ChatInitializationDeps {
  init: () => Promise<{ title: string; messages: Array<Message> }>
  getTools: () => Promise<Array<Tool>>
}

export interface ChatCommunicationDeps {
  send: (input: string, isRetry: boolean) => void
  link: (href: string) => void
  interrupt: () => void
}

export interface ChatEventDeps {
  registerStreamListener: (callback: (chunk: string) => void) => () => void
  registerToolCallListener: (
    callback: (content: { toolName: string; args: string }, pending: boolean) => void
  ) => () => void
  registerStepFinishListener: (callback: (id: string) => void) => () => void
  registerMessageSavedListener: (
    callback: (id: string, messageInfo?: { theme?: string; created_at?: string }) => void
  ) => () => void
  registerFinishListener: (callback: () => void) => () => void
  registerErrorListener: (callback: (chunk: string) => void) => () => void
  registerToolResultListener: (
    callback: (content: { toolName: string; args: string }) => void
  ) => () => void
  registerTitleListener: (callback: (chunk: string) => void) => () => void
  registerNewThreadListener: (callback: () => void) => () => void
  registerRetryListener: (callback: (error: unknown) => void) => () => void
  registerSourceListener: (
    callback: (content: { sources: Array<Record<string, unknown>>; isPartial: boolean }) => void
  ) => () => void
  registerKnowledgeSavedListener: (callback: (data: { ids: string[] }) => void) => () => void
  registerMemoryUpdatedListener: (callback: (data: { success: boolean }) => void) => () => void
  registerUpdateContentListener: (callback: (content: string) => void) => () => void
}

export interface ChatUtilityDeps {
  randomUUID: () => string
  showMessageContextMenu: (text: string, messageId?: string, isAssistantMessage?: boolean) => void
  mermaid: Mermaid
  hljs: typeof hljs
}

export interface ChatProps {
  init: () => Promise<{ title: string; messages: Array<Message> }>
  send: (input: string, isRetry: boolean) => void
  getTools: () => Promise<Array<Tool>>
  getEnabledTools?: () => Promise<Array<ToolWithEnabled>>
  updateToolEnabled?: (toolName: string, enabled: boolean) => Promise<{ success: boolean }>
  link: (href: string) => void
  interrupt: () => void
  randomUUID: () => string
  registerSearchQueryListener: (
    callback: (data: { originalQuery: string; optimizedQuery: string }) => void
  ) => () => void
  registerStartSearchListener: (
    callback: (data: { prompt: string; status: string }) => void
  ) => () => void
  registerSearchResultListener: (
    callback: (data: { results: Array<Record<string, unknown>>; query: string }) => void
  ) => () => void
  registerKnowledgeSavedListener: (callback: (data: { ids: string[] }) => void) => () => void
  registerMemoryUpdatedListener: (callback: (data: { success: boolean }) => void) => () => void
  registerStreamListener: (callback: (chunk: string) => void) => () => void
  registerToolCallListener: (
    callback: (content: { toolName: string; args: string }, pending: boolean) => void
  ) => () => void
  registerStepFinishListener: (callback: (id: string) => void) => () => void
  registerMessageSavedListener: (
    callback: (id: string, messageInfo?: { theme?: string; created_at?: string }) => void
  ) => () => void
  registerFinishListener: (callback: () => void) => () => void
  registerErrorListener: (callback: (chunk: string) => void) => () => void
  registerToolResultListener: (
    callback: (content: { toolName: string; args: string }) => void
  ) => () => void
  registerUpdateContentListener: (callback: (content: string) => void) => () => void
  registerTitleListener: (callback: (chunk: string) => void) => () => void
  registerInterruptListener: (callback: () => void) => () => void
  registerNewThreadListener: (callback: () => void) => () => void
  registerRetryListener: (callback: (error: unknown) => void) => () => void
  registerSourceListener: (
    callback: (content: { sources: Array<Record<string, unknown>>; isPartial: boolean }) => void
  ) => () => void
  showMessageContextMenu: (text: string, messageId?: string, isAssistantMessage?: boolean) => void
  mermaidInit: typeof mermaid.initialize
  mermaidRun: typeof mermaid.run
  highlightAll: typeof hljs.highlightAll
  approveToolCall: (approved: boolean) => void

  setComponentId?: (componentId: string) => void
  initialSettingsSidebarOpen?: boolean
}

function Chat({
  init,
  send,
  link,
  registerStreamListener,
  registerToolCallListener,
  registerStepFinishListener,
  registerFinishListener,
  registerErrorListener,
  registerToolResultListener,
  registerInterruptListener,
  registerMessageSavedListener,
  registerKnowledgeSavedListener,
  registerMemoryUpdatedListener,
  registerTitleListener,
  registerNewThreadListener,
  registerRetryListener,
  registerSourceListener,
  registerStartSearchListener,
  registerSearchResultListener,
  showMessageContextMenu,
  mermaidInit,
  mermaidRun,
  highlightAll,
  interrupt,
  registerSearchQueryListener,
  initialSettingsSidebarOpen
}: ChatProps): React.JSX.Element {
  const navigate = useNavigate()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<Message>>([])
  const [originalMessages, setOriginalMessages] = useState<Array<Message>>([])
  const [title, setTitle] = useState('')
  const [startedAt, setStartedAt] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 保存されたナレッジIDのリストは通知コンポーネントで管理するように変更
  // const [savedKnowledgeIds, setSavedKnowledgeIds] = useState<string[]>([])

  const [, setPendingTool] = useState<{
    toolName: string
    args: string
  } | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  // Sidebar states
  const [isSearchSidebarOpen, setIsSearchSidebarOpen] = useState(false)
  const [isKnowledgeSidebarOpen, setIsKnowledgeSidebarOpen] = useState(false)
  const [isMemorySidebarOpen, setIsMemorySidebarOpen] = useState(false)
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false)
  const [isToolsSidebarOpen, setIsToolsSidebarOpen] = useState(false)
  const [isArtifactSidebarOpen, setIsArtifactSidebarOpen] = useState(false)

  const [isShowingSearchResult, setIsShowingSearchResult] = useState(false)
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('')
  // Used in the search query display and sidebar toggle
  const [, setOptimizedSearchQuery] = useState<string>('')
  // Indicates if a search operation is currently in progress
  const [isSearching, setIsSearching] = useState(false)
  // 最新のテーマを保持する状態
  const [currentTheme, setCurrentTheme] = useState<string>('')
  // 最新メッセージの日付
  const [latestMessageDate, setLatestMessageDate] = useState<string>('')

  // Calculate if any sidebar is open
  const isSidebarOpen =
    isSearchSidebarOpen ||
    isKnowledgeSidebarOpen ||
    isMemorySidebarOpen ||
    isSettingsSidebarOpen ||
    isToolsSidebarOpen ||
    isArtifactSidebarOpen

  useEffect(() => {
    setIsSettingsSidebarOpen(!!initialSettingsSidebarOpen)
  }, [initialSettingsSidebarOpen])

  useEffect(() => {
    const unsubscribe = registerNewThreadListener(() => {
      navigate('/')
    })

    // Add listener for message deletion
    const handleMessageDeleted = (_, messageId: string): void => {
      if (!messageId) return

      window.api.deleteMessage(messageId).then(() => {
        setMessages((prevMessages) => prevMessages.filter((message) => message.id !== messageId))
      })
    }

    // Add message deleted listener if ipcRenderer is available (in real app, not in tests)
    const removeMessageDeletedListener = window.electron?.ipcRenderer?.on
      ? window.electron.ipcRenderer.on('message-deleted', handleMessageDeleted)
      : undefined

    return () => {
      unsubscribe()
      if (window.electron?.ipcRenderer?.removeListener && removeMessageDeletedListener) {
        window.electron.ipcRenderer.removeListener('message-deleted', handleMessageDeleted)
      }
    }
  }, [navigate, registerNewThreadListener])

  useEffect(() => {
    init().then(({ title, messages: m }) => {
      setInitialized(true)
      setMessages(m)
      setOriginalMessages(m) // オリジナルのメッセージを保存
      setTitle(title)

      // 初期メッセージがある場合は、最新のテーマと日付を直接計算
      if (m.length > 0) {
        const { theme, date } = getLatestThemeAndDate(m)
        if (theme) {
          setCurrentTheme(theme)
        }
        if (date) {
          setLatestMessageDate(date)
        }
      }

      setTimeout(() => {
        hljs.highlightAll()
        mermaidInit({ startOnLoad: false })
        mermaidRun({
          querySelector: '.language-mermaid'
        })
        const main = document.querySelector('.messages')
        let height = 0

        document.querySelectorAll('.prompt-wrapper').forEach((prompt) => {
          height += prompt.getBoundingClientRect().height
        })
        if (main && typeof main.scroll === 'function') {
          main.scroll({
            top: height + 400
          })
        }
      }, 1)
    })
  }, [init, mermaidInit, mermaidRun])

  useEffect(() => {
    const unsubscribeStartSearch = registerStartSearchListener(() => {
      // Set searching state to true when search starts
      setIsSearching(true)
    })

    const unsubscribeStream = registerStreamListener((chunk) => {
      setLoading(false)
      // アシスタントの応答開始時に検索中フラグをリセット
      setIsSearching(false)
      setMessages((prev) => {
        let newPrev = prev
        if (prev.length === 0 || prev[prev.length - 1].role !== 'assistant') {
          newPrev = [...prev, { role: 'assistant', content: '' }]
        }
        const updatedMessages = newPrev.map((message, i) => {
          if (i === newPrev.length - 1) {
            return { ...message, content: (message.content || '') + chunk }
          }
          return message
        })

        // 検索結果表示中でない場合はオリジナルメッセージも更新
        if (!isShowingSearchResult) {
          setOriginalMessages(updatedMessages)
        }

        return updatedMessages
      })
    })

    const unsubscribelInterrupt = registerInterruptListener(() => {
      setRunning(false)
      setIsSearching(false)
    })

    const unsubscribeToolCall = registerToolCallListener((content, pending = true) => {
      if (pending) {
        setPendingTool(content)
      }
      // ナレッジ検索ツール以外のツール呼び出し時は検索中フラグをリセット
      if (content.toolName !== 'start_search' && content.toolName !== 'knowledge_search') {
        setIsSearching(false)
      }
      setMessages((prev) => {
        const updatedMessages = [
          ...prev,
          {
            role: 'tool',
            tool_name: content.toolName,
            tool_req: JSON.stringify(content.args, null, 2),
            open: true
          }
        ]

        // 検索結果表示中でない場合はオリジナルメッセージも更新
        if (!isShowingSearchResult) {
          setOriginalMessages(updatedMessages)
        }

        return updatedMessages
      })
      setLoading(true)
    })

    const unsubscribeStepFinish = registerStepFinishListener((id: string) => {
      setMessages((prev) => {
        return prev.map((m, index) => {
          if (index === prev.length - 1) {
            return { ...m, id }
          } else {
            return m
          }
        })
      })
      hljs.highlightAll()
    })

    const unsubscribeMessageSaved = registerMessageSavedListener(
      (id: string, messageInfo?: { theme?: string; created_at?: string }) => {
        // メッセージIDを更新
        setMessages((prev) => {
          const updatedMessages = prev.map((m, index) => {
            if (index === prev.length - 1) {
              return { ...m, id }
            } else {
              return m
            }
          })
          return updatedMessages
        })

        // バックエンドから送られてきたテーマと日付情報を設定
        console.log('メッセージ保存イベント受信:', id, messageInfo)
        if (messageInfo) {
          if (messageInfo.theme) {
            console.log('テーマを設定:', messageInfo.theme)
            setCurrentTheme(messageInfo.theme)
          }

          if (messageInfo.created_at) {
            // 日本語形式に変換（より読みやすく）
            const date = new Date(messageInfo.created_at)

            // 年月日と時刻を組み合わせた読みやすいフォーマット
            const formattedDate = `${date.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })} ${date.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit'
            })}`

            console.log('日付を設定:', formattedDate)
            setLatestMessageDate(formattedDate)
          }
        }
      }
    )

    const unsubscribeFinish = registerFinishListener(() => {
      setRunning(false)
      mermaid.run({
        querySelector: '.language-mermaid'
      })
    })

    const unsubscribeRetry = registerRetryListener((error) => {
      const userMessages = messages.filter((m) => m.role === 'user')
      const lastUserMessage = userMessages[userMessages.length - 1]
      setMessages((pre) => [...pre, { role: 'tool', tool_name: 'Error', tool_res: String(error) }])
      send(
        `This error occurred on the previous run. Please avoid this and continue processing:${error}\n${lastUserMessage.content}`,
        true
      )
      return
    })

    const unsubscribeError = registerErrorListener((chunk) => {
      setError(chunk)
      setLoading(false)
    })

    const unsubscribeToolResult = registerToolResultListener((content) => {
      setMessages((prev) => {
        const updatedMessages = prev.map((message, i) => {
          if (i === prev.length - 1) {
            return {
              ...message,
              tool_res: JSON.stringify(content, null, 2),
              open: false
            }
          }
          return { ...message, open: false }
        })

        // 検索結果表示中でない場合はオリジナルメッセージも更新
        if (!isShowingSearchResult) {
          setOriginalMessages(updatedMessages)
        }

        return updatedMessages
      })
      setLoading(true)
    })

    const unsubscribeTitle = registerTitleListener((chunk) => {
      if (!chunk) {
        return
      }
      if (title?.length === 0) {
        setStartedAt(new Date())
      }
      setTitle(chunk)
    })

    const unsubscribeSource = registerSourceListener((content) => {
      if (!content.isPartial) {
        setMessages((prev) => {
          return prev.map((message, i) => {
            if (i === prev.length - 1 && message.role === 'assistant') {
              return {
                ...message,
                sources: JSON.stringify(content.sources)
              }
            }
            return message
          })
        })
      }
    })

    return () => {
      unsubscribeStream()
      unsubscribeToolCall()
      unsubscribeStepFinish()
      unsubscribeFinish()
      unsubscribeError()
      unsubscribeToolResult()
      unsubscribeTitle()
      unsubscribeRetry()
      unsubscribeSource()
      unsubscribelInterrupt()
      unsubscribeMessageSaved()
      unsubscribeStartSearch()
    }
  }, [
    messages,
    navigate,
    setMessages,
    title,
    highlightAll,
    registerStreamListener,
    registerToolCallListener,
    registerStepFinishListener,
    registerFinishListener,
    registerErrorListener,
    registerToolResultListener,
    registerTitleListener,
    registerRetryListener,
    registerSourceListener,
    send,
    registerInterruptListener,
    registerMessageSavedListener,
    registerKnowledgeSavedListener,
    registerMemoryUpdatedListener,
    isShowingSearchResult,
    registerSearchQueryListener,
    registerStartSearchListener,
    registerSearchResultListener,
    originalMessages
  ])

  useEffect(() => {
    const aElements = document.querySelectorAll('a')
    const handleClick = (e: MouseEvent): void => {
      const el = e.currentTarget as HTMLAnchorElement
      link(el.href)
      e.preventDefault()
    }

    aElements.forEach((el) => {
      el.addEventListener('click', handleClick)
    })

    return () => {
      aElements.forEach((el) => {
        el.removeEventListener('click', handleClick)
      })
    }
  }, [messages, link])

  const sendMessage = useCallback((): void => {
    send(input, false)
    setInput('')
    setMessages((pre) => {
      const newMessages = [...pre, { role: 'user', content: input }]
      // 検索結果表示中でない場合はオリジナルメッセージも更新
      if (!isShowingSearchResult) {
        setOriginalMessages(newMessages)
      }
      return newMessages
    })
    const lastPrompt = document.querySelector('.prompt:last-child')
    setLoading(true)
    setRunning(true)
    // メッセージ送信時に検索中フラグをリセット
    setIsSearching(false)
    if (lastPrompt) {
      setTimeout(() => {
        const main = document.querySelector('.messages')
        let height = 0

        document.querySelectorAll('.prompt-wrapper').forEach((prompt) => {
          height += prompt.getBoundingClientRect().height
        })
        if (main) {
          if (typeof main.scroll === 'function') {
            main.scroll({
              top: height + 400,
              behavior: 'smooth'
            })
          }
        }
      }, 1)
    }
  }, [send, input, isShowingSearchResult])

  const handleToolClick = (i: number): void => {
    setMessages((prev) => {
      return prev.map((m, j) => {
        if (i === j) {
          return { ...m, open: !m.open }
        }
        return m
      })
    })
  }

  const handleKeyDown = async (e: React.KeyboardEvent): Promise<void> => {
    if (
      e.metaKey &&
      e.key === 'Enter' &&
      initialized &&
      !(!running && input.replaceAll(/[\s\n\r]+/g, '').length === 0)
    ) {
      e.preventDefault()

      if (running) {
        interrupt()
        setTimeout(() => {
          sendMessage()
        }, 100)
      } else {
        sendMessage()
      }
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', () => {
      setIsScrolled(true)
    })
  }, [])

  // メッセージコンテキストを表示する
  const handleShowMessageContext = useCallback(
    async (messageId: string, searchQuery?: string) => {
      try {
        // メッセージの前後20件を取得
        const result = await window.api.getMessageContext(messageId, 20)

        if (result.success && result.data && result.data.length > 0) {
          // 検索結果表示中フラグをセット
          setIsShowingSearchResult(true)

          // 検索クエリを保存
          if (searchQuery) {
            // 直接引数から検索クエリを使用
            setCurrentSearchQuery(searchQuery)
          } else {
            // 引数がない場合は入力欄から検索クエリを取得（後方互換性）
            const searchInputElement = document.querySelector(
              '.message-search input'
            ) as HTMLInputElement
            if (searchInputElement && searchInputElement.value) {
              // クエリからタイムスタンプを除去
              const cleanedQuery = cleanSearchQuery(searchInputElement.value)
              setCurrentSearchQuery(cleanedQuery)
            }
          }

          // reasoningブロックを含むメッセージを除外
          const filteredMessages = result.data.filter((message) => {
            // contentがnullの場合はフィルタリングしない
            if (!message.content) return true

            // ```reasoning```ブロックを含むメッセージを除外
            return !message.content.includes('```reasoning')
          })

          // 取得したメッセージで現在のメッセージリストを置き換え
          setMessages(filteredMessages)

          // 少し待ってから選択したメッセージにスクロール
          setTimeout(() => {
            const element = document.getElementById(`message-${messageId}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              element.classList.add('message-highlight')
              setTimeout(() => {
                element.classList.remove('message-highlight')
              }, 2000)
            }
          }, 100)
        } else {
          console.error('Failed to get message context:', result.error)
        }
      } catch (error) {
        console.error('Error showing message context:', error)
      }
    },
    [setMessages, setIsShowingSearchResult, setCurrentSearchQuery]
  )

  // サーチサイドバーの表示・非表示を切り替える
  const toggleSearchSidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsToolsSidebarOpen(false)

    setIsSearchSidebarOpen((prevState) => {
      const newState = !prevState

      // サイドバーを閉じる場合、元のメッセージに戻す
      if (!newState && isShowingSearchResult) {
        setMessages(originalMessages)
        setIsShowingSearchResult(false)
        setCurrentSearchQuery('') // 検索クエリをクリア
        setOptimizedSearchQuery('') // 最適化済みクエリをクリア

        // メッセージリストの一番下までスクロール
        setTimeout(() => {
          const main = document.querySelector('.messages')
          let height = 0

          document.querySelectorAll('.prompt-wrapper').forEach((prompt) => {
            height += prompt.getBoundingClientRect().height
          })
          if (main) {
            main.scroll({
              top: height + 400
            })
          }
        }, 100)
      }

      return newState
    })
  }, [isShowingSearchResult, originalMessages])

  // Knowledge サイドバーの表示・非表示を切り替える
  const toggleKnowledgeSidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsSearchSidebarOpen(false)
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsToolsSidebarOpen(false)

    setIsKnowledgeSidebarOpen((prev) => !prev)
  }, [])

  // Memory サイドバーの表示・非表示を切り替える
  const toggleMemorySidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsSearchSidebarOpen(false)
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsToolsSidebarOpen(false)

    setIsMemorySidebarOpen((prev) => !prev)
  }, [])

  // Settings サイドバーの表示・非表示を切り替える
  const toggleSettingsSidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsSearchSidebarOpen(false)
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsToolsSidebarOpen(false)

    setIsSettingsSidebarOpen((prev) => !prev)
  }, [])

  // Tools サイドバーの表示・非表示を切り替える
  const toggleToolsSidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsSearchSidebarOpen(false)
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsArtifactSidebarOpen(false)

    setIsToolsSidebarOpen((prev) => !prev)
  }, [])

  // Artifact サイドバーの表示・非表示を切り替える
  const toggleArtifactSidebar = useCallback(() => {
    // 他のサイドバーを閉じる
    setIsSearchSidebarOpen(false)
    setIsKnowledgeSidebarOpen(false)
    setIsMemorySidebarOpen(false)
    setIsSettingsSidebarOpen(false)
    setIsToolsSidebarOpen(false)

    setIsArtifactSidebarOpen((prev) => !prev)
  }, [])

  const intl = useIntl()

  // メッセージリストから最新のテーマと日付を取得する関数
  const getLatestThemeAndDate = (
    messageList: Array<Message>
  ): { theme?: string; date?: string } => {
    // メッセージを作成日時の降順（最新順）でソート
    const sortedMessages = [...messageList].sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    let latestTheme: string | undefined = undefined
    let latestDate: string | undefined = undefined

    // 最新メッセージの日付を取得
    if (sortedMessages.length > 0 && sortedMessages[0].created_at) {
      const date = new Date(sortedMessages[0].created_at)
      latestDate = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // メタデータを持つメッセージを探す
    for (const message of sortedMessages) {
      if (message.metadata) {
        try {
          const metadata = JSON.parse(message.metadata)
          if (metadata && metadata.theme) {
            latestTheme = metadata.theme
            break
          }
        } catch {
          // JSONパースエラーは無視
        }
      }
    }

    return { theme: latestTheme, date: latestDate }
  }

  return (
    <>
      <main className={isSidebarOpen ? 'main-with-sidebar' : ''}>
        <div className={`main-content ${isSidebarOpen ? 'main-content-with-sidebar' : ''}`}>
          <Header
            title={title}
            startedAt={startedAt!}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            className={isScrolled ? 'header-scrolled' : ''}
            toggleSearchSidebar={toggleSearchSidebar}
            isSearchSidebarOpen={isSearchSidebarOpen}
            toggleKnowledgeSidebar={toggleKnowledgeSidebar}
            isKnowledgeSidebarOpen={isKnowledgeSidebarOpen}
            toggleMemorySidebar={toggleMemorySidebar}
            isMemorySidebarOpen={isMemorySidebarOpen}
            toggleSettingsSidebar={toggleSettingsSidebar}
            isSettingsSidebarOpen={isSettingsSidebarOpen}
            toggleToolsSidebar={toggleToolsSidebar}
            isToolsSidebarOpen={isToolsSidebarOpen}
            toggleArtifactSidebar={toggleArtifactSidebar}
            isArtifactSidebarOpen={isArtifactSidebarOpen}
            currentTheme={currentTheme}
            latestMessageDate={latestMessageDate}
          />
          <Messages
            messages={messages}
            showMessageContextMenu={showMessageContextMenu}
            loading={loading}
            running={running}
            handleToolClick={handleToolClick}
            interrupt={interrupt}
            searchQuery={currentSearchQuery}
            isSearching={isSearching}
          />
          <div className={`user-container ${isSidebarOpen ? 'user-container-with-sidebar' : ''}`}>
            <div className="user">
              <ReactCodeMirror
                value={input}
                autoFocus={true}
                extensions={[
                  markdown({ base: markdownLanguage, codeLanguages: languages }),
                  EditorView.lineWrapping
                ]}
                onChange={(value) => setInput(value)}
                onKeyDown={handleKeyDown}
                placeholder={intl.formatMessage({ id: 'askMeAnything' })}
              />
              {messages.length === 0 && input.length > 0 && input.length < 40 && (
                <div className="send-hint">{intl.formatMessage({ id: 'cmdEnterToSend' })}</div>
              )}
            </div>
          </div>
        </div>
      </main>
      {isSearchSidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">{intl.formatMessage({ id: 'search' })}</div>
          </div>
          <MessageSearch
            onMessageSelect={(messageId, query) => handleShowMessageContext(messageId, query)}
          />
        </div>
      )}
      <SettingsSidebar isOpen={isSettingsSidebarOpen} onClose={toggleSettingsSidebar} />
      <ToolsSidebar isOpen={isToolsSidebarOpen} onClose={toggleToolsSidebar} />
      <ArtifactSidebar isOpen={isArtifactSidebarOpen} onClose={toggleArtifactSidebar} />
      <div className="banner">
        {error && (
          <div className="error">
            <div className="error-text">{error}</div>
            <FiX color="white" data-testid="close-error" onClick={() => setError(null)} size={20} />
          </div>
        )}
      </div>
    </>
  )
}

export default Chat
