import { useEffect, useState } from 'react'

export type Tool = {
  name: string
  description: string
}

function Tools({ getTools }: { getTools: () => Promise<Array<Tool>> }): React.JSX.Element {
  const [tools, setTools] = useState<Array<Tool>>([])

  useEffect(() => {
    getTools().then((result) => {
      setTools(result)
    })
  }, [getTools])

  return (
    <div className="tools-list" data-testid="tools-list">
      {tools.map((tool) => (
        <div className="tools-list-item" key={tool.name}>
          <div className="tools-list-item-name">{tool.name}</div>
          <div className="tools-list-item-description">{tool.description}</div>
        </div>
      ))}
    </div>
  )
}

export { Tools }
