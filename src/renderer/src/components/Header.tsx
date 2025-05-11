import { KnowledgeDropdown } from './KnowledgeDropdown'
import { MemoryDropdown } from './MemoryDropdown'
import { SettingsDropdown } from './SettingsDropdown'

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

function Header({ className }: Props): React.JSX.Element {
  return (
    <header role="banner" className={className}>
      <div className="header-title"></div>
      <div className="header-actions">
        <MemoryDropdown />
        <KnowledgeDropdown />
        <SettingsDropdown forceOpen={false} />
      </div>
    </header>
  )
}

export { Header }
