import { describe, expect, it, vi } from 'vitest'
import { handleThreadsSearch } from './handleThreadsSearch'
import { searchThread } from '../lib/thread'

vi.mock('../lib/thread', () => ({
  searchThread: vi.fn()
}))

describe('handleThreadsSearch', () => {
  it('検索結果を返すこと', async () => {
    const query = 'test'
    const threads = [
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
    vi.mocked(searchThread).mockResolvedValue(threads)

    const result = await handleThreadsSearch(null, query)

    expect(searchThread).toHaveBeenCalledWith(query)
    expect(result).toEqual(threads)
  })

  it('検索結果が空の場合は空配列を返すこと', async () => {
    const query = 'nonexistent'
    vi.mocked(searchThread).mockResolvedValue([])

    const result = await handleThreadsSearch(null, query)

    expect(searchThread).toHaveBeenCalledWith(query)
    expect(result).toEqual([])
  })
})
