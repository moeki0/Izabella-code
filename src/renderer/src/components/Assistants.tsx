import { useEffect, useState } from 'react'

export type Assistant = {
  name: string
  instructions: string
}

export type AssistantVariable = {
  name: string
  value: string
}

function Assistants(): React.JSX.Element {
  const [assistants, setAssistants] = useState<Array<Assistant>>([])
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    window.api.getConfig('assistants').then((result) => {
      setAssistants(result as Array<Assistant>)
    })
    window.api.getConfig('assistant').then((result) => {
      setCurrent(result as string)
    })
  }, [])

  return (
    <div className="assistants-list-inner" data-testid="assistants-list-inner">
      <div
        className={`assistants-list-item ${current === 'default' ? 'assistants-list-item-current' : ''}`}
        key={'default'}
        onClick={() => {
          window.api.setConfig('assistant', 'default')
          setCurrent('default')
        }}
      >
        Default
      </div>
      {assistants.map((a) => (
        <div
          className={`assistants-list-item ${current === a.name ? 'assistants-list-item-current' : ''}`}
          key={a.name}
          onClick={() => {
            window.api.setConfig('assistant', a.name)
            setCurrent(a.name)
          }}
        >
          {a.name}
        </div>
      ))}
    </div>
  )
}

export { Assistants }
