import { useEffect, useState } from 'react'

export type Tool = {
  name: string
  description: string
}

function Tools({ getTools }: { getTools: () => Promise<Array<Tool>> }): React.JSX.Element {
  const [tools, setTools] = useState<Array<Tool>>([])
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    getTools().then((result) => {
      setTools(result)
    })
  }, [getTools])

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
            <div className="tools-list-item-name">{tool.name}</div>
            <div className="tools-list-item-description">{tool.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Tools }
