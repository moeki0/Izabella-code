import { describe, expect, it, beforeEach, vi } from 'vitest'
import { handleInterrupt } from './handleInterrupt'

vi.mock('..')

describe('handleInterrupt', () => {
  beforeEach(() => {
    globalThis.interrupt = false
    vi.mock('..', () => ({
      mainWindow: {
        webContents: {
          send: vi.fn()
        }
      }
    }))
  })

  it('グローバルフラグをtrueに設定すること', () => {
    handleInterrupt()
    expect(globalThis.interrupt).toBe(true)
  })
})
