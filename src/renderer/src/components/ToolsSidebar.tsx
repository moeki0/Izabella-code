import { useEffect, useState } from 'react'
import { useIntl } from '../lib/locale'
import { Tools } from './Tools'

interface ToolsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function ToolsSidebar({ isOpen }: ToolsSidebarProps): React.JSX.Element | null {
  const intl = useIntl()
  const [searchGroundingEnabled, setSearchGroundingEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [originalValue, setOriginalValue] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchSearchGrounding = async (): Promise<void> => {
      try {
        if (window.api.getSearchGrounding) {
          const result = await window.api.getSearchGrounding()
          setSearchGroundingEnabled(result.enabled)
          setOriginalValue(result.enabled)
        }
      } catch (error) {
        console.error('Failed to fetch search grounding setting:', error)
      }
    }

    if (isOpen) {
      fetchSearchGrounding()
    }
  }, [isOpen])

  const handleToggleSearchGrounding = async (enabled: boolean): Promise<void> => {
    if (enabled === originalValue) {
      return
    }

    setLoading(true)
    try {
      if (window.api.updateSearchGrounding) {
        const result = await window.api.updateSearchGrounding(enabled)
        if (result.success) {
          setSearchGroundingEnabled(enabled)
        }
      }
    } catch (error) {
      console.error('Failed to update search grounding setting:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{intl.formatMessage({ id: 'tools' }) || 'Tools'}</div>
      </div>
      <div className="tools-sidebar-content">
        {window.api.getSearchGrounding && (
          <div className="search-mode-selector">
            <div className="search-mode-title">{intl.formatMessage({ id: 'searchMode' })}</div>
            <div className="search-mode-options">
              <label className="search-mode-option">
                <input
                  type="radio"
                  name="searchMode"
                  value="webSearch"
                  checked={searchGroundingEnabled}
                  onChange={() => handleToggleSearchGrounding(true)}
                  disabled={loading}
                />
                <span>{intl.formatMessage({ id: 'webSearchGrounding' })}</span>
              </label>
              <label className="search-mode-option">
                <input
                  type="radio"
                  name="searchMode"
                  value="tools"
                  checked={!searchGroundingEnabled}
                  onChange={() => handleToggleSearchGrounding(false)}
                  disabled={loading}
                />
                <span>{intl.formatMessage({ id: 'toolsMode' })}</span>
              </label>
            </div>
          </div>
        )}
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
