import { describe, expect, it, vi } from 'vitest'
import { handleThreadsSearch, SearchThreadsParams } from './handleThreadsSearch'
import { searchThread, ThreadsWithPagination } from '../lib/thread'

vi.mock('../lib/thread', () => ({
  searchThread: vi.fn()
}))

describe('handleThreadsSearch', () => {
  it('検索結果を返すこと', async () => {
    const query = 'test'
    const threadsData = [
      {
        id: '1',
        title: 'Thread 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Thread 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const mockResponse: ThreadsWithPagination = {
      threads: threadsData,
      total: threadsData.length,
      totalPages: 1
    }

    vi.mocked(searchThread).mockResolvedValue(mockResponse)

    const params: SearchThreadsParams = { query }
    const result = await handleThreadsSearch(null, params)

    expect(searchThread).toHaveBeenCalledWith(query, 1, 12)
    expect(result).toEqual(mockResponse)
  })

  it('検索結果が空の場合は空の結果を返すこと', async () => {
    const query = 'nonexistent'
    const mockResponse: ThreadsWithPagination = {
      threads: [],
      total: 0,
      totalPages: 0
    }

    vi.mocked(searchThread).mockResolvedValue(mockResponse)

    const params: SearchThreadsParams = { query }
    const result = await handleThreadsSearch(null, params)

    expect(searchThread).toHaveBeenCalledWith(query, 1, 12)
    expect(result).toEqual(mockResponse)
  })
})
