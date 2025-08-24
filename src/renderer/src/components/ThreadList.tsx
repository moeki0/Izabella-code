import React, { useEffect, useState } from 'react'
import { FiPlus, FiMessageCircle, FiChevronLeft } from 'react-icons/fi'

interface Thread {
  id: string
  title: string
  created_at: string
  updated_at: string
  first_message?: string
}

interface Props {
  onThreadSelect: (threadId: string) => void
  onNewThread: () => void
  onBack: () => void
  currentThreadId?: string
}

function ThreadList({
  onThreadSelect,
  onNewThread,
  onBack,
  currentThreadId
}: Props): React.JSX.Element {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async (): Promise<void> => {
    try {
      setLoading(true)
      const result = await window.api.invoke('threads:getAll')
      setThreads(result)
    } catch (error) {
      console.error('Error loading threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleThreadClick = (threadId: string): void => {
    onThreadSelect(threadId)
  }

  const handleNewThread = (): void => {
    onNewThread()
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今日'
    } else if (days === 1) {
      return '昨日'
    } else if (days < 7) {
      return `${days}日前`
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className="thread-list">
        <div className="thread-list-header">
          <button className="back-button" onClick={onBack}>
            <FiChevronLeft size={20} />
          </button>
          <h1>スレッド一覧</h1>
          <button className="new-thread-button" onClick={handleNewThread}>
            <FiPlus size={20} />
          </button>
        </div>
        <div className="thread-list-content">
          <div className="thread-list-loading">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="thread-list">
      <div className="thread-list-header">
        <button className="back-button" onClick={onBack}>
          <FiChevronLeft size={20} />
        </button>
        <h1>スレッド一覧</h1>
        <button className="new-thread-button" onClick={handleNewThread}>
          <FiPlus size={20} />
        </button>
      </div>
      <div className="thread-list-content">
        {threads.length === 0 ? (
          <div className="thread-list-empty">
            <FiMessageCircle size={48} />
            <p>スレッドがありません</p>
            <button className="empty-new-thread-button" onClick={handleNewThread}>
              新しいスレッドを作成
            </button>
          </div>
        ) : (
          <div className="thread-grid">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-card ${currentThreadId === thread.id ? 'thread-card-active' : ''}`}
                onClick={() => handleThreadClick(thread.id)}
              >
                <div className="thread-card-header">
                  <h3 className="thread-title">{thread.title}</h3>
                  <span className="thread-date">{formatDate(thread.updated_at)}</span>
                </div>
                <div className="thread-preview">
                  {thread.first_message ? (
                    <p>{thread.first_message}</p>
                  ) : (
                    <p className="thread-preview-empty">メッセージがありません</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { ThreadList }
