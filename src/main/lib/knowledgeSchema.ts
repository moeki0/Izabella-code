import { z } from 'zod'

export const knowledgeEntrySchema = z.object({
  id: z.string().describe(`抽出した情報の簡潔なID(英数字とハイフン)`),
  content: z
    .string()
    .describe(
      'ナレッジとして保存すべき具体的なテキスト内容。会話から関連部分を正確に抽出するか、簡潔に要約してください。'
    ),
  relevance_score: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      '現在の会話履歴におけるこの情報の重要度を1〜5のスケールで評価してください（5が最も重要）'
    ),
  importance: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('ナレッジの蓄積的な重要度。参照されるたびに増加します。'),
  abstract: z
    .array(z.string())
    .optional()
    .describe('このエピソード記憶に関連する抽象記憶のIDの配列'),
  is_abstract: z.boolean().optional().default(false).describe('抽象記憶かどうかを示すフラグ')
})

export const knowledgeExtractionSchema = z.object({
  knowledge_entries: z
    .array(knowledgeEntrySchema)
    .describe(
      'ナレッジとして保存すべき情報のリスト。保存すべき情報がない場合は空の配列にしてください。'
    )
})

export const abstractKnowledgeSchema = z.object({
  id: z.string().describe('抽象記憶の一意なID'),
  content: z.string().describe('会話履歴から抽象化された概念や重要な情報'),
  episode: z.array(z.string()).describe('この抽象記憶に関連するエピソード記憶のIDの配列'),
  is_abstract: z.literal(true).describe('これが抽象記憶であることを示す')
})

export const abstractionRequestSchema = z.object({
  conversations: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })
    )
    .describe('抽象化するユーザーとアシスタントの会話履歴'),
  knowledge_ids: z.array(z.string()).describe('抽象化するエピソード記憶のID')
})

export type KnowledgeEntry = z.infer<typeof knowledgeEntrySchema>
export type KnowledgeExtractionResult = z.infer<typeof knowledgeExtractionSchema>
export type AbstractKnowledge = z.infer<typeof abstractKnowledgeSchema>
export type AbstractionRequest = z.infer<typeof abstractionRequestSchema>
