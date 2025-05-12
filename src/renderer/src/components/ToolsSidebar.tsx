import { useIntl } from '../lib/locale'
import { Tools } from './Tools'

interface ToolsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function ToolsSidebar({ isOpen }: ToolsSidebarProps): React.JSX.Element | null {
  const intl = useIntl()

  if (!isOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{intl.formatMessage({ id: 'tools' }) || 'Tools'}</div>
      </div>
      <div className="tools-sidebar-content">
        <Tools
          getTools={window.api.getTools}
          getEnabledTools={window.api.getEnabledTools}
          updateToolEnabled={window.api.updateToolEnabled}
        />
      </div>
    </div>
  )
}

export { ToolsSidebar }
