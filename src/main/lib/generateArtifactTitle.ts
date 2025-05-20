import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export async function generateArtifactTitle(content: string): Promise<string> {
  try {
    // コンテンツが短い場合は簡易処理
    if (content.length < 100) {
      const firstLine = content.split('\n')[0].trim()
      // 先頭行が見出しの場合は#を除去
      if (firstLine.startsWith('#')) {
        return firstLine
          .replace(/^#+\s*/, '')
          .trim()
          .substring(0, 50)
      }
      return firstLine.substring(0, 50)
    }

    // Geminiモデルを使用してタイトルを生成
    const geminiModel = 'gemini-2.0-flash'
    const model = google(geminiModel)

    const result = await generateObject({
      model,
      schema: z.object({
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
      temperature: 0,
      prompt: `
以下のコンテンツに最適なIDを生成してください。
IDは50文字以内の簡潔で具体的なものにし、内容を適切に表現してください。
ファイル名として使用されるため、特殊文字は避けてください。

コンテンツ:
${content}

タイトルを生成してください。
`
    })

    // 生成されたタイトルを返す
    return result.object.id
  } catch (error) {
    console.error('タイトル生成エラー:', error)
    // エラー時はタイムスタンプを含むデフォルトタイトルを返す
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `メモ ${timestamp}`
  }
}
