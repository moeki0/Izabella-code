import { useEffect, useState } from 'react'
import { FiFileText, FiSearch, FiSettings, FiTool } from 'react-icons/fi'

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
  toggleToolsSidebar?: () => void
  isToolsSidebarOpen?: boolean
  toggleArtifactSidebar?: () => void
  isArtifactSidebarOpen?: boolean
  currentTheme?: string
  latestMessageDate?: string
}

function Header({
  className,
  toggleSearchSidebar,
  isSearchSidebarOpen,
  toggleSettingsSidebar,
  isSettingsSidebarOpen,
  toggleToolsSidebar,
  isToolsSidebarOpen,
  toggleArtifactSidebar,
  isArtifactSidebarOpen
}: Props): React.JSX.Element {
  const [searchGroundingEnabled, setSearchGroundingEnabled] = useState(true)

  useEffect(() => {
    const fetchSearchGrounding = async (): Promise<void> => {
      try {
        if (window.api.getSearchGrounding) {
          const result = await window.api.getSearchGrounding()
          setSearchGroundingEnabled(result.enabled)
        }
      } catch (error) {
        console.error('Failed to fetch search grounding setting:', error)
      }
    }

    fetchSearchGrounding()

    // Listen for changes to the search grounding setting
    const handleStorageChange = async (): Promise<void> => {
      fetchSearchGrounding()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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
        {toggleToolsSidebar && (
          <button
            className={`header-icon-button ${isToolsSidebarOpen ? 'header-button-active' : ''} ${
              searchGroundingEnabled ? '' : 'header-button-blue'
            }`}
            onClick={toggleToolsSidebar}
            aria-label="Toggle tools"
          >
            <FiTool size={18} />
          </button>
        )}
        {toggleArtifactSidebar && (
          <button
            className={`header-icon-button ${isArtifactSidebarOpen ? 'header-button-active' : ''}`}
            onClick={toggleArtifactSidebar}
            aria-label="Toggle artifacts"
          >
            <FiFileText size={18} />
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
