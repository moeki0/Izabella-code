import { createTool } from '@mastra/core'
import { z } from 'zod'
import { HnswVectorStore } from './hnswVectorStore'
import { store } from './store'

let knowledgeStore: HnswVectorStore | null = null

const getKnowledgeStore = (): HnswVectorStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new HnswVectorStore(openaiApiKey)
  }
  return knowledgeStore
}

// 再利用可能なナレッジ保存関数の型定義
export interface KnowledgeSearchAndUpsertParams {
  text: string
  id: string
  similarityThreshold?: number
  indexName?: string
}

// 再利用可能なナレッジ保存関数
export interface KnowledgeOperationResult {
  action: 'inserted' | 'updated'
  id: string
  originalId?: string
}

// ナレッジベースに情報を保存する再利用可能な関数
export async function saveToKnowledgeBase(params: KnowledgeSearchAndUpsertParams): Promise<string> {
  try {
    const { text, id, similarityThreshold = 0.7 } = params

    const knowledgeStore = getKnowledgeStore()

    const searchResults = await knowledgeStore.search(text, 1)

    if (searchResults.length > 0 && searchResults[0]._similarity > similarityThreshold) {
      await knowledgeStore.upsertTexts([text], [id])

      return JSON.stringify({
        action: 'updated',
        id: id
      })
    }

    await knowledgeStore.addTexts([text], [id])

    return JSON.stringify({
      action: 'inserted',
      id: id
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to perform vector operation: ${errorMessage}`)
  }
}

export const vectorSearchAndUpsert: unknown = createTool({
  id: 'knowledge_search_and_upsert',
  inputSchema: z.object({
    indexName: z.string().describe('The name of the knowledge index to use'),
    text: z.string().describe('The text content to search for or store'),
    id: z.string().describe('A unique identifier for this content'),
    similarityThreshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.5)
      .describe('Similarity threshold for matching (0-1)')
  }),
  description:
    'Search for similar information in the knowledge database and update if match found, otherwise insert as new',
  execute: async ({ context: { text, id, similarityThreshold } }) => {
    // 新しい再利用可能な関数を使用
    return saveToKnowledgeBase({
      text,
      id,
      similarityThreshold
    })
  }
})

export const vectorSearch: unknown = createTool({
  id: 'knowledge_search',
  inputSchema: z.object({
    query: z.string().describe('The query text to search for'),
    limit: z.number().min(1).default(5).describe('Number of results to return')
  }),
  description: 'Search for similar information in the knowledge database and return the results',
  execute: async ({ context: { query, limit } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      const results = await knowledgeStore.search(query, limit)

      return JSON.stringify({
        results: results.map((result) => ({
          content: result.pageContent,
          id: result.id,
          // 類似度も含める（LLMがより良い判断をするために）
          similarity: result._similarity
        }))
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to perform vector search: ${errorMessage}`)
    }
  }
})

// Knowledge delete tool
export const vectorDelete: unknown = createTool({
  id: 'knowledge_delete',
  inputSchema: z.object({
    ids: z.array(z.string()).describe('The IDs of the entries to delete')
  }),
  description: 'Delete information from the knowledge database by ID',
  execute: async ({ context: { ids } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      await knowledgeStore.deleteByIds(ids)

      return JSON.stringify({
        deleted: ids
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to delete vectors: ${errorMessage}`)
    }
  }
})
