import { store } from './store'

const initialize = (name: string, value): void => {
  if (store.get(name) === undefined) {
    store.set(name, value)
  }
}

export const initializeConfig = (): void => {
  initialize('apiKeys', { google: '', openai: '' })
  initialize('mcpServers', [])
  initialize('enabledTools', [])
}
