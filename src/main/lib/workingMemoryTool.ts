import { createTool } from '@mastra/core'
import { z } from 'zod'
import { readWorkingMemory, updateWorkingMemory, replaceWorkingMemory } from './workingMemory'

export const workingMemoryGet = async (): Promise<string> => {
  return await readWorkingMemory()
}

export const workingMemoryUpdate = async (args: {
  content: string
}): Promise<{ success: boolean; message: string }> => {
  try {
    await updateWorkingMemory(args.content)
    return {
      success: true,
      message: 'Working memory updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to update working memory: ${error}`
    }
  }
}

export const workingMemoryReplace = async (args: {
  oldText: string
  newText: string
}): Promise<{ success: boolean; message: string }> => {
  try {
    await replaceWorkingMemory(args.oldText, args.newText)
    return {
      success: true,
      message: 'Working memory replaced successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to replace text in working memory: ${error}`
    }
  }
}

export const updateWorkingMemoryTool: unknown = createTool({
  id: 'update_memory',
  inputSchema: z.object({
    updatedContent: z.string().describe('すでにある内容をテンプレートに沿って更新してください')
  }),
  description:
    'ワーキングメモリの内容を取得または更新します。ユーザーとの会話で新しい情報や発見があった場合は、積極的にこれを使用してください。',
  execute: async ({ context }) => {
    try {
      const result = await workingMemoryUpdate({ content: context.updatedContent })
      return JSON.stringify(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`ワーキングメモリ操作に失敗しました: ${errorMessage}`)
    }
  }
})

export const replaceWorkingMemoryTool: unknown = createTool({
  id: 'replace_memory',
  inputSchema: z.object({
    oldText: z.string().describe('置換する対象のテキスト'),
    newText: z.string().describe('置換後の新しいテキスト')
  }),
  description:
    'ワーキングメモリ内の特定のテキストを置換します。メモリ全体を更新するのではなく、特定の部分だけを更新したい場合に使用します。',
  execute: async ({ context }) => {
    try {
      const result = await workingMemoryReplace({
        oldText: context.oldText,
        newText: context.newText
      })
      return JSON.stringify(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`ワーキングメモリの置換に失敗しました: ${errorMessage}`)
    }
  }
})
