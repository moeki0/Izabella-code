import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Message } from './Chat'
import orderBy from 'lodash/orderBy'
import { Header } from './Header'
import { localizeDate } from '@renderer/lib/locale'
import { Menu } from './Menu'
import { Tool } from './Tools'

export type Thread = {
  id: string
  title: string
  created_at: string
  update_at: string
  messages: Array<Message>
}

interface Props {
  initialThreads?: Array<Thread>
  getThreads: () => Promise<Array<Thread>>
  getTools: () => Promise<Array<Tool>>
  searchThreads: (query: string) => Promise<Array<Thread>>
  registerNewThreadListener: (callback: () => void) => () => void
  registerDeleteThreadListener: (callback: (id: string) => void) => () => void
  showThreadContextMenu: (id: string) => void
}

function Threads({
  initialThreads = [],
  getThreads,
  getTools,
  searchThreads,
  registerNewThreadListener,
  registerDeleteThreadListener,
  showThreadContextMenu
}: Props): React.JSX.Element {
  const [threads, setThreads] = useState<Array<Thread>>(initialThreads)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const navigate = useNavigate()

  const unsubscribeDelete = registerDeleteThreadListener((id) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== id))
  })

  useEffect(() => {
    getThreads().then((result) => {
      setThreads(result)
    })

    return (): void => {
      unsubscribeDelete()
    }
  }, [getThreads, registerNewThreadListener, registerDeleteThreadListener, unsubscribeDelete])

  const handleScroll = (element: HTMLElement): void => {
    setIsHeaderScrolled(element.scrollTop > 0)
  }

  const search = (query): void => {
    if (query) {
      searchThreads(query).then((result) => {
        setThreads(result)
      })
    } else {
      getThreads().then((result) => {
        setThreads(result)
      })
    }
  }

  const handleThreadClick = (id: string): void => {
    navigate(`/threads/${id}`)
  }

  const handleContextMenu = (id: string): void => {
    showThreadContextMenu(id)
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <Header
        setSearchQuery={setSearchQuery}
        searchQuery={searchQuery}
        search={search}
        onThreadList={() => {}}
        className={isHeaderScrolled ? 'header-scrolled' : ''}
        onNewThread={() => navigate('/')}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      <main>
        <div
          className="threads"
          data-testid="threads"
          onScroll={(e) => handleScroll(e.currentTarget)}
        >
          <div className="thread-list">
            <div className="thread-list-inner">
              {threads.map((thread) => (
                <div
                  className="thread-list-item"
                  onClick={() => handleThreadClick(thread.id)}
                  key={thread.id}
                  data-testid={`thread-${thread.id}`}
                  onContextMenu={() => handleContextMenu(thread.id)}
                >
                  <div className="thread-list-item-box">
                    <div className="thread-list-item-user">
                      {
                        orderBy(thread.messages, ['created_at'], ['asc']).find(
                          (m) => m.role === 'user'
                        )?.content
                      }
                    </div>
                    <div className="thread-list-item-assistant">
                      {
                        orderBy(thread.messages, ['created_at'], ['asc']).find(
                          (m) => m.role === 'assistant'
                        )?.content
                      }
                    </div>
                    <div className="thread-list-item-box-gradient"></div>
                  </div>
                  <div className="thread-list-item-text">
                    <div className="thread-list-item-title">{thread.title || 'Untitled'}</div>
                    <div className="thread-list-item-date">
                      {localizeDate(new Date(thread.created_at))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Menu isOpen={isMenuOpen} getTools={getTools} />
      </main>
    </>
  )
}

export default Threads
