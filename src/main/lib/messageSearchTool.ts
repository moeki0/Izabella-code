import { z } from 'zod'
import { searchMessages, SearchMessagesParams } from './message'
import { createTool } from '@mastra/core'

export const messageSearch: unknown = createTool({
  id: 'search_message',
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe('検索するテキスト（メッセージ内容、ツールリクエスト、ツールレスポンスから検索）'),
    metadata: z
      .string()
      .optional()
      .describe('メタデータ内を検索するテキスト（会話テーマなどが含まれる）'),
    role: z
      .enum(['user', 'assistant', 'tool'])
      .optional()
      .describe('特定の役割（user, assistant, tool）でフィルタリング'),
    startTime: z.string().optional().describe('この時間以降のメッセージを検索（ISO形式の日時）'),
    endTime: z.string().optional().describe('この時間以前のメッセージを検索（ISO形式の日時）'),
    page: z.number().min(1).default(1).describe('ページ番号'),
    itemsPerPage: z.number().min(1).default(20).describe('1ページあたりの項目数')
  }),
  description: 'Search messages with various filtering conditions and pagination',
  execute: async ({ context }) => {
    try {
      const params: SearchMessagesParams = {
        query: context.query,
        metadata: context.metadata,
        role: context.role,
        startTime: context.startTime,
        endTime: context.endTime,
        page: context.page,
        itemsPerPage: context.itemsPerPage
      }

      const result = await searchMessages(params)

      return JSON.stringify({
        messages: result.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content?.slice(0, 400) || null,
          tool_name: msg.tool_name || null,
          tool_req: msg.tool_req?.slice(0, 400) || null,
          tool_res: msg.tool_res?.slice(0, 400) || null,
          metadata: msg.metadata || null,
          created_at: msg.created_at
        })),
        total: result.total,
        totalPages: result.totalPages,
        currentPage: context.page
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to search messages: ${errorMessage}`)
    }
  }
})
