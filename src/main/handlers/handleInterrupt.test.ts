import { describe, expect, it, beforeEach } from 'vitest'
import { handleInterrupt } from './handleInterrupt'

describe('handleInterrupt', () => {
  beforeEach(() => {
    globalThis.interrupt = false
  })

  it('グローバルフラグをtrueに設定すること', () => {
    handleInterrupt()
    expect(globalThis.interrupt).toBe(true)
  })
})
