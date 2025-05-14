import { z } from 'zod'

export const knowledgeEntrySchema = z.object({
  title: z.string().describe(`抽出した情報の簡潔な名前

- 内容の要約
- 英数字、日本語の平仮名・漢字のみ使用可
- 長さは100文字以内

例:
- 東京の2023年8月の気象データ
- ChatGPTのAPIリファレンス
- プロジェクト計画の設計フェーズ`),
  content: z
    .string()
    .describe(
      'ナレッジとして保存すべき具体的なテキスト内容。会話から関連部分を正確に抽出。かなり長くても大丈夫です。'
    ),
  relevance_score: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe(
      '現在の会話履歴におけるこの情報の重要度を1〜5のスケールで評価してください（5が最も重要）'
    )
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
