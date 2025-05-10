import { describe, expect, it, vi, beforeEach } from 'vitest'
import { messageSearch } from './messageSearchTool'
import * as messageModule from './message'

vi.mock('./message', () => ({
  searchMessages: vi.fn()
}))

describe('messageSearchTool', () => {
  const mockMessages = [
    {
      id: '1',
      role: 'user' as const,
      content: 'こんにちは',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: 'どうぞよろしくお願いします',
      created_at: '2023-01-01T00:01:00Z',
      updated_at: '2023-01-01T00:01:00Z'
    }
  ]

  const mockSearchResult = {
    messages: mockMessages,
    total: 2,
    totalPages: 1
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(messageModule.searchMessages).mockResolvedValue(mockSearchResult)
  })

  it('日本語の検索クエリを使って正しくメッセージを検索できること', async () => {
    const context = {
      query: 'こんにちは',
      page: 1,
      itemsPerPage: 20
    }

    // @ts-expect-error - exec関数の型が合わないが、テストでは問題ない
    const result = await messageSearch.execute({ context })
    const parsedResult = JSON.parse(result)

    expect(messageModule.searchMessages).toHaveBeenCalledWith({
      query: 'こんにちは',
      page: 1,
      itemsPerPage: 20
    })

    expect(parsedResult).toEqual({
      messages: mockMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content || null,
        tool_name: null,
        tool_req: null,
        tool_res: null,
        created_at: msg.created_at
      })),
      total: 2,
      totalPages: 1,
      currentPage: 1
    })
  })

  it('複数のフィルタリングパラメータを使って検索できること', async () => {
    const context = {
      role: 'user',
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T23:59:59Z',
      page: 1,
      itemsPerPage: 10
    }

    // @ts-expect-error - exec関数の型が合わないが、テストでは問題ない
    await messageSearch.execute({ context })

    expect(messageModule.searchMessages).toHaveBeenCalledWith({
      role: 'user',
      startTime: '2023-01-01T00:00:00Z',
      endTime: '2023-01-01T23:59:59Z',
      page: 1,
      itemsPerPage: 10
    })
  })

  it('検索に失敗した場合はエラーをスローすること', async () => {
    const context = {
      query: 'test'
    }

    vi.mocked(messageModule.searchMessages).mockRejectedValue(new Error('検索エラー'))

    // @ts-expect-error - exec関数の型が合わないが、テストでは問題ない
    await expect(messageSearch.execute({ context })).rejects.toThrow(
      'Failed to search messages: 検索エラー'
    )
  })
})
