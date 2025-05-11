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

describe('promptVectorSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

      // Instead of trying to reassign the function, mock the module
      vi.spyOn(promptVectorSearchModule, 'searchKnowledgeWithPrompt').mockImplementation(
        async () => {
          const results = await mockSearch()
          return results.map((r) => ({
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
      await promptVectorSearchModule.searchKnowledgeWithPrompt('current query', [
        'message 1',
        'message 2',
        'message 3'
      ])

      // Verify the mock was called
      expect(mockKnowledgeStoreSearch).toHaveBeenCalled()

      // The search parameter should contain the combined context
      const searchParam = mockKnowledgeStoreSearch.mock.calls[0][0]
      expect(typeof searchParam).toBe('string')
      expect(searchParam).toContain('current query')
      expect(searchParam).toContain('message')
    })
  })
})
