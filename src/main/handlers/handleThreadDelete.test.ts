import { describe, expect, it, vi } from 'vitest'
import { handleThreadDelete } from './handleThreadDelete'
import { deleteThread } from '../lib/thread'

vi.mock('../lib/thread', () => ({
  deleteThread: vi.fn()
}))

describe('handleThreadDelete', () => {
  it('指定されたIDのスレッドを削除すること', async () => {
    const threadId = '1'
    await handleThreadDelete(threadId)
    expect(deleteThread).toHaveBeenCalledWith(threadId)
  })
})
