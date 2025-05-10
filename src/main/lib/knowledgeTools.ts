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
    text: z.string().describe('検索または保存するテキストコンテンツ'),
    id: z.string().describe('このコンテンツの一意の識別子'),
    similarityThreshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.7)
      .describe('マッチングの類似度閾値（0-1）')
  }),
  description:
    '****ユーザーからの指示ではなく自発的に利用してください****。ナレッジデータベース上に同じIDのナレッジが一致が見つかった場合は更新、見つからない場合は新規追加します。ユーザーとの会話で未知の情報に遭遇した際には積極的に使用してください',
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
    query: z.string().describe('検索クエリテキスト'),
    limit: z.number().min(1).default(5).describe('返す結果の数')
  }),
  description:
    '****ユーザーからの指示ではなく自発的に利用してください****。ナレッジデータベースで類似情報を検索し、結果を返します。',
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
      throw new Error(`ベクトル検索に失敗しました: ${errorMessage}`)
    }
  }
})

export const vectorDelete: unknown = createTool({
  id: 'delete_knowledge',
  inputSchema: z.object({
    ids: z.array(z.string()).describe('削除するエントリのID配列')
  }),
  description: 'IDを指定してナレッジデータベースから情報を削除します',
  execute: async ({ context: { ids } }) => {
    try {
      const knowledgeStore = getKnowledgeStore()
      await knowledgeStore.deleteByIds(ids)

      return JSON.stringify({
        deleted: ids
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`ベクトルの削除に失敗しました: ${errorMessage}`)
    }
  }
})

export const updateKnowledgeIndexTool: unknown = createTool({
  id: 'update_knowledge_index',
  inputSchema: z.object({
    content: z.string().describe('ナレッジインデックスの新しい内容'),
    mode: z.enum(['replace', 'append']).default('replace').describe('置換または追加モード')
  }),
  description:
    'この機能は使用されなくなりました。代わりに、最新の40件のナレッジファイルがコンテキストに自動的に含まれます',
  execute: async ({ context: { mode } }) => {
    console.log('updateKnowledgeIndexTool is deprecated and has no effect')

    return JSON.stringify({
      success: true,
      message:
        'ナレッジインデックスの更新は不要になりました。最新の40件のナレッジファイルが自動的にコンテキストに含まれます。',
      mode
    })
  }
})
