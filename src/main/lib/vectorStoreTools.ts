import { createTool } from '@mastra/core'
import { z } from 'zod'
import { SqliteVectorStore } from './vectorStore'
import { store } from './store'
import { TextMetadata } from './vectorStore'

let knowledgeStore: SqliteVectorStore | null = null

const getKnowledgeStore = (): SqliteVectorStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new SqliteVectorStore(openaiApiKey)
  }
  return knowledgeStore
}

// 再利用可能なナレッジ保存関数の型定義
export interface KnowledgeSearchAndUpsertParams {
  text: string
  id: string
  metadata?: Record<string, unknown>
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
export async function saveToKnowledgeBase(
  params: KnowledgeSearchAndUpsertParams
): Promise<KnowledgeOperationResult> {
  try {
    const { text, id, metadata = {}, similarityThreshold = 0.85 } = params

    const knowledgeStore = getKnowledgeStore()

    // 類似コンテンツの検索
    const searchResults = await knowledgeStore.search(text, 1)

    // 類似コンテンツが見つかった場合は更新
    if (searchResults.length > 0) {
      const existingMetadata = searchResults[0].metadata

      // 結果が十分に類似しているか同じIDを持つ場合、そのエントリを更新
      if (existingMetadata.id === id || similarityThreshold <= 0.5) {
        const fullMetadata: TextMetadata = {
          id,
          text: existingMetadata.text,
          ...metadata
        }

        await knowledgeStore.upsertTexts([text], [fullMetadata])

        return {
          action: 'updated',
          id: id,
          originalId: existingMetadata.id
        }
      }
    }

    // 新しいエントリを挿入
    const fullMetadata: TextMetadata = {
      id,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      ...metadata
    }

    await knowledgeStore.addTexts([text], [fullMetadata])

    return {
      action: 'inserted',
      id: id
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to perform vector operation: ${errorMessage}`)
  }
}

export const vectorSearchAndUpsert: unknown = createTool({
  id: 'knowledge-search-and-upsert',
  inputSchema: z.object({
    indexName: z.string().describe('The name of the knowledge index to use'),
    text: z.string().describe('The text content to search for or store'),
    id: z.string().describe('A unique identifier for this content'),
    similarityThreshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.85)
      .describe('Similarity threshold for matching (0-1)')
  }),
  description:
    'Search for similar information in the knowledge database and update if match found, otherwise insert as new',
  execute: async ({ context: { text, id, similarityThreshold, indexName } }) => {
    // 新しい再利用可能な関数を使用
    return saveToKnowledgeBase({
      text,
      id,
      similarityThreshold,
      indexName
    })
  }
})

export const vectorSearch: unknown = createTool({
  id: 'knowledge-search',
  inputSchema: z.object({
    indexName: z.string().describe('The name of the knowledge index to use'),
    query: z.string().describe('The query text to search for'),
    limit: z.number().min(1).default(5).describe('Number of results to return')
  }),
  description: 'Search for similar information in the knowledge database and return the results',
  execute: async ({ context: { query, limit } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      const results = await knowledgeStore.search(query, limit)

      return {
        results: results.map((result) => ({
          content: result.pageContent,
          metadata: result.metadata
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to perform vector search: ${errorMessage}`)
    }
  }
})

// Knowledge delete tool
export const vectorDelete: unknown = createTool({
  id: 'knowledge-delete',
  inputSchema: z.object({
    indexName: z.string().describe('The name of the knowledge index to use'),
    ids: z.array(z.string()).describe('The IDs of the entries to delete')
  }),
  description: 'Delete information from the knowledge database by ID',
  execute: async ({ context: { ids } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      await knowledgeStore.deleteByIds(ids)

      return {
        deleted: ids
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to delete vectors: ${errorMessage}`)
    }
  }
})
