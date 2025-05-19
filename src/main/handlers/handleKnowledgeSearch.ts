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

export const handleKnowledgeSearch = (): void => {
  ipcMain.handle('search-knowledge', async (_, query: string, limit = 20) => {
    try {
      const store = getKnowledgeStore()
      const results = await store.search(query, limit)

      return {
        results: results.map((result) => ({
          content: result.pageContent,
          id: result.id,
          similarity: result._similarity,
          created_at: result.created_at
        }))
      }
    } catch (error) {
      console.error('Knowledge search error:', error)
      throw new Error(`Knowledge search failed: ${error}`)
    }
  })
}
