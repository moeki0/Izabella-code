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
  id: 'working_memory',
  inputSchema: z.object({
    content: z.string().describe('The new content for the working memory')
  }),
  description:
    'Get or update the working memory content. Please actively use this when there is unknown information in conversations with users',
  execute: async ({ context }) => {
    try {
      const result = await workingMemoryUpdate({ content: context.content })
      return JSON.stringify(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to perform working memory operation: ${errorMessage}`)
    }
  }
})
