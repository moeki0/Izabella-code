import React from 'react'
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
  searchGroundingEnabled?: boolean
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
  isArtifactSidebarOpen,
  searchGroundingEnabled = true
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
