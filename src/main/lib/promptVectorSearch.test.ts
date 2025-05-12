import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as promptVectorSearchModule from './promptVectorSearch'
import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'

// Mock dependencies
vi.mock('./markdownKnowledgeStore', () => {
  return {
    MarkdownKnowledgeStore: vi.fn().mockImplementation(() => {
      return {
        search: vi.fn().mockResolvedValue([
          {
            pageContent: 'Test knowledge content 1',
            id: 'test-id-1',
            _similarity: 0.9
          },
          {
            pageContent: 'Test knowledge content 2',
            id: 'test-id-2',
            _similarity: 0.8
          },
          {
            pageContent: 'Test knowledge content 3',
            id: 'test-id-3',
            _similarity: 0.7
          }
        ])
      }
    })
  }
})

vi.mock('./store', () => ({
  store: {
    get: vi.fn().mockReturnValue('mock-api-key')
  }
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockReturnValue({})
}))

vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      query: 'optimized test query'
    }
  })
}))

vi.mock('./message', () => ({
  createMessage: vi.fn().mockResolvedValue('mock-message-id')
}))

vi.mock('./workingMemory', () => ({
  readWorkingMemory: vi.fn().mockResolvedValue('mock working memory content')
}))

describe('promptVectorSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateSearchQuery', () => {
    it('should generate an optimized search query', async () => {
      const { generateObject } = await import('ai')
      const { createMessage } = await import('./message')

      const result = await promptVectorSearchModule.generateSearchQuery(
        'test prompt',
        ['recent message 1', 'recent message 2'],
        'working memory content'
      )

      expect(result).toBe('optimized test query')
      expect(generateObject).toHaveBeenCalled()
      expect(createMessage).toHaveBeenCalled()

      // Check createMessage was called with correct params
      const createMessageCall = vi.mocked(createMessage).mock.calls[0][0]
      expect(createMessageCall.role).toBe('tool')
      expect(createMessageCall.toolName).toBe('search_query_generation')

      // Verify that the tool request and response data were saved
      const toolReq = JSON.parse(createMessageCall.toolReq || '{}')
      const toolRes = JSON.parse(createMessageCall.toolRes || '{}')

      expect(toolReq.prompt).toBe('test prompt')
      expect(toolReq.messageHistory).toBe(2)
      expect(toolReq.workingMemoryUsed).toBe(true)
      expect(toolRes.generatedQuery).toBe('optimized test query')
    })

    it('should fall back to original prompt if query generation fails', async () => {
      const { generateObject } = await import('ai')
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('Test error'))

      const result = await promptVectorSearchModule.generateSearchQuery('test prompt')

      expect(result).toBe('test prompt')
    })
  })

  describe('searchKnowledgeWithPrompt', () => {
    it('should use the generated query for search', async () => {
      // Use vi.spyOn instead of directly replacing the function
      const mockGenerateSearchQuery = vi.spyOn(promptVectorSearchModule, 'generateSearchQuery')
      mockGenerateSearchQuery.mockResolvedValue('optimized query')
        
      const mockKnowledgeStoreSearch = vi.fn().mockResolvedValue([
        {
          pageContent: 'Test knowledge content 1',
          id: 'test-id-1',
          _similarity: 0.9
        }
      ])

      // Mock the MarkdownKnowledgeStore instance
      vi.mocked(MarkdownKnowledgeStore).mockImplementation(() => {
        return {
          search: mockKnowledgeStoreSearch
        } as unknown as MarkdownKnowledgeStore
      })

      await promptVectorSearchModule.searchKnowledgeWithPrompt('test prompt', ['message 1'])

      expect(mockGenerateSearchQuery).toHaveBeenCalledWith('test prompt', ['message 1'], '')
      expect(mockKnowledgeStoreSearch).toHaveBeenCalledWith('optimized query', 7)
      
      // Restore the original spied function
      mockGenerateSearchQuery.mockRestore()
    })

    it('should filter search results by similarity threshold', async () => {
      // Use vi.spyOn instead of directly replacing the function
      const mockGenerateSearchQuery = vi.spyOn(promptVectorSearchModule, 'generateSearchQuery')
      mockGenerateSearchQuery.mockResolvedValue('test query')
      
      // Mock implementation for this test
      const mockSearch = vi.fn().mockResolvedValue([
        {
          pageContent: 'Test knowledge content 1',
          id: 'test-id-1',
          _similarity: 0.9
        },
        {
          pageContent: 'Test knowledge content 2',
          id: 'test-id-2',
          _similarity: 0.8
        },
        {
          pageContent: 'Test knowledge content 3',
          id: 'test-id-3',
          _similarity: 0.7
        },
        {
          pageContent: 'Test knowledge content 4',
          id: 'test-id-4',
          _similarity: 0.6
        }
      ])

      // Mock the MarkdownKnowledgeStore instance
      vi.mocked(MarkdownKnowledgeStore).mockImplementation(() => {
        return {
          search: mockSearch
        } as unknown as MarkdownKnowledgeStore
      })

      const results = await promptVectorSearchModule.searchKnowledgeWithPrompt('test query', [], 7, 0.7)

      // Verify results - should only include results with similarity >= 0.7
      expect(results.length).toBe(3)
      expect(results[0].id).toBe('test-id-1')
      expect(results[1].id).toBe('test-id-2')
      expect(results[2].id).toBe('test-id-3')
      
      // Restore the original spied function
      mockGenerateSearchQuery.mockRestore()
    })
  })
  
  describe('enhanceInstructionsWithKnowledge', () => {
    it('should use working memory when enhancing instructions', async () => {
      // Use vi.spyOn instead of directly replacing the function
      const mockSearchKnowledge = vi.spyOn(promptVectorSearchModule, 'searchKnowledgeWithPrompt')
      mockSearchKnowledge.mockResolvedValue([])
      
      const { readWorkingMemory } = await import('./workingMemory')

      await promptVectorSearchModule.enhanceInstructionsWithKnowledge(
        'test prompt',
        'base instructions',
        ['message 1']
      )

      expect(readWorkingMemory).toHaveBeenCalled()
      expect(mockSearchKnowledge).toHaveBeenCalledWith(
        'test prompt',
        ['message 1'],
        7,
        0.75,
        'mock working memory content'
      )
      
      // Restore the original spied function
      mockSearchKnowledge.mockRestore()
    })

    it('should format search results and insert them into instructions', async () => {
      // Use vi.spyOn instead of directly replacing the function
      const mockSearchKnowledge = vi.spyOn(promptVectorSearchModule, 'searchKnowledgeWithPrompt')
      mockSearchKnowledge.mockResolvedValue([
        {
          content: 'Test knowledge content 1',
          id: 'test-id-1',
          similarity: 0.9
        }
      ])

      const result = await promptVectorSearchModule.enhanceInstructionsWithKnowledge(
        'test prompt',
        'base instructions\n# ナレッジ\nsome content',
        []
      )

      expect(result).toContain('base instructions')
      expect(result).toContain('# プロンプト関連のナレッジ情報')
      expect(result).toContain('test-id-1')
      expect(result).toContain('Test knowledge content 1')
      expect(result).toContain('# ナレッジ\nsome content')
      
      // Restore the original spied function
      mockSearchKnowledge.mockRestore()
    })

    it('should append search results to the end if no marker is found', async () => {
      // Use vi.spyOn instead of directly replacing the function
      const mockSearchKnowledge = vi.spyOn(promptVectorSearchModule, 'searchKnowledgeWithPrompt')
      mockSearchKnowledge.mockResolvedValue([
        {
          content: 'Test knowledge content 1',
          id: 'test-id-1',
          similarity: 0.9
        }
      ])

      const result = await promptVectorSearchModule.enhanceInstructionsWithKnowledge(
        'test prompt',
        'base instructions without marker',
        []
      )

      expect(result).toContain('base instructions without marker')
      expect(result).toContain('# プロンプト関連のナレッジ情報')
      expect(result).toContain('test-id-1')
      expect(result).toContain('Test knowledge content 1')
      
      // Restore the original spied function
      mockSearchKnowledge.mockRestore()
    })
  })
})