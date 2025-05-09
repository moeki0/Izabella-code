import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleDeleteMessage } from './handleDeleteMessage'
import { database } from '../lib/database'

vi.mock('../lib/database', () => ({
  database: vi.fn()
}))

describe('handleDeleteMessage', () => {
  const mockRun = vi.fn()
  const mockPrepare = vi.fn().mockReturnValue({ run: mockRun })
  const mockDb = { prepare: mockPrepare }

  beforeEach(() => {
    vi.mocked(database).mockResolvedValue(mockDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a message by ID', async () => {
    const messageId = 'test-message-id'
    await handleDeleteMessage(null, messageId)

    expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM messages WHERE id = ?')
    expect(mockRun).toHaveBeenCalledWith(messageId)
  })
})
