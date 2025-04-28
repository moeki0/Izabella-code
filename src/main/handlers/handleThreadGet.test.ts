import { describe, expect, it, vi } from 'vitest'
import { handleThreadGet } from './handleThreadGet'
import { getThreads } from '../lib/thread'

vi.mock('../lib/thread', () => ({
  getThreads: vi.fn()
}))

describe('handleThreadGet', () => {
  it('全スレッドのリストを返すこと', async () => {
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
    vi.mocked(getThreads).mockResolvedValue(threads)

    const result = await handleThreadGet()

    expect(getThreads).toHaveBeenCalled()
    expect(result).toEqual(threads)
  })
})
