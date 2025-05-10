import { createTool } from '@mastra/core'
import { z } from 'zod'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'

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
