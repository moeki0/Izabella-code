import { openai } from '@ai-sdk/openai'
import { store } from './store'
import { generateObject } from 'ai'
import { z } from 'zod'

export async function generateKnowledgeId(content: string, toolName: string): Promise<string> {
  try {
    const model = openai('gpt-4o-mini')

    // Prepare the content for analysis - truncate if too long
    const maxLength = 5000
    const truncatedContent =
      content.length > maxLength ? content.substring(0, maxLength) + '... (truncated)' : content

    const prompt = `
このテキストの内容を分析して、簡潔で記述的なIDを生成してください。
このIDはナレッジベースで使用され、内容を短く表現する必要があります。

このデータはツール「${toolName}」の結果です。

内容:
${truncatedContent}

以下の特性を持つIDを作成してください:
- 内容の要約
- スペースや特殊文字の代わりにハイフン(-)を使用
- すべて小文字
- 英数字、日本語の平仮名・漢字、ハイフンのみ使用可
- 長さは100文字以内

例:
- 東京の2023年8月の気象データ
- ChatGPTのAPIリファレンス
- プロジェクト計画の設計フェーズ
`

    const result = await generateObject({
      model,
      temperature: 0.1,
      schema: z.object({
        id: z.string().max(100)
      }),
      prompt
    })

    const generatedId = result.object.id
    return generatedId
  } catch (error) {
    console.error('Error generating knowledge ID:', error)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `tool-result-${toolName}-${timestamp}`
  }
}
