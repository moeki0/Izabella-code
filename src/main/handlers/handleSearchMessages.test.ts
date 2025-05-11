import { describe, expect, it, vi } from 'vitest'
import { handleSearchMessages } from './handleSearchMessages'
import * as messageModule from '../lib/message'

vi.mock('../lib/message', () => ({
  searchMessages: vi.fn()
}))

describe('handleSearchMessages', () => {
  it('正常に検索結果を返すこと', async () => {
    const mockSearchResult = {
      messages: [
        { id: 'msg1', role: 'user', content: 'Hello', created_at: '2023-01-01T00:00:00Z' }
      ],
      total: 1,
      totalPages: 1
    }

    vi.mocked(messageModule.searchMessages).mockResolvedValueOnce(mockSearchResult)

    const result = await handleSearchMessages({} as any, { query: 'Hello' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockSearchResult)
    expect(result.error).toBeNull()
    expect(messageModule.searchMessages).toHaveBeenCalledWith({ query: 'Hello' })
  })

  it('エラーが発生した場合はエラー情報を返すこと', async () => {
    const error = new Error('Search failed')
    vi.mocked(messageModule.searchMessages).mockRejectedValueOnce(error)

    const result = await handleSearchMessages({} as any, { query: 'test' })

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe('Search failed')
  })
})
