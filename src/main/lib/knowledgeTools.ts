import { createTool } from '@mastra/core'
import { z } from 'zod'
import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'
import { store } from './store'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { generateKnowledgeId } from './generateKnowledgeId'
import log from 'electron-log/main'

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
  action: 'inserted' | 'updated' | 'merged'
  id: string
  originalId?: string
}

// Helper function to merge knowledge texts
async function mergeKnowledge(existingText: string, newText: string): Promise<string> {
  try {
    const model = google('gemini-2.0-flash')

    const systemPrompt = `あなたは2つのナレッジテキストをマージする専門家です。以下のルールに従ってください：
1. 既存の情報と新しい情報の両方を維持するように努めてください
2. 情報に矛盾がある場合は、新しい情報を優先してください
3. 重複を排除し、情報を整理してください
4. 結果は簡潔で読みやすく、整形してください
5. 元のテキストのスタイルとトーンを維持してください`

    const userPrompt = `既存のナレッジ:
---
${existingText}
---

新しいナレッジ:
---
${newText}
---

これらの情報をマージして、重複を排除し、矛盾がある場合は新しい情報を優先した統合テキストを作成してください。`

    const response = await generateObject({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      schema: z.object({
        merged_text: z.string().describe('マージされたナレッジテキスト')
      })
    })

    return response.object.merged_text
  } catch (error) {
    log.error('Error merging knowledge:', error)
    // Fallback to using the new text if merging fails
    return newText
  }
}

// Helper function to generate a new ID for merged content
async function generateIdForMergedContent(mergedText: string): Promise<string> {
  try {
    // Generate a new ID based on the merged content
    const newId = await generateKnowledgeId(mergedText)
    log.info(`Generated new ID for merged content: ${newId}`)
    return newId
  } catch (error) {
    log.error('Error generating ID for merged content:', error)
    // Create a fallback ID using timestamp
    const fallbackId = `merged-knowledge-${Date.now()}`
    log.info(`Using fallback ID: ${fallbackId}`)
    return fallbackId
  }
}

export async function saveToKnowledgeBase(params: KnowledgeSearchAndUpsertParams): Promise<string> {
  try {
    const { text, id, similarityThreshold = 0.7 } = params

    const knowledgeStore = getKnowledgeStore()

    const searchResults = await knowledgeStore.search(text)

    if (searchResults.length > 0 && searchResults[0]._similarity > similarityThreshold) {
      // Found similar existing knowledge
      const existingId = searchResults[0].id
      const existingText = searchResults[0].pageContent

      // Merge the existing text with the new text
      const mergedText = await mergeKnowledge(existingText, text)

      // Generate a new ID based on the merged content
      const mergedId = await generateIdForMergedContent(mergedText)

      // Update with merged content and new ID
      await knowledgeStore.upsertText(mergedText, mergedId, existingId)

      return JSON.stringify({
        action: 'merged',
        id: mergedId,
        originalId: existingId
      })
    } else if (searchResults.length > 0 && searchResults[0]._similarity > 0.5) {
      // Found somewhat similar content, but not similar enough to merge automatically
      await knowledgeStore.upsertText(text, id, searchResults[0].id)

      return JSON.stringify({
        action: 'updated',
        id: id,
        originalId: searchResults[0].id
      })
    }

    // No similar content found, insert as new
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

// New tools for agent-based knowledge management

export const createKnowledge: unknown = createTool({
  id: 'create_knowledge',
  inputSchema: z.object({
    text: z.string().describe('知識として保存するテキスト内容'),
    id: z.string().describe(`知識のユニークID
- 内容を簡潔に表すもの
- ハイフン（-）を使用して単語を区切る
- 小文字のみ使用
- 英数字、日本語、ハイフンのみ使用可能
- 最大100文字まで

例:
- project-design-decisions
- user-preferences-ui
- development-timeline-2025
      `)
  }),
  description:
    '会話から抽出した知識を新しいエントリとして作成します。ユーザーとの会話から重要な情報を識別した場合に使用してください。',
  execute: async ({ context: { text, id } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()

      // 新しい知識エントリを作成
      await knowledgeStore.addTexts([text], [id])

      return JSON.stringify({
        action: 'created',
        id: id
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Knowledge creation failed: ${errorMessage}`)
    }
  }
})

export const updateKnowledge: unknown = createTool({
  id: 'update_knowledge',
  inputSchema: z.object({
    text: z.string().describe('更新された知識テキスト'),
    id: z.string().describe('更新する知識エントリのID'),
    targetId: z.string().describe('置き換える対象の知識エントリのID')
  }),
  description:
    '既存の知識エントリを更新します。新しい情報で既存の知識を更新する必要がある場合に使用してください。',
  execute: async ({ context: { text, id, targetId } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()

      // 既存の知識エントリを新しい内容で更新
      await knowledgeStore.upsertText(text, id, targetId)

      return JSON.stringify({
        action: 'updated',
        id: id,
        originalId: targetId
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Knowledge update failed: ${errorMessage}`)
    }
  }
})

export const deleteKnowledge: unknown = createTool({
  id: 'delete_knowledge',
  inputSchema: z.object({
    ids: z.array(z.string()).describe('削除する知識エントリのID配列')
  }),
  description:
    '指定されたIDの知識エントリを削除します。古くなった情報や不要になった情報を削除する場合に使用してください。',
  execute: async ({ context: { ids } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      await knowledgeStore.deleteByIds(ids)

      return JSON.stringify({
        deleted: ids,
        action: 'deleted'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Knowledge deletion failed: ${errorMessage}`)
    }
  }
})

export const searchKnowledge: unknown = createTool({
  id: 'search_knowledge',
  inputSchema: z.object({
    query: z.string().describe('検索クエリテキスト'),
    limit: z.number().min(1).default(5).describe('取得する結果の数')
  }),
  description:
    'ナレッジデータベースから類似情報を検索して結果を返します。会話のコンテキストに関連する情報を検索するために使用してください。',
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
      throw new Error(`Knowledge search failed: ${errorMessage}`)
    }
  }
})

// Legacy tools maintained for backward compatibility

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
