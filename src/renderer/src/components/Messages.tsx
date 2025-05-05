import { FiChevronDown, FiChevronUp, FiTool } from 'react-icons/fi'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type Message = {
  role: 'user' | 'assistant' | 'tool'
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
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
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
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
