import { Tool, Tools } from './Tools'

function Menu({
  isOpen,
  getTools
}: {
  isOpen: boolean
  getTools: () => Promise<Array<Tool>>
}): React.JSX.Element {
  if (!isOpen) {
    return <></>
  }

  return (
    <div className="menu-wrapper">
      <div className="menu" data-testid="menu">
        <Tools getTools={getTools} />
      </div>
    </div>
  )
}
export { Menu }
