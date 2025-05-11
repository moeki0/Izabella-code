import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  generateUpdatedWorkingMemory,
  processConversationForWorkingMemory
} from './generateWorkingMemory'
import { readWorkingMemory, updateWorkingMemory } from './workingMemory'

// Google AIのモック
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockImplementation(() => ({
    generateObject: vi.fn()
  }))
}))

// generateObjectのモック
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      updated_memory: '# ユーザー情報\n- 更新されたメモリ内容'
    }
  })
}))

// 作業メモリのモック
vi.mock('./workingMemory', () => ({
  readWorkingMemory: vi.fn().mockResolvedValue('# ユーザー情報\n- 元のメモリ内容'),
  updateWorkingMemory: vi.fn().mockResolvedValue(undefined)
}))

// ロガーのモック
vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('generateWorkingMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateUpdatedWorkingMemory', () => {
    it('会話履歴からワーキングメモリを生成する', async () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'こんにちは' },
        { role: 'assistant' as const, content: 'こんにちは、お手伝いできることはありますか？' }
      ]

      const result = await generateUpdatedWorkingMemory(conversationHistory)

      expect(readWorkingMemory).toHaveBeenCalled()
      expect(result).toBe('# ユーザー情報\n- 更新されたメモリ内容')
    })

    it('会話履歴が短すぎる場合はエラーを返す', async () => {
      const conversationHistory = [{ role: 'user' as const, content: 'こんにちは' }]

      const result = await generateUpdatedWorkingMemory(conversationHistory)

      expect(result).toBeInstanceOf(Error)
    })
  })

  describe('processConversationForWorkingMemory', () => {
    it('会話履歴からワーキングメモリを生成して保存する', async () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'こんにちは' },
        { role: 'assistant' as const, content: 'こんにちは、お手伝いできることはありますか？' }
      ]

      const result = await processConversationForWorkingMemory(conversationHistory)

      expect(readWorkingMemory).toHaveBeenCalled()
      expect(updateWorkingMemory).toHaveBeenCalledWith('# ユーザー情報\n- 更新されたメモリ内容')
      expect(result).toBe(true)
    })

    it('会話履歴が短すぎる場合は処理しない', async () => {
      const conversationHistory = [{ role: 'user' as const, content: 'こんにちは' }]

      const result = await processConversationForWorkingMemory(conversationHistory)

      expect(readWorkingMemory).not.toHaveBeenCalled()
      expect(updateWorkingMemory).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })
})
