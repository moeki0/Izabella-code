import { useState } from 'react'
import { Tool, Tools } from './Tools'
import { Models } from './Models'

type Menu = 'tools' | 'assistants' | 'models'

function Menu({
  isOpen,
  getTools
}: {
  isOpen: boolean
  getTools: () => Promise<Array<Tool>>
}): React.JSX.Element {
  const [current, setCurrent] = useState('tools')

  if (!isOpen) {
    return <></>
  }

  return (
    <div className="menu-wrapper">
      <div className="menu" data-testid="menu">
        <div className="menu-header">
          <div
            className={`menu-header-item ${current === 'tools' ? 'menu-header-item-active' : ''}`}
            onClick={() => setCurrent('tools')}
          >
            Tools
          </div>
          <div
            className={`menu-header-item ${current === 'models' ? 'menu-header-item-active' : ''}`}
            onClick={() => setCurrent('models')}
          >
            Models
          </div>
        </div>
        <div>
          {current === 'tools' && <Tools getTools={getTools} />}
          {current === 'models' && <Models />}
        </div>
      </div>
    </div>
  )
}
export { Menu }
