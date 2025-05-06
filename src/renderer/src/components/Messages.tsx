import { FiChevronDown, FiChevronUp, FiTool } from 'react-icons/fi'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type Message = {
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
  loading,
  handleToolClick,
  onScroll
}: {
  messages: Array<Message>
  showMessageContextMenu: (text: string) => void
  loading: boolean
  handleToolClick: (id: number) => void
  onScroll: (e) => void
}): React.JSX.Element {
  const handleContextMenu = (e, text): void => {
    e.preventDefault()
    showMessageContextMenu(text)
  }
  return (
    <div className="messages" data-testid="messages" onScroll={onScroll}>
      <div className="messages-inner">
        {messages.map((message, i) => (
          <div
            key={
              message.role === 'tool'
                ? `${message.tool_name}-${message.tool_req}-${i}`
                : `${message.content}-${i}`
            }
            className={`prompt prompt-${message.role}`}
            onContextMenu={(e) => handleContextMenu(e, message.content || '')}
          >
            {message.role === 'tool' && (
              <div className="tool">
                <div className="tool-name">
                  <div className="tool-name-text">
                    <FiTool color="#444" />
                    <p>{message.tool_name}</p>
                  </div>
                  <button aria-label={`close-tool-${i}`} onClick={() => handleToolClick(i)}>
                    {message.open ? <FiChevronUp color="#444" /> : <FiChevronDown color="#444" />}
                  </button>
                </div>
                {message.open && (
                  <>
                    <div className="tool-args">
                      <p>Request</p>
                      <pre className="tool-args-code">{message.tool_req}</pre>
                    </div>
                    {message.tool_res && (
                      <div className="tool-response">
                        <p>Response</p>
                        <code className="tool-response-code">{message.tool_res}</code>
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

                          let sourceData
                          try {
                            sourceData = JSON.parse(sourceStr)
                          } catch {
                            return <div className="source-item">{sourceStr}</div>
                          }

                          if (Array.isArray(sourceData)) {
                            const uniqueUrls = new Set()

                            const renderedSources = sourceData
                              .map((source, index) => {
                                if (!source) return null

                                const url = source.url

                                const title = source.title

                                if (url) {
                                  if (uniqueUrls.has(url)) {
                                    return null
                                  }

                                  uniqueUrls.add(url)
                                }

                                if (url) {
                                  let domain = ''
                                  try {
                                    const urlObj = new URL(url)
                                    domain = urlObj.hostname.replace(/^www\./, '')
                                  } catch (e) {
                                    console.warn(e)
                                  }

                                  return (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="source-item"
                                      key={`source-${index}`}
                                    >
                                      <span className="source-domain">{domain}</span>
                                      <span className="source-title">{title}</span>
                                    </a>
                                  )
                                } else if (title) {
                                  return (
                                    <div className="source-item" key={`source-${index}`}>
                                      {title}
                                    </div>
                                  )
                                }
                                return null
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
        ))}
        {loading && (
          <div className="loading" data-testid="loading">
            <div className="loader"></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages
