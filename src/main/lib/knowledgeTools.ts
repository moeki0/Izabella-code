import { createTool } from '@mastra/core'
import { z } from 'zod'
import { KnowledgeStore } from './knowledgeStore'
import { store } from './store'

let knowledgeStore: KnowledgeStore | null = null

const getKnowledgeStore = (): KnowledgeStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new KnowledgeStore(openaiApiKey)
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

