import { describe, expect, it, vi } from 'vitest'
import { handleLink } from './handleLink'
import { shell } from 'electron'

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn()
  }
}))

describe('handleLink', () => {
  it('shell.openExternalが正しいURLで呼ばれること', () => {
    const url = 'https://example.com'
    handleLink(null, url)
    expect(shell.openExternal).toHaveBeenCalledWith(url)
  })
})
