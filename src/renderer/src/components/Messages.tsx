import orderBy from 'lodash/orderBy'
import { FiChevronDown, FiChevronUp, FiTool } from 'react-icons/fi'
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
      console.log(jsonObj)
      if (jsonObj.content) {
        return jsonObj.content.replace(/[\r\n]+/g, ' ')
      }
    } catch {
      // JSONパースに失敗した場合は、そのまま表示
    }
  }

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
              {message.role === 'tool' &&
                message.tool_name !== 'knowledge_record' &&
                message.tool_name !== 'memory_update' &&
                message.tool_name !== 'memory_compression' &&
                message.tool_name !== 'search_query_generation' &&
                message.tool_name !== 'knowledge_search' &&
                message.tool_name !== 'search_result' &&
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
                <div className="user-message">
                  <HighlightedMarkdown content={message.content || ''} searchQuery={searchQuery} />
                </div>
              )}
            </div>
          </div>
        ))}
        {running && (
          <div className="loading-container">
            <div className="loading" data-testid="loading" onClick={interrupt}>
              <div className="loader" />
            </div>
            {isSearching && (
              <div className="loading-text">{intl.formatMessage({ id: 'searchingKnowledge' })}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages
