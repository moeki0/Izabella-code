import { generateObject } from 'ai'
import { z } from 'zod'
import { google } from '@ai-sdk/google'
import {
  DEFAULT_WORKING_MEMORY_TEMPLATE,
  readWorkingMemory,
  updateWorkingMemory
} from './workingMemory'
import { mainWindow } from '..'

const MEMORY_CHARACTER_LIMIT = 800

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
400文字に要約・圧縮してください。

考慮事項：
- 最も重要な情報を残し、冗長な情報や詳細な例を削減してください。
- 各セクションのバランスを保ちながら、内容を簡潔にしてください。
- 抽象的になりすぎないようにしてください。
- 可能な限り具体的な名前、プロジェクト、場所などは保持してください。
- 形式はMarkdownにしてください

形式はこれに従ってください（重要）:
=====================================
${DEFAULT_WORKING_MEMORY_TEMPLATE}
=====================================

最終的な出力としては、400文字のすべてのセクションを含む完全なワーキングメモリの内容を返してください。`

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

このワーキングメモリを400文字に圧縮してください。`
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
