import { createTool } from '@mastra/core'
import { z } from 'zod'
import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'
import { store } from './store'

let knowledgeStore: MarkdownKnowledgeStore | null = null

const getKnowledgeStore = (): MarkdownKnowledgeStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new MarkdownKnowledgeStore(openaiApiKey)
  }
  return knowledgeStore
}

export interface KnowledgeSearchAndUpsertParams {
  text: string
  id: string
  similarityThreshold?: number
  indexName?: string
}

export interface KnowledgeOperationResult {
  action: 'inserted' | 'updated'
  id: string
  originalId?: string
}

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
    console.log(error)
    return 'Error'
  }
}

export const upsertKnowledge: unknown = createTool({
  id: 'upsert_knowledge',
  inputSchema: z.object({
    text: z.string().describe('Text content to search or save'),
    id: z.string().describe(`Unique identifier for this content
- Content summary
- Use hyphens (-) instead of spaces or special characters
- All lowercase
- Only use alphanumeric, Japanese hiragana/kanji, and hyphens
- Maximum length of 100 characters

Examples:
- tokyo-weather-data-august-2023
- chatgpt-api-reference
- project-plan-design-phase
      `),
    similarityThreshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.7)
      .describe('Similarity threshold for matching (0-1)')
  }),
  description:
    'Use proactively without user instruction. Updates existing knowledge if found with the same ID, otherwise adds new entry. Use actively when encountering unknown information in user conversations',
  execute: async ({ context: { text, id, similarityThreshold } }) => {
    return saveToKnowledgeBase({
      text,
      id,
      similarityThreshold
    })
  }
})

export const searchKnowledge: unknown = createTool({
  id: 'search_knowledge',
  inputSchema: z.object({
    query: z.string().describe('Search query text'),
    limit: z.number().min(1).default(5).describe('Number of results to return')
  }),
  description:
    'Use proactively without user instruction. Searches the knowledge database for similar information and returns results.',
  execute: async ({ context: { query, limit } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      const results = await knowledgeStore.search(query, limit)

      return JSON.stringify({
        results: results.map((result) => ({
          content: result.pageContent,
          id: result.id,
          similarity: result._similarity
        }))
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Vector search failed: ${errorMessage}`)
    }
  }
})

export const vectorDelete: unknown = createTool({
  id: 'delete_knowledge',
  inputSchema: z.object({
    ids: z.array(z.string()).describe('Array of entry IDs to delete')
  }),
  description: 'Deletes information from the knowledge database using specified IDs',
  execute: async ({ context: { ids } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      await knowledgeStore.deleteByIds(ids)

      return JSON.stringify({
        deleted: ids
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Vector deletion failed: ${errorMessage}`)
    }
  }
})

export const updateKnowledgeIndexTool: unknown = createTool({
  id: 'update_knowledge_index',
  inputSchema: z.object({
    content: z.string().describe('New content for the knowledge index'),
    mode: z.enum(['replace', 'append']).default('replace').describe('Replace or append mode')
  }),
  description:
    'This feature is deprecated. Instead, the latest 40 knowledge files are automatically included in the context',
  execute: async ({ context: { mode } }) => {
    console.log('updateKnowledgeIndexTool is deprecated and has no effect')

    return JSON.stringify({
      success: true,
      message:
        'Knowledge index updates are no longer needed. The latest 40 knowledge files are automatically included in the context.',
      mode
    })
  }
})
