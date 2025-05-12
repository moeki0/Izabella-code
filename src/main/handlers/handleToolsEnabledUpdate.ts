import { store } from '../lib/store'

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

    return { success: true }
  } catch (error) {
    console.error('Failed to update enabled tools:', error)
    return { success: false }
  }
}
