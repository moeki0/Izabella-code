import { store } from './store'

const initialize = (name: string, value): void => {
  if (store.get(name) === undefined) {
    store.set(name, value)
  }
}

export const initializeConfig = (): void => {
  initialize('instructions', '')
  initialize('apiKeys', { google: '' })
  initialize('mcpServers', [])
  initialize('maxSteps', 10)
  initialize('tokenLimit', 127000)
  initialize('useSearchGrounding', true)
}
