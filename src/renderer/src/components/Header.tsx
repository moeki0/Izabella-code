import { FiSearch, FiBookOpen, FiSmile, FiSettings } from 'react-icons/fi'

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
  toggleSearchSidebar?: () => void
  isSearchSidebarOpen?: boolean
  toggleKnowledgeSidebar?: () => void
  isKnowledgeSidebarOpen?: boolean
  toggleMemorySidebar?: () => void
  isMemorySidebarOpen?: boolean
  toggleSettingsSidebar?: () => void
  isSettingsSidebarOpen?: boolean
}

function Header({
  className,
  toggleSearchSidebar,
  isSearchSidebarOpen,
  toggleKnowledgeSidebar,
  isKnowledgeSidebarOpen,
  toggleMemorySidebar,
  isMemorySidebarOpen,
  toggleSettingsSidebar,
  isSettingsSidebarOpen
}: Props): React.JSX.Element {
  return (
    <header role="banner" className={className}>
      <div className="header-title"></div>
      <div className="header-actions">
        {toggleSearchSidebar && (
          <button
            className={`header-icon-button ${isSearchSidebarOpen ? 'header-button-active' : ''}`}
            onClick={toggleSearchSidebar}
            aria-label="Toggle search"
          >
            <FiSearch size={18} />
          </button>
        )}
        {toggleMemorySidebar && (
          <button
            className={`header-icon-button ${isMemorySidebarOpen ? 'header-button-active' : ''}`}
            onClick={toggleMemorySidebar}
            aria-label="Toggle memory"
          >
            <FiSmile size={18} />
          </button>
        )}
        {toggleKnowledgeSidebar && (
          <button
            className={`header-icon-button ${isKnowledgeSidebarOpen ? 'header-button-active' : ''}`}
            onClick={toggleKnowledgeSidebar}
            aria-label="Toggle knowledge"
          >
            <FiBookOpen size={18} />
          </button>
        )}
        {toggleSettingsSidebar && (
          <button
            className={`header-icon-button ${isSettingsSidebarOpen ? 'header-button-active' : ''}`}
            onClick={toggleSettingsSidebar}
            aria-label="Toggle settings"
          >
            <FiSettings size={18} />
          </button>
        )}
      </div>
    </header>
  )
}

export { Header }
