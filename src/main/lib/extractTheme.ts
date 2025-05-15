import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { Message } from './message'
import { readWorkingMemory } from './workingMemory'

export interface MessageWithTheme {
  role: string
  content: string
  metadata?: {
    theme?: string
  }
}

export async function extractTheme(
  recentMessages: { role: string; content: string }[],
  previousTheme?: string
): Promise<string> {
  try {
    const model = google('gemini-2.5-flash-preview-04-17')
    const messages = recentMessages.slice(-6)
    const messagesText = messages
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`)
      .join('\n\n')
    const prompt = `
あなたは会話のテーマを抽出するシステムです。
会話内容とワーキングメモリの両方を考慮して、最も関連性の高いテーマを抽出してください。特に、会話がワーキングメモリ内のプロジェクトやタスクに関連する場合は、それらの名称をテーマに含めることを検討してください。
以下のユーザーとアシスタントの会話から、その会話の全体的なテーマを抽出してください。テーマは固有名詞も含めて具体的にしてください。
会話内容と関連性の高いワーキングメモリの情報（例: プロジェクト名）を含めて具体的に記述してください。

ワーキングメモリ:
${await readWorkingMemory()}

以前のテーマ: ${previousTheme || 'なし'}

=== 最近の会話 ===
${messagesText}
==================

会話のテーマは何ですか？前回と同じテーマの場合はそのまま返してください。`

    const result = await generateObject({
      model,
      schema: z.object({
        theme: z.string()
      }),
      temperature: 0,
      prompt
    })

    return result.object.theme
  } catch (error) {
    return previousTheme || '一般的な会話'
  }
}

export function parseMessageMetadata(message: Message): Record<string, unknown> {
  if (!message.metadata) return {}

  try {
    return JSON.parse(message.metadata)
  } catch {
    return {}
  }
}

export function getThemeFromMetadata(message: Message): string | undefined {
  const metadata = parseMessageMetadata(message)
  const theme = metadata.theme as string | undefined
  return theme
}

export function createMessageContent(message: Message): string {
  if (!message.content) return ''

  try {
    const parsed = JSON.parse(message.content)
    return parsed.content || ''
  } catch {
    return message.content
  }
}

export function prepareMessageWithMetadata(
  originalContent: string,
  metadata: Record<string, unknown>
): string {
  const messageObj = {
    content: originalContent,
    metadata
  }

  return JSON.stringify(messageObj)
}
