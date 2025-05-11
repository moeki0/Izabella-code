import { useState, useEffect, useCallback } from 'react'
import { useIntl } from '../lib/locale'

interface MemorySidebarProps {
  isOpen: boolean
  onClose: () => void
}

function MemorySidebar({ isOpen }: MemorySidebarProps): React.JSX.Element | null {
  const [memoryContent, setMemoryContent] = useState<string>('')
  const [knowledgeIndexContent, setKnowledgeIndexContent] = useState<string>('')
  const [summarizedContent, setSummarizedContent] = useState<
    Array<{ title: string; content: string }> | string
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const intl = useIntl()

  const fetchMemoryContent = useCallback(async (): Promise<void> => {
    if (memoryContent && !isLoading) return

    setIsLoading(true)
    try {
      const response = await window.api.getMemoryContent()
      setMemoryContent(response)
    } catch {
      setMemoryContent(`Error fetching memory content.`)
    } finally {
      setIsLoading(false)
    }
  }, [memoryContent, isLoading])

  const fetchKnowledgeIndexContent = useCallback(async (): Promise<void> => {
    if (knowledgeIndexContent && !isKnowledgeLoading) return

    setIsKnowledgeLoading(true)
    try {
      const response = await window.api.getKnowledgeIndexContent()
      setKnowledgeIndexContent(response)
    } catch {
      setKnowledgeIndexContent(`Error fetching knowledge index content.`)
    } finally {
      setIsKnowledgeLoading(false)
    }
  }, [knowledgeIndexContent, isKnowledgeLoading])

  const fetchSummarizedContent = useCallback(async (): Promise<void> => {
    if (summarizedContent.length > 0 && !isSummaryLoading) return

    setIsSummaryLoading(true)
    try {
      const response = await window.api.summarizeMemoryContent()
      setSummarizedContent(response)
    } catch {
      setSummarizedContent(`Error fetching memory summary.`)
    } finally {
      setIsSummaryLoading(false)
    }
  }, [summarizedContent, isSummaryLoading])

  useEffect(() => {
    if (isOpen) {
      fetchSummarizedContent()
    }
  }, [isOpen, fetchMemoryContent, fetchKnowledgeIndexContent, fetchSummarizedContent])

  if (!isOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{intl.formatMessage({ id: 'memory' }) || 'Memory'}</div>
      </div>

      <div className="memory-summary">
        {isSummaryLoading ? (
          <div className="memory-loading">
            <div className="memory-loading-skeleton"></div>
            <div className="memory-loading-skeleton"></div>
            <div className="memory-loading-skeleton"></div>
          </div>
        ) : (
          typeof summarizedContent !== 'string' && (
            <div className="memory-summary-list">
              {summarizedContent.map((item) => (
                <div className="memory-summary-item" key={item.title}>
                  <div className="memory-summary-item-title">{item.title}</div>
                  <div className="memory-summary-item-content">{item.content}</div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export { MemorySidebar }
