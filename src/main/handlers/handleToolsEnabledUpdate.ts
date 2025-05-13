import { store } from '../lib/store'
import log from 'electron-log/main'

export const handleToolsEnabledUpdate = (
  toolName: string,
  enabled: boolean
): { success: boolean } => {
  try {
    // Get current enabled tools
    const enabledTools = (store.get('enabledTools') as string[] | undefined) || []

    // Update enabled tools based on the request
    if (enabled && !enabledTools.includes(toolName)) {
      // Add tool to enabled list
      enabledTools.push(toolName)
    } else if (!enabled && enabledTools.includes(toolName)) {
      // Remove tool from enabled list
      const index = enabledTools.indexOf(toolName)
      enabledTools.splice(index, 1)
    }

    store.set('enabledTools', enabledTools)
    log.info(`Updated tool enablement: ${toolName} is now ${enabled ? 'enabled' : 'disabled'}`)

    return { success: true }
  } catch (error) {
    log.error('Failed to update enabled tools:', error)
    return { success: false }
  }
}
