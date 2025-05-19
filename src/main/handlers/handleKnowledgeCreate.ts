import { ipcMain } from 'electron'
import { store } from '../lib/store'
import { KnowledgeStore } from '../lib/knowledgeStore'

let knowledgeStore: KnowledgeStore | null = null

// KnowledgeStore シングルトンの取得
const getKnowledgeStore = (): KnowledgeStore => {
  if (knowledgeStore === null) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new KnowledgeStore(openaiApiKey)
  }
  return knowledgeStore
}

export const handleKnowledgeCreate = (): void => {
  ipcMain.handle('create-knowledge', async (_, text: string, id: string) => {
    try {
      const store = getKnowledgeStore()
      await store.addTexts([text], [id])

      return {
        action: 'created',
        id
      }
    } catch (error) {
      console.error('Knowledge creation error:', error)
      throw new Error(`Knowledge creation failed: ${error}`)
    }
  })
}
