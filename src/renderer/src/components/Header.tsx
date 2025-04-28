import { localizeDate } from '@renderer/lib/locale'
import { LuLayoutGrid, LuMenu, LuPlus, LuSearch } from 'react-icons/lu'

interface Props {
  title?: string
  startedAt?: Date
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  isAssistantsOpen?: boolean
  setIsAssistantsOpen?: (open: boolean) => void
  setSearchQuery?: (searchQuery: string) => void
  searchQuery?: string
  search?: (query: string) => void
  onNewThread?: () => void
  onThreadList?: () => void
  className?: string
}

function Header({
  isMenuOpen,
  setIsMenuOpen,
  title,
  startedAt,
  searchQuery,
  setSearchQuery,
  search,
  onNewThread,
  onThreadList,
  className
}: Props): React.JSX.Element {
  const handleNewThread = (): void => {
    if (onNewThread) {
      onNewThread()
    }
  }

  const handleThreadList = (): void => {
    if (onThreadList) {
      onThreadList()
    }
  }

  const handleSearch = (value: string): void => {
    setSearchQuery?.(value)
    search?.(value)
  }

  return (
    <header role="banner" className={className}>
      <div>
        {title && (
          <>
            <h1>{title}</h1>
            {startedAt && <time>{localizeDate(startedAt)}</time>}
          </>
        )}
        {setSearchQuery && search && (
          <div className="search-box">
            <LuSearch color="#444" size={20} />
            <input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}
      </div>
      <div className="header-menu">
        <button onClick={handleNewThread} aria-label="new">
          <LuPlus color="#666" size={20} />
        </button>
        {onThreadList && (
          <button onClick={handleThreadList} aria-label="threads">
            <LuLayoutGrid color="#666" size={20} />
          </button>
        )}
        <button
          onClick={() => {
            setIsMenuOpen(!isMenuOpen)
          }}
          aria-label="menu"
        >
          <LuMenu color="#666" size={20} />
        </button>
      </div>
    </header>
  )
}

export { Header }
