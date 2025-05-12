import { generateObject } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'
import log from 'electron-log/main'
import { mainWindow } from '..'

const MEMORY_CHARACTER_LIMIT = 8000

/**
 * チェックして必要に応じてワーキングメモリを圧縮する
 */
export async function checkAndCompressWorkingMemory(): Promise<boolean> {
  try {
    const currentMemory = await readWorkingMemory()

    // 文字数が制限を超えているかチェック
    if (currentMemory.length <= MEMORY_CHARACTER_LIMIT) {
      return false
    }

    // 圧縮を実行
    const compressedMemory = await compressWorkingMemory()

    if (compressedMemory instanceof Error) {
      log.error('Working memory compression failed:', compressedMemory)
      return false
    }

    // 圧縮されたメモリを保存
    await updateWorkingMemory(compressedMemory)

    // UI通知を送信
    mainWindow.webContents.send('memory-compressed', {
      before: currentMemory.length,
      after: compressedMemory.length
    })

    log.info('Working memory compressed successfully')
    return true
  } catch (error) {
    log.error('Error checking and compressing working memory:', error)
    return false
  }
}

/**
 * ワーキングメモリを圧縮する
 */
export async function compressWorkingMemory(): Promise<string | Error> {
  try {
    // 現在のワーキングメモリを取得
    const currentMemory = await readWorkingMemory()

    if (currentMemory.length <= MEMORY_CHARACTER_LIMIT) {
      return currentMemory
    }

    const systemPrompt = `あなたは、AIアシスタントIZABELLAのワーキングメモリを圧縮する専門家です。
ユーザーとの会話から得られた重要な情報が含まれていますが、サイズが大きくなりすぎています。
半分のサイズに要約・圧縮してください。

考慮事項：
- 現在のメモリの構造と形式を維持してください。
- 最も重要な情報を残し、冗長な情報や詳細な例を削減してください。
- 各セクションのバランスを保ちながら、内容を簡潔にしてください。
- 圧縮しながらも、重要な文脈や詳細は保持してください。
- 抽象的になりすぎないようにしてください。
- 可能な限り具体的な名前、プロジェクト、場所などは保持してください。

最終的な出力としては、半分のサイズのすべてのセクションを含む完全なワーキングメモリの内容を返してください。`

    // LLMを使用してワーキングメモリを圧縮
    const model = google('gemini-2.0-flash-lite')

    const formattedMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: `現在のワーキングメモリ（${currentMemory.length}文字）:
${currentMemory}

このワーキングメモリを半分のサイズに圧縮してください。`
      }
    ]

    const result = await generateObject({
      model,
      messages: formattedMessages,
      schema: z.object({
        compressed_memory: z.string().describe('圧縮されたワーキングメモリの内容')
      })
    })

    log.info('Working memory compression result:', {
      before: currentMemory.length,
      after: result.object.compressed_memory.length
    })

    return result.object.compressed_memory
  } catch (error) {
    log.error('Error compressing working memory:', error)
    return error as Error
  }
}
