import { store } from './store'

const initialize = (name: string, value): void => {
  if (store.get(name) === undefined) {
    store.set(name, value)
  }
}

export const initializeConfig = (): void => {
  initialize('model', 'gpt-4o-mini')
  initialize('models', ['gpt-4o-mini'])
  initialize('instructions', '')
  initialize('assistant', '')
  initialize('assistants', [])
  initialize('apiKeys', { openai: '', anthropic: '', google: '' })
  initialize('mcpServers', [])
  initialize('maxSteps', 10)
  initialize('tokenLimit', 127000)
}
