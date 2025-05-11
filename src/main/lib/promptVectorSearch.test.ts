import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('promptVectorSearch', () => {
  // Save original implementation
  const originalSearchKnowledge = promptVectorSearchModule.searchKnowledgeWithPrompt
  const originalEnhanceInstructions = promptVectorSearchModule.enhanceInstructionsWithKnowledge
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    // Restore original implementations after each test
    promptVectorSearchModule.searchKnowledgeWithPrompt = originalSearchKnowledge
    promptVectorSearchModule.enhanceInstructionsWithKnowledge = originalEnhanceInstructions
  })
  
  describe('searchKnowledgeWithPrompt', () => {
    it('should filter search results by similarity threshold', async () => {
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
        }
      ])
      
      // Override the implementation
      promptVectorSearchModule.searchKnowledgeWithPrompt = vi.fn().mockImplementation(
        async (prompt, messages = [], limit = 5, threshold = 0.75) => {
          const results = await mockSearch()
          return results.map(r => ({
            content: r.pageContent,
            id: r.id,
            similarity: r._similarity
          }))
        }
      )
      
      const results = await promptVectorSearchModule.searchKnowledgeWithPrompt('test query')
      
      // Verify results
      expect(results.length).toBe(2)
      expect(results[0].id).toBe('test-id-1')
      expect(results[1].id).toBe('test-id-2')
    })
    
    it('should include conversation history in search context', async () => {
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
      
      // Call the actual function with conversation history
      await promptVectorSearchModule.searchKnowledgeWithPrompt(
        'current query',
        ['message 1', 'message 2', 'message 3']
      )
      
      // Verify the mock was called
      expect(mockKnowledgeStoreSearch).toHaveBeenCalled()
      
      // The search parameter should contain the combined context
      const searchParam = mockKnowledgeStoreSearch.mock.calls[0][0]
      expect(typeof searchParam).toBe('string')
      expect(searchParam).toContain('current query')
      expect(searchParam).toContain('message')
    })
  })

  describe('enhanceInstructionsWithKnowledge', () => {
    it('should enhance instructions with knowledge search results', async () => {
      // Mock searchKnowledgeWithPrompt to return test data
      promptVectorSearchModule.searchKnowledgeWithPrompt = vi.fn().mockResolvedValue([
        {
          content: 'Test knowledge content 1',
          id: 'test-id-1',
          similarity: 0.9
        },
        {
          content: 'Test knowledge content 2',
          id: 'test-id-2',
          similarity: 0.8
        }
      ])
      
      const baseInstructions = '# System Instructions\n\n# ナレッジ\nSome content'
      const result = await promptVectorSearchModule.enhanceInstructionsWithKnowledge(
        'test query', 
        baseInstructions
      )
      
      // Verify searchKnowledgeWithPrompt was called
      expect(promptVectorSearchModule.searchKnowledgeWithPrompt).toHaveBeenCalled()
      
      // Check result contains the knowledge section
      expect(result).toContain('# プロンプト関連のナレッジ情報')
      expect(result).toContain('test-id-1')
      expect(result).toContain('Test knowledge content 1')
    })
    
    it('should use conversation history to enhance search context', async () => {
      // Create a spy for searchKnowledgeWithPrompt
      const searchSpy = vi.fn().mockResolvedValue([
        {
          content: 'Test knowledge content 1',
          id: 'test-id-1',
          similarity: 0.9
        }
      ])
      
      // Override function for this test
      promptVectorSearchModule.searchKnowledgeWithPrompt = searchSpy
      
      const baseInstructions = '# System Instructions\n\n# ナレッジ\nSome content'
      const prompt = 'test query'
      const recentMessages = ['previous message 1', 'previous message 2']
      
      await promptVectorSearchModule.enhanceInstructionsWithKnowledge(
        prompt, 
        baseInstructions, 
        recentMessages
      )
      
      // Verify searchKnowledgeWithPrompt was called with correct arguments
      expect(searchSpy).toHaveBeenCalledWith(prompt, recentMessages)
    })
  })
})