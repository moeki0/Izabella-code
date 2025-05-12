import { useCallback, useEffect, useState } from 'react'

export type Tool = {
  name: string
  description: string
}

export type ToolWithEnabled = Tool & {
  enabled: boolean
}

type ToolsProps = {
  getTools: () => Promise<Array<Tool>>
  getEnabledTools?: () => Promise<Array<ToolWithEnabled>>
  updateToolEnabled?: (toolName: string, enabled: boolean) => Promise<{ success: boolean }>
}

function Tools({ getTools, getEnabledTools, updateToolEnabled }: ToolsProps): React.JSX.Element {
  const [tools, setTools] = useState<Array<ToolWithEnabled>>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const fetchTools = useCallback(async (): Promise<void> => {
    if (getEnabledTools) {
      try {
        const result = await getEnabledTools()
        setTools(result)
      } catch (error) {
        console.error('Failed to fetch enabled tools:', error)
      }
    } else {
      try {
        const result = await getTools()
        // Default to all tools enabled if getEnabledTools is not provided
        setTools(result.map((tool) => ({ ...tool, enabled: true })))
      } catch (error) {
        console.error('Failed to fetch tools:', error)
      }
    }
  }, [getEnabledTools, getTools])

  useEffect(() => {
    fetchTools()
  }, [getTools, getEnabledTools, fetchTools])

  const handleToggle = async (toolName: string, enabled: boolean): Promise<void> => {
    if (!updateToolEnabled) return

    setLoading(true)
    try {
      const result = await updateToolEnabled(toolName, enabled)
      if (result.success) {
        setTools((prevTools) =>
          prevTools.map((tool) => (tool.name === toolName ? { ...tool, enabled } : tool))
        )
      }
    } catch (error) {
      console.error('Failed to update tool state:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="tools-list-wrapper">
      <div className="tools-search">
        <input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="tools-search-input"
        />
      </div>
      <div className="tools-list" data-testid="tools-list">
        {filteredTools.map((tool) => (
          <div className="tools-list-item" key={tool.name}>
            <div className="tools-list-item-header">
              {updateToolEnabled && (
                <label className="tools-list-item-toggle">
                  <input
                    type="checkbox"
                    checked={tool.enabled}
                    onChange={(e) => handleToggle(tool.name, e.target.checked)}
                    disabled={loading}
                  />
                </label>
              )}
              <div className="tools-list-item-name">{tool.name}</div>
            </div>
            <div className="tools-list-item-description">{tool.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Tools }
