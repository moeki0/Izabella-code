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

export const handleKnowledgeDelete = (): void => {
  ipcMain.handle('delete-knowledge', async (_, ids: string[]) => {
    try {
      const store = getKnowledgeStore()
      await store.deleteByIds(ids)

      return {
        deleted: ids,
        action: 'deleted'
      }
    } catch (error) {
      console.error('Knowledge deletion error:', error)
      throw new Error(`Knowledge deletion failed: ${error}`)
    }
  })
}
