import { LuMenu } from 'react-icons/lu'

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

function Header({ isMenuOpen, setIsMenuOpen, className }: Props): React.JSX.Element {
  return (
    <header role="banner" className={className}>
      <div></div>
      <div className="header-menu">
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
