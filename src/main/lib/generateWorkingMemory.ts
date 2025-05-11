import { generateObject } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'
import log from 'electron-log/main'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 会話履歴とワーキングメモリを元に、更新されたワーキングメモリを生成する
 */
export async function generateUpdatedWorkingMemory(
  conversationHistory: ConversationMessage[]
): Promise<string | Error> {
  try {
    // 会話履歴が短すぎる場合は処理しない
    if (conversationHistory.length < 2) {
      return new Error('会話履歴が不十分です')
    }

    // 現在のワーキングメモリを取得
    const currentMemory = await readWorkingMemory()

    const systemPrompt = `あなたは、AIアシスタントIZABELLAのワーキングメモリを更新する専門家です。
ワーキングメモリには、これまでの会話から得られた重要な情報を保存し、IZABELLAが後で参照できるようにします。

以下の現在のワーキングメモリと最近の会話履歴に基づいて、ワーキングメモリを更新してください。

考慮事項：
- 現在のメモリの構造と形式を維持してください。
- 新しい情報を追加し、古い情報を最新の状態に更新してください。
- 同じ情報を重複して追加しないでください。
- ユーザーに関する情報、プロジェクトの状況、タスク、決定事項などの重要な情報に焦点を当ててください。
- 一時的な挨拶や会話の流れを維持するための定型句などの重要でない情報は除外してください。
- 最新の会話で言及された情報が既存のメモリと矛盾する場合は、最新の情報で更新してください。

最終的な出力としては、すべてのセクションを含む完全なワーキングメモリの内容を返してください。`

    // LLMを使用してワーキングメモリを更新
    const model = google('gemini-2.5-flash-preview-04-17')

    // 会話履歴をフォーマット
    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: `現在のワーキングメモリ:
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

    log.info('Working memory generation result:', result)

    return result.object.updated_memory
  } catch (error) {
    log.error('Error generating working memory:', error)
    return error as Error
  }
}

/**
 * 会話履歴からワーキングメモリを更新して保存する
 * @returns 更新が成功したかどうか
 */
export async function processConversationForWorkingMemory(
  conversationHistory: ConversationMessage[]
): Promise<boolean> {
  try {
    // 会話履歴が短すぎる場合は処理しない
    if (conversationHistory.length < 2) {
      return false
    }

    const updatedMemoryResult = await generateUpdatedWorkingMemory(conversationHistory)

    if (updatedMemoryResult instanceof Error) {
      log.error('Working memory generation failed:', updatedMemoryResult)
      return false
    }

    // ワーキングメモリを更新
    await updateWorkingMemory(updatedMemoryResult)
    log.info('Working memory updated successfully')

    return true
  } catch (error) {
    log.error('Error processing conversation for working memory:', error)
    return false
  }
}
