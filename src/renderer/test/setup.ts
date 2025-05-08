import '@testing-library/jest-dom'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

beforeAll(() => {
  Object.defineProperty(window, 'scroll', {
    value: vi.fn(),
    writable: true
  })
})

afterEach(() => {
  cleanup()
})
