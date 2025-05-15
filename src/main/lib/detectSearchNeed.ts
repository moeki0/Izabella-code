import { google } from '@ai-sdk/google'
import { getMessages } from './message'
import { generateObject } from 'ai'
import { z } from 'zod'

export const detectSearchNeed = async (input: string): Promise<boolean> => {
  try {
    const model = google('gemini-2.0-flash')
    const recentMessages = await getMessages(3)
    const result = await generateObject({
      model,
      schema: z.object({
        search: z.boolean()
      }),
      temperature: 0,
      prompt: `
あなたはウェブ検索が必要かどうかを判断するシステムです。
外部情報（ファイル、コード）の読み書きをユーザーが要求する場合やユーザーの個人的な情報（ナレッジ）を検索する場合は、search: false（デフォルト）を返してください。
ユーザーの質問に対して、最新の情報、ニュース、ファクトチェック、データが必要な場合は search: true を返してください。
ユーザーの質問: ${input}
履歴: ${JSON.stringify(recentMessages)}`
    })
    return result.object.search
  } catch {
    return false
  }
}
