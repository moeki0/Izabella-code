import { describe, expect, it, vi } from 'vitest'
import { handleToolApproval } from './handleToolApproval'

// ハンドラーにインポートされている実際の関数をモック化
vi.mock('../lib/llm', () => ({
  handleToolApproval: vi.fn().mockResolvedValue(undefined)
}))

describe('handleToolApproval', () => {
  it('承認パラメータを正しく渡すこと (true)', async () => {
    const { handleToolApproval: mockApprove } = await import('../lib/llm')

    await handleToolApproval(true)

    expect(mockApprove).toHaveBeenCalledWith(true)
  })

  it('拒否パラメータを正しく渡すこと (false)', async () => {
    const { handleToolApproval: mockApprove } = await import('../lib/llm')
    vi.clearAllMocks() // 前のテストの呼び出しをクリア

    await handleToolApproval(false)

    expect(mockApprove).toHaveBeenCalledWith(false)
  })
})
