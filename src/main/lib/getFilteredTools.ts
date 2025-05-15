import { tools } from './initializeMCP'
import { store } from './store'

export const getFilteredTools = (): Record<string, unknown> => {
  const enabledTools = store.get('enabledTools') as string[] | undefined

  if (!enabledTools || enabledTools.length === 0) {
    return {}
  }

  const filteredTools = Object.entries(tools).reduce((filtered, [name, tool]) => {
    if (enabledTools.includes(name)) {
      filtered[name] = tool
    }
    return filtered
  }, {})

  return filteredTools
}
