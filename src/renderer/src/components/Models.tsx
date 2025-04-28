import { useEffect, useState } from 'react'

function Models(): React.JSX.Element {
  const [models, setModels] = useState<Array<string>>([])
  const [current, setCurrent] = useState<string | null>(null)

  useEffect(() => {
    window.api.getConfig('models').then((result) => {
      setModels(result as Array<string>)
    })
    window.api.getConfig('model').then((result) => {
      setCurrent(result as string)
    })
  }, [])

  return (
    <div className="assistants-list-inner">
      {models.map((m) => (
        <div
          className={`assistants-list-item ${current === m ? 'assistants-list-item-current' : ''}`}
          key={m}
          onClick={() => {
            window.api.setConfig('model', m)
            setCurrent(m)
          }}
        >
          {m}
        </div>
      ))}
    </div>
  )
}

export { Models }
