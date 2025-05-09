import { KnowledgeDropdown } from './KnowledgeDropdown'

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
        <KnowledgeDropdown />
      </div>
    </header>
  )
}

export { Header }
