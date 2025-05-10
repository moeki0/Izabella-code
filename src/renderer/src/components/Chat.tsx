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
import 'highlight.js/styles/dracula.css'

export type Message = {
  id?: string
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
  sources?: string
  open?: boolean
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
  registerToolCallListener: (callback: (content: string, pending: boolean) => void) => () => void
  registerStepFinishListener: (callback: (id: string) => void) => () => void
  registerMessageSavedListener: (callback: (id: string) => void) => () => void
  registerFinishListener: (callback: () => void) => () => void
  registerErrorListener: (callback: (chunk: string) => void) => () => void
  registerToolResultListener: (callback: (content: string) => void) => () => void
  registerTitleListener: (callback: (chunk: string) => void) => () => void
  registerNewThreadListener: (callback: () => void) => () => void
  registerRetryListener: (callback: (error: unknown) => void) => () => void
  registerSourceListener: (
    callback: (content: { sources: Array<Record<string, unknown>>; isPartial: boolean }) => void
  ) => () => void
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
  link: (href: string) => void
  interrupt: () => void
  randomUUID: () => string
  registerStreamListener: (callback: (chunk: string) => void) => () => void
  registerToolCallListener: (
    callback: (content: { toolName: string; args: string }, pending: boolean) => void
  ) => () => void
  registerStepFinishListener: (callback: (id: string) => void) => () => void
  registerMessageSavedListener: (callback: (id: string) => void) => () => void
  registerFinishListener: (callback: () => void) => () => void
  registerErrorListener: (callback: (chunk: string) => void) => () => void
  registerToolResultListener: (
    callback: (content: { toolName: string; args: string }) => void
  ) => () => void
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
  registerTitleListener,
  registerNewThreadListener,
  registerRetryListener,
  registerSourceListener,
  showMessageContextMenu,
  mermaidInit,
  mermaidRun,
  highlightAll,
  approveToolCall,
  interrupt
}: ChatProps): React.JSX.Element {
  const navigate = useNavigate()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<Message>>([])
  const [title, setTitle] = useState('')
  const [startedAt, setStartedAt] = useState<Date | null>(new Date())
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pendingTool, setPendingTool] = useState<{
    toolName: string
    args: string
  } | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

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
      setTitle(title)
      setTimeout(() => {
        hljs.highlightAll()
        mermaidInit({ startOnLoad: false })
        mermaidRun({
          querySelector: '.language-mermaid'
        })
        try {
          const messagesElement = document.querySelector('.messages')
          if (messagesElement) {
            const height = messagesElement.getBoundingClientRect().height
            window.scroll({
              top: height - window.innerHeight + 400
            })
          }
        } catch (e) {
          console.warn(e)
        }
      }, 1)
    })
  }, [init, mermaidInit, mermaidRun])

  useEffect(() => {
    const unsubscribeStream = registerStreamListener((chunk) => {
      setLoading(false)
      setMessages((prev) => {
        if (prev.length === 0 || prev[prev.length - 1].role !== 'assistant') {
          prev = [...prev, { role: 'assistant', content: '' }]
        }
        return prev.map((message, i) => {
          if (i === prev.length - 1) {
            return { ...message, content: (message.content || '') + chunk }
          }
          return message
        })
      })
    })

    const unsubscribelInterrupt = registerInterruptListener(() => {
      setRunning(false)
    })

    const unsubscribeToolCall = registerToolCallListener((content, pending = true) => {
      if (pending) {
        setPendingTool(content)
      }
      setMessages((prev) => {
        return [
          ...prev,
          {
            role: 'tool',
            tool_name: content.toolName,
            tool_req: JSON.stringify(content.args, null, 2),
            open: true
          }
        ]
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

    const unsubscribeMessageSaved = registerMessageSavedListener((id: string) => {
      setMessages((prev) => {
        return prev.map((m, index) => {
          if (index === prev.length - 1) {
            return { ...m, id }
          } else {
            return m
          }
        })
      })
    })

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
        return prev.map((message, i) => {
          if (i === prev.length - 1) {
            return {
              ...message,
              tool_res: JSON.stringify(content, null, 2),
              open: false
            }
          }
          return { ...message, open: false }
        })
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
    registerMessageSavedListener
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
    setMessages((pre) => [...pre, { role: 'user', content: input }])
    const lastPrompt = document.querySelector('.prompt:last-child')
    setLoading(true)
    setRunning(true)
    if (lastPrompt) {
      setTimeout(() => {
        try {
          const messagesInnerElement = document.querySelector('.messages-inner')
          if (messagesInnerElement) {
            const height = messagesInnerElement.getBoundingClientRect().height
            window.scroll({
              top: height - 54,
              behavior: 'smooth'
            })
          }
        } catch (e) {
          console.warn(e)
        }
      }, 1)
    }
  }, [send, input])

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
      sendMessage()
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', () => {
      setIsScrolled(true)
    })
  }, [])

  return (
    <>
      <main>
        <Header
          title={title}
          startedAt={startedAt!}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          className={isScrolled ? 'header-scrolled' : ''}
        />
        <Messages
          messages={messages}
          showMessageContextMenu={showMessageContextMenu}
          loading={loading}
          running={running}
          handleToolClick={handleToolClick}
          interrupt={interrupt}
        />
        <div className="user-container">
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
              placeholder="なんでも聞いてください"
            />
          </div>
        </div>
      </main>
      <div className="banner">
        {error && (
          <div className="error">
            <div className="error-text">{error}</div>
            <FiX color="white" data-testid="close-error" onClick={() => setError(null)} size={20} />
          </div>
        )}
        {pendingTool && (
          <div className="tool-confirmation">
            <div className="tool-confirmation-text">
              Do you want to execute {pendingTool.toolName}?
            </div>
            <div className="tool-confirmation-buttons">
              <button
                onClick={() => {
                  approveToolCall(false)
                  setPendingTool(null)
                }}
              >
                No
              </button>
              <button
                onClick={() => {
                  approveToolCall(true)
                  setPendingTool(null)
                }}
              >
                Yes
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Chat
