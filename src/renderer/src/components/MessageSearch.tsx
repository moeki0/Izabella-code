import { useState, useRef } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { useIntl } from '../lib/locale'

type MessageSearchResult = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_name: string | null
  created_at: string
}

type MessageSearchProps = {
  onMessageSelect?: (messageId: string, searchQuery?: string) => void
}

const MessageSearch = ({ onMessageSelect }: MessageSearchProps): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const intl = useIntl()

  // 検索実行
  const handleSearch = async (page = 1): Promise<void> => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // 検索クエリにタイムスタンプを追加して、キャッシュの問題を回避
      const timestamp = new Date().getTime()

      const result = await window.api.searchMessages({
        query: searchQuery + ' ' + timestamp, // 毎回異なるクエリになるように
        page: page,
        itemsPerPage: 10
      })

      if (result.success && result.data) {
        // reasoningブロックを含むメッセージを除外
        const filteredMessages = (result.data.messages as MessageSearchResult[]).filter(
          (message) => {
            // contentが空の場合はスキップしない
            if (!message.content) return true

            // ```reasoning```ブロックを含むメッセージを除外
            return !message.content.includes('```reasoning')
          }
        )

        // 検索結果を設定
        if (page === 1) {
          setSearchResults(filteredMessages)
        } else {
          setSearchResults((prev) => [...prev, ...filteredMessages])
        }

        // 調整された合計数を設定
        const adjustedTotal = Math.max(
          0,
          result.data.total - (result.data.messages.length - filteredMessages.length)
        )
        setTotalResults(adjustedTotal)
        setCurrentPage(page)
        setHasMoreResults(page < result.data.totalPages && filteredMessages.length > 0)
      } else {
        console.error('Search failed:', result.error)
        if (page === 1) {
          setSearchResults([])
        }
      }
    } catch (error) {
      console.error('Error searching messages:', error)
      if (page === 1) {
        setSearchResults([])
      }
    } finally {
      setIsSearching(false)
    }
  }

  // Enterキーで検索実行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      // 検索結果をリセットして新しく検索
      setCurrentPage(1)
      handleSearch(1)
    }
  }

  // 検索クエリ変更
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newQuery = e.target.value
    setSearchQuery(newQuery)

    // クエリが空の場合は結果をクリア
    if (newQuery === '') {
      setSearchResults([])
      setCurrentPage(1)
      setHasMoreResults(false)
    }

    // 検索クエリの自動実行判定 (日本語の場合は2文字以上、それ以外は3文字以上)
    const hasJapaneseChars =
      /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
        newQuery
      )
    if ((hasJapaneseChars && newQuery.length >= 2) || (!hasJapaneseChars && newQuery.length >= 3)) {
      setCurrentPage(1)
      handleSearch(1)
    }
  }

  // もっと結果を読み込む
  const handleLoadMore = (): void => {
    if (hasMoreResults && !isSearching) {
      handleSearch(currentPage + 1)
    }
  }

  // 検索クリア
  const clearSearch = (): void => {
    setSearchQuery('')
    setSearchResults([])
    setCurrentPage(1)
    setHasMoreResults(false)
    setTotalResults(0)
  }

  // メッセージのプレビューテキストを取得
  const getMessagePreview = (message: MessageSearchResult): string => {
    // 元の検索クエリ（タイムスタンプ部分を除く）
    const originalQuery = searchQuery.trim().replace(/\s+\d+$/, '')
    const queryWords = originalQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => {
        // 日本語文字が含まれている場合は2文字以上、それ以外は3文字以上
        const hasJapaneseChars =
          /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
            word
          )
        return hasJapaneseChars ? word.length >= 2 : word.length >= 3
      })

    if (message.content) {
      let content = message.content

      // ```reasoning ブロックを削除
      content = content.replace(/```reasoning[\s\S]*?```/g, '')

      // 検索クエリのキーワードがある場合はその付近のテキストを抽出
      if (originalQuery && content.toLowerCase().includes(originalQuery.toLowerCase())) {
        const index = content.toLowerCase().indexOf(originalQuery.toLowerCase())
        const start = Math.max(0, index - 20)
        const end = Math.min(content.length, index + originalQuery.length + 40)
        const extractedContent = content.substring(start, end)

        // 特殊文字をエスケープしてRegExでエラーを防ぐ
        const escapedQuery = originalQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        // 抽出したテキスト内の検索キーワードをハイライト
        const highlightedContent = extractedContent.replace(
          new RegExp(escapedQuery, 'gi'),
          (match) => `<span class="message-context-highlight">${match}</span>`
        )

        content =
          (start > 0 ? '...' : '') + highlightedContent + (end < content.length ? '...' : '')
      }
      // 複数キーワードの場合、最初に見つかったキーワード付近を抽出
      else if (queryWords.length > 0) {
        for (const word of queryWords) {
          // 日本語文字が含まれている場合は2文字以上、それ以外は3文字以上
          const hasJapaneseChars =
            /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
              word
            )
          const minLength = hasJapaneseChars ? 2 : 3

          if (word.length >= minLength && content.toLowerCase().includes(word.toLowerCase())) {
            const index = content.toLowerCase().indexOf(word.toLowerCase())
            const start = Math.max(0, index - 20)
            const end = Math.min(content.length, index + word.length + 40)
            const extractedContent = content.substring(start, end)

            // 特殊文字をエスケープしてRegExでエラーを防ぐ
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

            // 抽出したテキスト内の検索キーワードをハイライト
            const highlightedContent = extractedContent.replace(
              new RegExp(escapedWord, 'gi'),
              (match) => `<span class="message-context-highlight">${match}</span>`
            )

            content =
              (start > 0 ? '...' : '') + highlightedContent + (end < content.length ? '...' : '')
            break
          }
        }
      }
      // キーワードが見つからない場合は先頭部分を表示
      else {
        content = content.substring(0, 60) + (content.length > 60 ? '...' : '')
      }

      return content
    }

    return ''
  }

  // 検索結果の日付をフォーマット
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="message-search-container" ref={searchRef}>
      <div className="message-search-wrapper">
        <div className="message-search">
          <FiSearch className="search-icon" size={12} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder={intl.formatMessage({ id: 'searchMessages' })}
            aria-label="Search messages"
            autoFocus
          />
          {searchQuery && (
            <button className="clear-search" onClick={clearSearch} aria-label="Clear search">
              <FiX />
            </button>
          )}
          {isSearching && <div className="spinner"></div>}
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results-container">
          <div className="search-results-header">
            {intl.formatMessage({ id: 'searchResultsCount' }, { count: totalResults.toString() })}
          </div>
          <ul className="search-results-list">
            {searchResults.map((result) => (
              <li
                key={result.id}
                className={`search-result-item search-result-${result.role}`}
                onClick={() => {
                  if (onMessageSelect) {
                    // 検索クエリからタイムスタンプを除去して渡す
                    const cleanQuery = searchQuery.trim().replace(/\s+\d+$/, '')
                    onMessageSelect(result.id, cleanQuery)
                  }
                }}
              >
                <div className="search-result-content">
                  <div
                    className="search-result-text"
                    dangerouslySetInnerHTML={{ __html: getMessagePreview(result) }}
                  />
                  <div className="search-result-date">{formatDate(result.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
          {hasMoreResults && (
            <div
              className="search-results-more"
              onClick={handleLoadMore}
              role="button"
              tabIndex={0}
            >
              {isSearching ? (
                <div className="spinner-small"></div>
              ) : (
                intl.formatMessage(
                  { id: 'moreResults' },
                  { count: (totalResults - searchResults.length).toString() }
                )
              )}
            </div>
          )}
        </div>
      )}

      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div className="search-no-results">{intl.formatMessage({ id: 'noSearchResults' })}</div>
      )}
    </div>
  )
}

export default MessageSearch
