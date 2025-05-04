import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Message } from './Chat'
import orderBy from 'lodash/orderBy'
import { Header } from './Header'
import { localizeDate } from '@renderer/lib/locale'
import { Menu } from './Menu'
import { Tool } from './Tools'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export type Thread = {
  id: string
  title: string
  created_at: string
  update_at: string
  messages: Array<Message>
}

export type ThreadsWithPagination = {
  threads: Array<Thread>
  totalPages: number
}

interface Props {
  initialThreads?: ThreadsWithPagination
  getThreads: (params?: { page?: number; itemsPerPage?: number }) => Promise<ThreadsWithPagination>
  getTools: () => Promise<Array<Tool>>
  searchThreads: (params: {
    query: string
    page?: number
    itemsPerPage?: number
  }) => Promise<ThreadsWithPagination>
  registerNewThreadListener: (callback: () => void) => () => void
  registerDeleteThreadListener: (callback: (id: string) => void) => () => void
  showThreadContextMenu: (id: string) => void
}

function Threads({
  initialThreads = { threads: [], totalPages: 0 },
  getThreads,
  getTools,
  searchThreads,
  registerNewThreadListener,
  registerDeleteThreadListener,
  showThreadContextMenu
}: Props): React.JSX.Element {
  const [threads, setThreads] = useState<Array<Thread>>(initialThreads.threads)
  const [totalPages, setTotalPages] = useState<number>(initialThreads.totalPages)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(12)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const threadsContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const unsubscribeDelete = registerDeleteThreadListener((id) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== id))
  })

  const fetchThreads = useCallback(
    async (page: number = 1): Promise<void> => {
      const result = await getThreads({ page, itemsPerPage })
      setThreads(result.threads)
      setTotalPages(result.totalPages)
      setCurrentPage(page)
      return Promise.resolve()
    },
    [getThreads, itemsPerPage]
  )

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useEffect(() => {
    return (): void => {
      unsubscribeDelete()
    }
  }, [getThreads, registerNewThreadListener, registerDeleteThreadListener, unsubscribeDelete])

  const handleScroll = (element: HTMLElement): void => {
    setIsHeaderScrolled(element.scrollTop > 0)
  }

  const search = (query): void => {
    if (query) {
      searchThreads({ query, page: 1, itemsPerPage }).then((result) => {
        setThreads(result.threads)
        setTotalPages(result.totalPages)
        setCurrentPage(1)
        scrollToTop()
      })
    } else {
      fetchThreads(1).then(() => {
        scrollToTop()
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

  // Scroll to top of the threads container
  const scrollToTop = (): void => {
    if (threadsContainerRef.current) {
      threadsContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  // Handle page change
  const handlePageChange = (page: number): void => {
    if (searchQuery) {
      searchThreads({ query: searchQuery, page, itemsPerPage }).then((result) => {
        setThreads(result.threads)
        setTotalPages(result.totalPages)
        setCurrentPage(page)
        scrollToTop()
      })
    } else {
      fetchThreads(page).then(() => {
        scrollToTop()
      })
    }
  }

  // Calculate pages to display in pagination
  const getPaginationNumbers = (): number[] => {
    const pages: number[] = []

    // Always show first page
    if (currentPage > 3) {
      pages.push(1)
      if (currentPage > 4) {
        pages.push(-1) // -1 is a placeholder for "..."
      }
    }

    // Add pages around current page
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      pages.push(i)
    }

    // Always show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        pages.push(-1) // -1 is a placeholder for "..."
      }
      pages.push(totalPages)
    }

    return pages
  }

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
          ref={threadsContainerRef}
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

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className={`pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft color="#333" />
                </button>

                {getPaginationNumbers().map((page, index) =>
                  page === -1 ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className={`pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight color="#333" />
                </button>
              </div>
            )}
          </div>
        </div>
        <Menu isOpen={isMenuOpen} getTools={getTools} />
      </main>
    </>
  )
}

export default Threads
