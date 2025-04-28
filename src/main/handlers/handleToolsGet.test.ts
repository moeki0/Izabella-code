import { describe, expect, it, vi } from 'vitest'
import { handleToolsGet } from './handleToolsGet'
import { beforeEach } from 'node:test'

vi.mock('../lib/llm', () => ({
  tools: {
    tool1: {
      description: 'Tool 1 description'
    },
    tool2: {
      description: 'Tool 2 description'
    }
  }
}))

vi.mock('../lib/store', () => ({
  store: {
    get: vi.fn().mockReturnValue([])
  }
}))

describe('handleToolsGet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('利用可能なツールの一覧を返すこと', () => {
    const result = handleToolsGet()
    expect(result).toEqual([
      {
        name: 'tool1',
        description: 'Tool 1 description'
      },
      {
        name: 'tool2',
        description: 'Tool 2 description'
      }
    ])
  })
})
