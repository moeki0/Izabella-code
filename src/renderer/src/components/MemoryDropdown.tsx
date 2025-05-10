import { useState, useEffect, useRef, useCallback } from 'react'
import { FiSmile } from 'react-icons/fi'

function MemoryDropdown(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [memoryContent, setMemoryContent] = useState<string>('')
  const [knowledgeIndexContent, setKnowledgeIndexContent] = useState<string>('')
  const [summarizedContent, setSummarizedContent] = useState<
    Array<{ title: string; content: string }> | string
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const handleClickOutside = (event: MouseEvent): void => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSummarizedContent()
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, fetchMemoryContent, fetchKnowledgeIndexContent, fetchSummarizedContent])

  const toggleDropdown = (): void => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="memory-dropdown" ref={dropdownRef}>
      <button
        className={`header-button ${isOpen ? 'header-button-active' : ''}`}
        onClick={toggleDropdown}
        aria-label={'Memory'}
      >
        {<FiSmile size={16} />}
      </button>

      {isOpen && (
        <div className="memory-dropdown-content">
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
      )}
    </div>
  )
}

export { MemoryDropdown }
