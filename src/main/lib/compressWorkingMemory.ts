import { generateObject } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'
import { mainWindow } from '..'

const MEMORY_CHARACTER_LIMIT = 8000

export async function checkAndCompressWorkingMemory(): Promise<boolean> {
  try {
    const currentMemory = await readWorkingMemory()

    if (currentMemory.length <= MEMORY_CHARACTER_LIMIT) {
      return false
    }

    const compressedMemory = await compressWorkingMemory()

    if (compressedMemory instanceof Error) {
      return false
    }

    await updateWorkingMemory(compressedMemory)

    mainWindow.webContents.send('memory-compressed', {
      before: currentMemory.length,
      after: compressedMemory.length
    })

    return true
  } catch {
    return false
  }
}

export async function compressWorkingMemory(): Promise<string | Error> {
  try {
    const currentMemory = await readWorkingMemory()

    if (currentMemory.length <= MEMORY_CHARACTER_LIMIT) {
      return currentMemory
    }

    const systemPrompt = `
あなたは、AIアシスタントIZABELLAのワーキングメモリを圧縮する専門家です。
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

    const model = google('gemini-2.0-flash')

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

    return result.object.compressed_memory
  } catch (error) {
    return error as Error
  }
}
