const EditorView = (): void => {}
export { EditorView }
// eslint-disable-next-line react-refresh/only-export-components
export const component = ({ onChange, onKeyDown }): React.JSX.Element => (
  <textarea
    placeholder="ChatZen"
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
  />
)
// eslint-disable-next-line react-refresh/only-export-components
export default component
