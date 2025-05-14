import orderBy from 'lodash/orderBy'
import {
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiHardDrive,
  FiSearch,
  FiSmile,
  FiTool
} from 'react-icons/fi'
import { useIntl } from '../lib/locale'
import HighlightedMarkdown from './HighlightedMarkdown'

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
}

window.EditContext = false

function getDisplayableContent(content: string): string {
  if (!content) return ''

  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const jsonObj = JSON.parse(content.trim())
      if (jsonObj.content) {
        // JSONオブジェクトからのコンテンツは改行を明示的に削除
        return jsonObj.content.replace(/[\r\n]+/g, ' ')
      }
    } catch {
      // JSONパースに失敗した場合は、そのまま表示
    }
  }

  // 通常のテキストメッセージでも改行を正規化
  return content.replaceAll(/(\\r|\\n)/g, '\n')
}

function Messages({
  messages,
  showMessageContextMenu,
  running,
  handleToolClick,
  interrupt,
  searchQuery,
  isSearching
}: {
  messages: Array<Message>
  showMessageContextMenu: (text: string, messageId?: string, isAssistantMessage?: boolean) => void
  loading: boolean
  running: boolean
  handleToolClick: (id: number) => void
  interrupt: () => void
  searchQuery?: string
  isSearching?: boolean
}): React.JSX.Element {
  const intl = useIntl()
  const handleContextMenu = (e, text, messageId, isAssistantMessage = false): void => {
    e.preventDefault()
    showMessageContextMenu(text, messageId, isAssistantMessage && running)
  }

  if (messages.length === 0) {
    return <></>
  }

  return (
    <div className="messages" data-testid="messages">
      <div className="messages-inner">
        {orderBy(messages, ['created_at']).map((message, i) => (
          <div
            key={
              message.role === 'tool'
                ? `${message.tool_name}-${message.tool_req}-${i}`
                : `${message.content}-${i}`
            }
            id={message.id ? `message-${message.id}` : undefined}
            className="prompt-wrapper"
          >
            <div
              className={`prompt prompt-${message.role}`}
              onContextMenu={(e) => {
                // Handle JSON content with metadata
                let displayContent = message.content || ''
                try {
                  const parsed = JSON.parse(displayContent)
                  if (parsed.content) {
                    displayContent = parsed.content
                  }
                } catch {
                  // Not JSON, use as is
                }

                handleContextMenu(e, displayContent, message.id, message.role === 'assistant')
              }}
            >
              {message.role === 'tool' && message.tool_name === 'update_knowledge_index' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiBookOpen size={14} />
                  </div>
                  <div>
                    {message.tool_res
                      ? intl.formatMessage({ id: 'knowledgeIndexUpdated' })
                      : intl.formatMessage({ id: 'updatingKnowledgeIndex' })}
                  </div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'upsert_knowledge' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiBookOpen size={14} />
                  </div>
                  <div>
                    {message.tool_res
                      ? intl.formatMessage({ id: 'knowledgeSaved' })
                      : intl.formatMessage({ id: 'savingKnowledge' })}
                  </div>
                </div>
              )}
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
              {message.role === 'tool' && message.tool_name === 'knowledge_record' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiBookOpen size={14} />
                  </div>
                  <div className="knowledge-main">
                    {intl.formatMessage({ id: 'knowledgeRecorded' })}:
                  </div>
                  <div className="knowledge-sub">
                    {message.tool_res &&
                      (() => {
                        try {
                          const response = JSON.parse(message.tool_res)
                          if (
                            response.saved_knowledge_ids &&
                            Array.isArray(response.saved_knowledge_ids)
                          ) {
                            return response.saved_knowledge_ids.join(', ')
                          }
                          return ''
                        } catch (error) {
                          console.error('Error parsing knowledge record response:', error)
                          return ''
                        }
                      })()}
                  </div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'memory_update' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiSmile size={14} />
                  </div>
                  <div>{intl.formatMessage({ id: 'memoryUpdated' })}</div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'memory_compression' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiHardDrive size={14} />
                  </div>
                  <div>{intl.formatMessage({ id: 'memoryCompressed' })}</div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'start_search' && (
                <div className="knowledge searching-animation">
                  <div className="knowledge-icon">
                    <FiSearch size={14} />
                  </div>
                  <div className="knowledge-main">
                    {intl.formatMessage({ id: 'searchingKnowledge' }) ||
                      'Searching knowledge base...'}
                  </div>
                </div>
              )}
              {isSearching &&
                !messages.some((m) => m.role === 'tool' && m.tool_name === 'start_search') && (
                  <div className="knowledge searching-animation" style={{ marginTop: '10px' }}>
                    <div className="knowledge-icon">
                      <FiSearch size={14} />
                    </div>
                    <div className="knowledge-main">
                      {intl.formatMessage({ id: 'searchingKnowledge' }) ||
                        'Searching knowledge base...'}
                    </div>
                  </div>
                )}
              {message.role === 'tool' && message.tool_name === 'knowledge_search' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiSearch size={14} />
                  </div>
                  <div className="knowledge-main">
                    {intl.formatMessage({ id: 'searchKnowledge' })}:
                  </div>
                  <div className="knowledge-sub">
                    {message.tool_req &&
                      message.tool_res &&
                      (() => {
                        try {
                          const response = JSON.parse(message.tool_res)

                          return response.results.join(',')
                        } catch (error) {
                          console.error('Error parsing search query data:', error)
                          return ''
                        }
                      })()}
                  </div>
                </div>
              )}
              {message.role === 'tool' &&
                message.tool_name !== 'upsert_knowledge' &&
                message.tool_name !== 'search_knowledge' &&
                message.tool_name !== 'update_knowledge_index' &&
                message.tool_name !== 'replace_memory' &&
                message.tool_name !== 'knowledge_record' &&
                message.tool_name !== 'memory_update' &&
                message.tool_name !== 'memory_compression' &&
                message.tool_name !== 'search_query_generation' &&
                message.tool_name !== 'knowledge_search' &&
                message.tool_name !== 'start_search' && (
                  <div className="tool">
                    <div className="tool-name">
                      <div className="tool-name-text">
                        <FiTool color="#444" />
                        <div>{message.tool_name}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={`close-tool-${i}`}
                        onClick={() => handleToolClick(i)}
                      >
                        {message.open ? (
                          <FiChevronUp color="#444" />
                        ) : (
                          <FiChevronDown color="#444" />
                        )}
                      </button>
                    </div>
                    {message.open && (
                      <>
                        <div className="tool-args">
                          <div>{intl.formatMessage({ id: 'request' })}</div>
                          <pre className="tool-args-code">{message.tool_req}</pre>
                        </div>
                        {message.tool_res && (
                          <div className="tool-response">
                            <div>{intl.formatMessage({ id: 'response' })}</div>
                            <code className="tool-response-code">
                              {message.tool_res.slice(0, 1000)}
                            </code>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              {message.role === 'assistant' && (
                <>
                  <HighlightedMarkdown
                    content={getDisplayableContent(message.content || '')}
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
                  {searchQuery ? (
                    <div className="user-plain-text">
                      <HighlightedMarkdown
                        content={message.content || ''}
                        searchQuery={searchQuery}
                      />
                    </div>
                  ) : (
                    <div className="user-plain-text" style={{ whiteSpace: 'pre-wrap' }}>
                      {getDisplayableContent(message.content || '')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {running && (
          <div className="loading" data-testid="loading" onClick={interrupt}>
            <div className="loader" />
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages
