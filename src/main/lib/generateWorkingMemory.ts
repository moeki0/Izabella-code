import { generateObject } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function generateUpdatedWorkingMemory(
  conversationHistory: ConversationMessage[]
): Promise<string | void> {
  try {
    if (conversationHistory.length < 2) {
      return
    }

    const currentMemory = await readWorkingMemory()
    const systemPrompt = `
あなたは、AIアシスタントIzabellaのワーキングメモリを更新する専門家です。
ワーキングメモリには、これまでの会話から得られた重要な情報を保存し、Izabellaが後で参照できるようにします。

以下の現在のワーキングメモリと最近の会話履歴に基づいて、ワーキングメモリを更新してください。

考慮事項：
- 現在のメモリの構造と形式を維持してください。
- ユーザーの基本情報のみを保存してください
- 新しい情報を追加し、古い情報を最新の状態に更新してください。
- 同じ情報を重複して追加しないでください。
- 一時的な挨拶や会話の流れを維持するための定型句などの重要でない情報は除外してください。
- 最新の会話で言及された情報が既存のメモリと矛盾する場合は、最新の情報で更新してください。
- コンテキストを圧迫しないように情報を圧縮して行ってください

最終的な出力としては、すべてのセクションを含む完全なワーキングメモリの内容を返してください。`

    const model = google('gemini-2.0-flash')
    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: `
現在のワーキングメモリ:
${currentMemory}

最近の会話履歴:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n')}`
      }
    ]

    const result = await generateObject({
      model,
      messages: formattedMessages,
      schema: z.object({
        updated_memory: z.string().describe('更新されたワーキングメモリの内容')
      })
    })

    return result.object.updated_memory
  } catch {
    return
  }
}

export async function processConversationForWorkingMemory(
  conversationHistory: ConversationMessage[]
): Promise<boolean> {
  try {
    if (conversationHistory.length < 2) {
      return false
    }
    const updatedMemoryResult = await generateUpdatedWorkingMemory(conversationHistory)
    if (updatedMemoryResult === undefined) {
      return false
    }
    await updateWorkingMemory(updatedMemoryResult)
    return true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return false
  }
}
