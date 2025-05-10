import orderBy from 'lodash/orderBy'
import { FiBookOpen, FiChevronDown, FiChevronUp, FiSearch, FiSmile, FiTool } from 'react-icons/fi'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

window.EditContext = false

function Messages({
  messages,
  showMessageContextMenu,
  running,
  handleToolClick,
  interrupt
}: {
  messages: Array<Message>
  showMessageContextMenu: (text: string, messageId?: string, isAssistantMessage?: boolean) => void
  loading: boolean
  running: boolean
  handleToolClick: (id: number) => void
  interrupt: () => void
}): React.JSX.Element {
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
          >
            <div
              className={`prompt prompt-${message.role}`}
              onContextMenu={(e) => {
                console.log(message)
                handleContextMenu(
                  e,
                  message.content || '',
                  message.id,
                  message.role === 'assistant'
                )
              }}
            >
              {message.role === 'tool' && message.tool_name === 'update_knowledge_index' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiBookOpen size={14} />
                  </div>
                  <div>
                    {message.tool_res
                      ? 'ナレッジのインデックスを更新しました'
                      : 'ナレッジのインデックスを更新します'}
                  </div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'upsert_knowledge' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiBookOpen size={14} />
                  </div>
                  <div>{message.tool_res ? 'ナレッジを保存しました' : 'ナレッジを保存します'}</div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'search_knowledge' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiSearch size={14} />
                  </div>
                  <div>
                    {message.tool_res ? 'ナレッジが見つかりました' : 'ナレッジを検索します'}
                  </div>
                </div>
              )}
              {message.role === 'tool' && message.tool_name === 'replace_memory' && (
                <div className="knowledge">
                  <div className="knowledge-icon">
                    <FiSmile size={14} />
                  </div>
                  <div>{message.tool_res ? 'メモリを保存しました' : 'メモリを更新します'}</div>
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
                          <div>Request</div>
                          <pre className="tool-args-code">{message.tool_req}</pre>
                        </div>
                        {message.tool_res && (
                          <div className="tool-response">
                            <div>Response</div>
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
                  <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
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
                  <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
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
