import { store } from '../lib/store'
import log from 'electron-log/main'

export const handleSearchGroundingUpdate = (enabled: boolean): { success: boolean } => {
  try {
    store.set('useSearchGrounding', enabled)
    log.info(`Updated search grounding: ${enabled ? 'enabled' : 'disabled'}`)
    return { success: true }
  } catch (error) {
    log.error('Failed to update search grounding setting:', error)
    return { success: false }
  }
}
