import { z } from 'zod'

export const knowledgeEntrySchema = z.object({
  id: z.string().describe(`抽出した情報の簡潔なID(英数字とハイフン)`),
  content: z
    .string()
    .describe(
      'ナレッジとして保存すべき具体的なテキスト内容。会話から関連部分を正確に抽出するか、簡潔に要約してください。'
    ),
  importance: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(0)
    .describe('ナレッジの重要度を0-100で評価（100が最も重要）')
})

export const knowledgeExtractionSchema = z.object({
  knowledge_entries: z
    .array(knowledgeEntrySchema)
    .describe(
      'ナレッジとして保存すべき情報のリスト。保存すべき情報がない場合は空の配列にしてください。'
    )
})

export type KnowledgeEntry = z.infer<typeof knowledgeEntrySchema>
export type KnowledgeExtractionResult = z.infer<typeof knowledgeExtractionSchema>
