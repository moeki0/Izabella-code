import { KnowledgeDropdown } from './KnowledgeDropdown'
import { MemoryDropdown } from './MemoryDropdown'
import { SettingsDropdown } from './SettingsDropdown'
import { FiSearch } from 'react-icons/fi'

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
}

function Header({ className, toggleSearchSidebar, isSearchSidebarOpen }: Props): React.JSX.Element {
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
        <MemoryDropdown />
        <KnowledgeDropdown />
        <SettingsDropdown forceOpen={false} />
      </div>
    </header>
  )
}

export { Header }
