import { useCallback, useEffect, useState } from 'react'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import ReactCodeMirror, { EditorView } from '@uiw/react-codemirror'
import { FiArrowUp, FiSquare, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router'
import { Tool } from './Tools'
import { Header } from './Header'
import type { Mermaid } from 'mermaid'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import Messages from './Messages'
import { Menu } from './Menu'
import { WebSearchToggle } from './WebSearchToggle'
import 'highlight.js/styles/dracula.css'

export type Message = {
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
  send: (input: string, resourceId: string, threadId: string, isRetry: boolean) => void
  link: (href: string) => void
  interrupt: () => void
}

export interface ChatEventDeps {
  registerStreamListener: (callback: (chunk: string) => void) => () => void
  registerToolCallListener: (callback: (content: string, pending: boolean) => void) => () => void
  registerStepFinishListener: (callback: () => void) => () => void
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
  showMessageContextMenu: (text: string) => void
  mermaid: Mermaid
  hljs: typeof hljs
}

export interface ChatProps {
  init: (threadId: string) => Promise<{ title: string; messages: Array<Message> }>
  send: (input: string, resourceId: string, threadId: string, isRetry: boolean) => void
  getTools: () => Promise<Array<Tool>>
  link: (href: string) => void
  interrupt: () => void
  randomUUID: () => string
  registerStreamListener: (callback: (chunk: string) => void) => () => void
  registerToolCallListener: (
    callback: (content: { toolName: string; args: string }, pending: boolean) => void
  ) => () => void
  registerStepFinishListener: (callback: () => void) => () => void
  registerFinishListener: (callback: () => void) => () => void
  registerErrorListener: (callback: (chunk: string) => void) => () => void
  registerToolResultListener: (
    callback: (content: { toolName: string; args: string }) => void
  ) => () => void
  registerTitleListener: (callback: (chunk: string) => void) => () => void
  registerNewThreadListener: (callback: () => void) => () => void
  registerRetryListener: (callback: (error) => void) => () => void
  registerSourceListener: (
    callback: (content: { sources: Array<Record<string, unknown>>; isPartial: boolean }) => void
  ) => () => void
  showMessageContextMenu: (text: string) => void
  mermaidInit: typeof mermaid.initialize
  mermaidRun: typeof mermaid.run
  highlightAll: typeof hljs.highlightAll
  approveToolCall: (approved: boolean) => void
  setComponentId?: (componentId: string) => void
}

function Chat({
  init,
  send,
  getTools,
  link,
  interrupt,
  registerStreamListener,
  registerToolCallListener,
  registerStepFinishListener,
  registerFinishListener,
  registerErrorListener,
  registerToolResultListener,
  registerTitleListener,
  registerNewThreadListener,
  registerRetryListener,
  registerSourceListener,
  showMessageContextMenu,
  mermaidInit,
  mermaidRun,
  highlightAll,
  approveToolCall
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSources, setCurrentSources] = useState<Array<Record<string, unknown>>>([])
  const [pendingTool, setPendingTool] = useState<{
    toolName: string
    args: string
  } | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const unsubscribe = registerNewThreadListener(() => {
      navigate('/')
    })
    return unsubscribe
  }, [navigate, registerNewThreadListener])

  useEffect(() => {
    mermaidInit({ startOnLoad: false })
    mermaidRun({
      querySelector: '.language-mermaid'
    })
  }, [mermaidInit, mermaidRun])

  useEffect(() => {
    init('ChatZen').then(({ title, messages: m }) => {
      setInitialized(true)
      setMessages(m)
      setTitle(title)
      setTimeout(() => {
        hljs.highlightAll()
        const main = document.querySelector('.messages')!
        let height = 0
        document.querySelectorAll('.prompt').forEach((prompt) => {
          height += prompt.getBoundingClientRect().height
        })
        if (main && 'scroll' in main) {
          main.scroll({ top: height })
        }
      }, 1)
    })
  }, [init])

  useEffect(() => {
    const unsubscribeStream = registerStreamListener((chunk) => {
      setLoading(false)
      setMessages((prev) => {
        if (prev[prev.length - 1].role !== 'assistant') {
          prev = [...prev, { role: 'assistant', content: '' }]
        }
        return prev.map((message, i) => {
          if (i === prev.length - 1) {
            return { ...message, content: message.content + chunk }
          }
          return message
        })
      })
    })

    const unsubscribeToolCall = registerToolCallListener((content, pending) => {
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

    const unsubscribeStepFinish = registerStepFinishListener(() => {
      hljs.highlightAll()
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
        'ChatZen',
        'ChatZen',
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
      setCurrentSources(content.sources)

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
    send
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
    send(input, 'ChatZen', 'ChatZen', false)
    setInput('')
    setMessages((pre) => [...pre, { role: 'user', content: input }])
    const lastPrompt = document.querySelector('.prompt:last-child')
    setLoading(true)
    setRunning(true)
    if (lastPrompt)
      setTimeout(() => {
        const main = document.querySelector('.messages')
        if (main && 'scroll' in main) {
          main.scroll({
            top: main.scrollTop + lastPrompt.getBoundingClientRect().bottom - 54,
            behavior: 'smooth'
          })
        }
      }, 1)
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

  const handleKeyDown = async (e): Promise<void> => {
    if (
      e.metaKey &&
      e.key === 'Enter' &&
      initialized &&
      !(!running && input.replaceAll(/[\s\n\r]+/g, '').length === 0)
    ) {
      sendMessage()
    }
  }

  return (
    <>
      <Header
        title={title}
        startedAt={startedAt!}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        className={isScrolled ? 'header-scrolled' : ''}
      />
      <main>
        <Messages
          onScroll={() => setIsScrolled(true)}
          messages={messages}
          showMessageContextMenu={showMessageContextMenu}
          loading={loading}
          handleToolClick={handleToolClick}
        />
        <Menu isOpen={isMenuOpen} getTools={getTools} />
      </main>
      <div className="banner">
        {!initialized && (
          <div className="tool-loading">
            <div className="tool-loader"></div>
            <div className="tool-loading-text">Loading tools...</div>
          </div>
        )}
        {error && (
          <div className="error">
            <div className="error-text">{error}</div>
            <FiX color="white" data-testid="close-error" onClick={() => setError(null)} />
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
                  approveToolCall(true)
                  setPendingTool(null)
                }}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  approveToolCall(false)
                  setPendingTool(null)
                }}
              >
                Deny
              </button>
            </div>
          </div>
        )}
      </div>
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
            placeholder="Ask anything"
          />
          <div className="user-footer">
            <WebSearchToggle />
            <button
              className="send"
              onClick={() => {
                if (running) {
                  interrupt()
                  setRunning(false)
                } else {
                  sendMessage()
                }
              }}
              aria-label={running ? 'interrupt' : 'send'}
              disabled={
                !initialized || (!running && input.replaceAll(/[\s\n\r]+/g, '').length === 0)
              }
            >
              {running ? <FiSquare color="white" /> : <FiArrowUp color="white" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Chat
