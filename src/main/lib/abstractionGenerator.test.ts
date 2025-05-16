import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { generateAbstractions, saveAbstractions } from './abstractionGenerator'
import { generateObject } from 'ai'
import { KnowledgeStore } from './knowledgeStore'
import { mainWindow } from '..'

// Mock ai SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}))

// Mock @ai-sdk/google
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockImplementation(() => 'mocked-google-model')
}))

// Mock store
vi.mock('./store', () => ({
  store: {
    get: vi.fn().mockReturnValue('fake-api-key')
  }
}))

// Mock KnowledgeStore
vi.mock('./knowledgeStore', () => ({
  KnowledgeStore: vi.fn().mockImplementation(() => ({
    addTexts: vi.fn().mockResolvedValue(true),
    getEntryById: vi.fn().mockResolvedValue({
      id: 'test-episode-id',
      content: 'Test episode content'
    }),
    updateEntry: vi.fn().mockResolvedValue(true)
  }))
}))

// Mock message creation
vi.mock('./message', () => ({
  createMessage: vi.fn().mockResolvedValue('test-message-id')
}))

// Mock mainWindow
vi.mock('..', () => ({
  mainWindow: {
    webContents: {
      send: vi.fn()
    }
  }
}))

describe('abstractionGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generateAbstractions', () => {
    it('会話履歴から抽象的な概念を生成すること', async () => {
      // Mock the AI response
      const mockAbstractions = {
        abstractions: [
          {
            content: '詳細なタスク管理への関心',
            rationale: 'ユーザーはタスク管理に関する詳細な質問を繰り返しており...'
          },
          {
            content: '技術的解決策への探究心',
            rationale: '複数の技術的アプローチを比較検討している様子が...'
          }
        ]
      }

      vi.mocked(generateObject).mockResolvedValue({
        object: mockAbstractions
      })

      const abstractionRequest = {
        conversations: [
          { role: 'user', content: 'タスク管理のベストプラクティスは？' },
          { role: 'assistant', content: 'タスク管理には...' }
        ],
        knowledge_ids: ['episode-123', 'episode-456']
      }

      const result = await generateAbstractions(abstractionRequest)

      // Verify the AI was called with correct parameters
      expect(generateObject).toHaveBeenCalled()
      const generateObjectCall = vi.mocked(generateObject).mock.calls[0][0]
      expect(generateObjectCall.model).toBe('mocked-google-model')
      expect(generateObjectCall.temperature).toBe(0.2)
      expect(generateObjectCall.prompt).toContain('会話から抽象的傾向・パターンを抽出するタスク')
      expect(generateObjectCall.prompt).toContain('ユーザー: タスク管理のベストプラクティスは？')

      // Verify the results are correctly formatted
      expect(result).toHaveLength(2)
      expect(result[0].content).toContain('# 詳細なタスク管理への関心')
      expect(result[0].content).toContain('## 抽象化の根拠と具体例')
      expect(result[0].content).toContain('## 関連するエピソードナレッジ')
      expect(result[0].content).toContain('episode-123, episode-456')

      // Verify IDs have the correct prefix
      expect(result[0].id).toContain('abstract-')

      // Verify episode links are maintained
      expect(result[0].episode).toEqual(['episode-123', 'episode-456'])
      expect(result[0].is_abstract).toBe(true)

      // Verify message was created and event was sent
      expect(mainWindow.webContents.send).toHaveBeenCalledWith('abstraction-generation', {
        abstractions: mockAbstractions.abstractions,
        episodeIds: ['episode-123', 'episode-456']
      })
    })

    it('AI応答で問題が発生した場合は空の配列を返すこと', async () => {
      vi.mocked(generateObject).mockRejectedValue(new Error('AI error'))

      const abstractionRequest = {
        conversations: [{ role: 'user', content: 'タスク管理のベストプラクティスは？' }],
        knowledge_ids: ['episode-123']
      }

      const result = await generateAbstractions(abstractionRequest)

      expect(result).toEqual([])
      expect(mainWindow.webContents.send).not.toHaveBeenCalled()
    })
  })

  describe('saveAbstractions', () => {
    it('抽象化された概念をナレッジストアに保存し、エピソードを更新すること', async () => {
      // Override the store mock for this test
      vi.mocked(KnowledgeStore).mockImplementation(() => ({
        addTexts: vi.fn().mockResolvedValue(true),
        getEntryById: vi.fn().mockResolvedValue({
          id: 'episode-123',
          content: 'Test episode content'
        }),
        updateEntry: vi.fn().mockResolvedValue(true)
      }))

      const abstractions = [
        {
          id: 'abstract-test-id',
          content:
            '# テスト抽象化\n\n## 抽象化の根拠と具体例\nテストの根拠\n\n## 関連するエピソードナレッジ\nepisode-123',
          episode: ['episode-123'],
          is_abstract: true
        }
      ]

      const result = await saveAbstractions(abstractions)

      // Verify knowledge was saved
      expect(KnowledgeStore).toHaveBeenCalled()
      const knowledgeStore = vi.mocked(KnowledgeStore).mock.results[0].value
      expect(knowledgeStore.addTexts).toHaveBeenCalledWith(
        [abstractions[0].content],
        [abstractions[0].id]
      )

      // Verify episode was updated
      expect(knowledgeStore.getEntryById).toHaveBeenCalledWith('episode-123')
      expect(knowledgeStore.updateEntry).toHaveBeenCalledWith({
        id: 'episode-123',
        content: 'Test episode content',
        abstract: ['abstract-test-id']
      })

      // Verify correct IDs are returned
      expect(result).toEqual(['abstract-test-id'])
    })

    it('空の抽象化配列が渡された場合は空の配列を返すこと', async () => {
      const result = await saveAbstractions([])
      expect(result).toEqual([])
      expect(KnowledgeStore).not.toHaveBeenCalled()
    })

    it('エラーが発生した場合は空の配列を返すこと', async () => {
      vi.mocked(KnowledgeStore).mockImplementationOnce(() => {
        throw new Error('KnowledgeStore error')
      })

      const abstractions = [
        {
          id: 'abstract-test-id',
          content: '# テスト抽象化',
          episode: ['episode-123'],
          is_abstract: true
        }
      ]

      const result = await saveAbstractions(abstractions)
      expect(result).toEqual([])
    })
  })
})
