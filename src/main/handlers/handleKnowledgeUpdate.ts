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

export const handleKnowledgeUpdate = (): void => {
  ipcMain.handle('update-knowledge', async (_, text: string, id: string, targetId: string) => {
    try {
      const store = getKnowledgeStore()
      await store.upsertText(text, id, targetId)

      return {
        action: 'updated',
        id,
        originalId: targetId
      }
    } catch (error) {
      console.error('Knowledge update error:', error)
      throw new Error(`Knowledge update failed: ${error}`)
    }
  })
}
