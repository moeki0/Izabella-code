import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as vectorStoreTools from './vectorStoreTools'

// Mock vector store components

// Mock the vector store instance
const mockVectorStoreInstance = {
  search: vi.fn(),
  addTexts: vi.fn(),
  upsertTexts: vi.fn(),
  deleteByIds: vi.fn()
}

// Mock the SqliteVectorStore class
vi.mock('./vectorStore', () => ({
  SqliteVectorStore: vi.fn().mockImplementation(() => mockVectorStoreInstance)
}))

// Mock store
vi.mock('./store', () => ({
  store: {
    get: vi.fn().mockReturnValue('mock-api-key')
  }
}))

// Mock electron-log
vi.mock('electron-log/main', () => ({
  default: {
    error: vi.fn()
  }
}))

describe('Vector Store Tools', () => {
  const { vectorSearchAndUpsert, vectorSearch, vectorDelete } = vectorStoreTools

  beforeEach(() => {
    vi.clearAllMocks()

    // Set default successful responses for mocks
    mockVectorStoreInstance.search.mockResolvedValue([
      {
        pageContent: 'Test content',
        metadata: { id: 'test-id', text: 'Test metadata' }
      }
    ])
    mockVectorStoreInstance.addTexts.mockResolvedValue(1)
    mockVectorStoreInstance.upsertTexts.mockResolvedValue(1)
    mockVectorStoreInstance.deleteByIds.mockResolvedValue(undefined)
  })

  describe('vectorSearchAndUpsert', () => {
    it('should search and insert new content if no similar content found', async () => {
      // Setup mocks for this test - no results found
      mockVectorStoreInstance.search.mockResolvedValue([])

      const result = await vectorSearchAndUpsert.execute({
        context: {
          indexName: 'test-index',
          text: 'New content to store',
          id: 'new-id',
          metadata: { category: 'test' },
          similarityThreshold: 0.9
        }
      })

      expect(mockVectorStoreInstance.search).toHaveBeenCalled()
      expect(mockVectorStoreInstance.addTexts).toHaveBeenCalled()
      expect(result).toEqual({
        action: 'inserted',
        id: 'new-id'
      })
    })

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockVectorStoreInstance.search.mockRejectedValue(new Error('Search failed'))

      await expect(
        vectorSearchAndUpsert.execute({
          context: {
            indexName: 'test-index',
            text: 'Test content',
            id: 'test-id',
            similarityThreshold: 0.8
          }
        })
      ).rejects.toThrow('Failed to perform vector operation: Search failed')
    })
  })

  describe('vectorSearch', () => {
    it('should search for similar content', async () => {
      const result = await vectorSearch.execute({
        context: {
          indexName: 'test-index',
          query: 'Search query',
          limit: 5
        }
      })

      expect(mockVectorStoreInstance.search).toHaveBeenCalled()
      expect(result).toEqual({
        results: [
          {
            content: 'Test content',
            metadata: { id: 'test-id', text: 'Test metadata' }
          }
        ]
      })
    })

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockVectorStoreInstance.search.mockRejectedValue(new Error('Search failed'))

      await expect(
        vectorSearch.execute({
          context: {
            indexName: 'test-index',
            query: 'Search query',
            limit: 5
          }
        })
      ).rejects.toThrow('Failed to perform vector search: Search failed')
    })
  })

  describe('vectorDelete', () => {
    it('should delete vectors by ID', async () => {
      const result = await vectorDelete.execute({
        context: {
          indexName: 'test-index',
          ids: ['id1', 'id2']
        }
      })

      expect(mockVectorStoreInstance.deleteByIds).toHaveBeenCalled()
      expect(result).toEqual({
        deleted: ['id1', 'id2']
      })
    })

    it('should handle errors gracefully', async () => {
      // Setup mock to throw error
      mockVectorStoreInstance.deleteByIds.mockRejectedValue(new Error('Delete failed'))

      await expect(
        vectorDelete.execute({
          context: {
            indexName: 'test-index',
            ids: ['id1', 'id2']
          }
        })
      ).rejects.toThrow('Failed to delete vectors: Delete failed')
    })
  })
})
