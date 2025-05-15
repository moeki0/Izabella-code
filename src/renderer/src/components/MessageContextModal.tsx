import React, { useEffect, useState } from 'react'
import { Message } from './Messages'
import { FiSearch, FiSmile, FiTool, FiX } from 'react-icons/fi'
import { useIntl } from '../lib/locale'
import orderBy from 'lodash/orderBy'
import HighlightedMarkdown from './HighlightedMarkdown'

type MessageContextModalProps = {
  messageId: string
  onClose: () => void
  searchQuery?: string
  showMessageContextMenu?: (text: string, messageId?: string, isAssistantMessage?: boolean) => void
}

const MessageContextModal: React.FC<MessageContextModalProps> = ({
  messageId,
  onClose,
  searchQuery,
  showMessageContextMenu
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intl = useIntl()

  useEffect(() => {
    const fetchMessageContext = async (): Promise<void> => {
      if (!messageId) return

      setIsLoading(true)
      try {
        const result = await window.api.getMessageContext(messageId, 20)

        if (result.success && result.data) {
          const filteredMessages = result.data.filter((message) => {
            if (!message.content) return true

            return !message.content.includes('```reasoning')
          })

          setMessages(filteredMessages)
        } else {
          setError(result.error || 'Failed to load message context')
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessageContext()
  }, [messageId])

  messages.findIndex((msg) => msg.id === messageId)

  const handleModalClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleContextMenu = (
    e: React.MouseEvent,
    text: string,
    msgId?: string,
    isAssistantMessage = false
  ): void => {
    if (showMessageContextMenu) {
      e.preventDefault()
      showMessageContextMenu(text, msgId, isAssistantMessage)
    }
  }

  return (
    <div className="message-context-modal-overlay" onClick={handleModalClick}>
      <div className="message-context-modal">
        <div className="message-context-modal-header">
          <h3>{intl.formatMessage({ id: 'messageContext' })}</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <FiX size={24} />
          </button>
        </div>

        <div className="message-context-modal-content">
          {isLoading ? (
            <div className="message-context-loading">
              <div className="spinner"></div>
              <p>{intl.formatMessage({ id: 'loadingMessages' })}</p>
            </div>
          ) : error ? (
            <div className="message-context-error">
              <p>{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="message-context-empty">
              <p>{intl.formatMessage({ id: 'noMessagesFound' })}</p>
            </div>
          ) : (
            <div className="messages-inner">
              {orderBy(messages, ['created_at']).map((message) => (
                <div
                  key={message.id}
                  className={`${message.id === messageId ? 'message-highlight' : ''} prompt-wrapper`}
                  id={`context-message-${message.id}`}
                >
                  <div
                    className={`prompt prompt-${message.role}`}
                    onContextMenu={(e) => {
                      handleContextMenu(
                        e,
                        message.content || '',
                        message.id,
                        message.role === 'assistant'
                      )
                    }}
                  >
                    {message.role === 'tool' && message.tool_name === 'search_knowledge' && (
                      <div className="knowledge">
                        <div className="knowledge-icon">
                          <FiSearch size={14} />
                        </div>
                        <div>
                          {message.tool_res
                            ? intl.formatMessage({ id: 'knowledgeFound' })
                            : intl.formatMessage({ id: 'searchingKnowledge' })}
                        </div>
                      </div>
                    )}
                    {message.role === 'tool' && message.tool_name === 'replace_memory' && (
                      <div className="knowledge">
                        <div className="knowledge-icon">
                          <FiSmile size={14} />
                        </div>
                        <div>
                          {message.tool_res
                            ? intl.formatMessage({ id: 'memorySaved' })
                            : intl.formatMessage({ id: 'updatingMemory' })}
                        </div>
                      </div>
                    )}
                    {message.role === 'tool' &&
                      message.tool_name !== 'upsert_knowledge' &&
                      message.tool_name !== 'search_knowledge' &&
                      message.tool_name !== 'update_knowledge_index' &&
                      message.tool_name !== 'replace_memory' && (
                        <div className="tool">
                          <div className="tool-name">
                            <div className="tool-name-text">
                              <FiTool color="#444" />
                              <div>{message.tool_name}</div>
                            </div>
                          </div>
                          <div className="tool-args">
                            <div>{intl.formatMessage({ id: 'request' })}</div>
                            <pre className="tool-args-code">{message.tool_req}</pre>
                          </div>
                          {message.tool_res && (
                            <div className="tool-response">
                              <div>{intl.formatMessage({ id: 'response' })}</div>
                              <code className="tool-response-code">
                                {message.tool_res.slice(0, 1000)}
                                {message.tool_res.length > 1000 ? '...' : ''}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    {message.role === 'assistant' && (
                      <>
                        <HighlightedMarkdown
                          content={message.content || ''}
                          searchQuery={searchQuery}
                        />
                        {message.sources && (
                          <div className="source-info">
                            <div className="source-info-content">
                              {(() => {
                                try {
                                  const sourceStr = message.sources
                                  if (!sourceStr) {
                                    return null
                                  }

                                  let sourceData: string
                                  try {
                                    sourceData = JSON.parse(sourceStr)
                                  } catch {
                                    return <div className="source-item">{sourceStr}</div>
                                  }

                                  if (Array.isArray(sourceData)) {
                                    const uniqueUrls = new Set()

                                    const renderedSources = sourceData
                                      .map((source) => {
                                        if (!source) return null

                                        const url = source.url

                                        const title = source.title

                                        if (url) {
                                          if (uniqueUrls.has(url)) {
                                            return null
                                          }

                                          uniqueUrls.add(url)
                                        }

                                        return (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="source-item"
                                            key={`source-${url}`}
                                          >
                                            <span className="source-title">{title}</span>
                                          </a>
                                        )
                                      })
                                      .filter(Boolean)

                                    if (renderedSources.length > 0) {
                                      return renderedSources
                                    }
                                  }
                                  return <div className="source-error">Unknown source format</div>
                                } catch (error) {
                                  console.error('Error rendering sources:', error)
                                  return <div className="source-error">Invalid source format</div>
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {message.role === 'user' && (
                      <div className="prompt-user-bubble">
                        <HighlightedMarkdown
                          content={message.content || ''}
                          searchQuery={searchQuery}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageContextModal
