import { z } from 'zod'
import { createTool } from '@mastra/core'
import { KnowledgeStore } from './knowledgeStore'
import { store } from './store'
import Fuse from 'fuse.js'

// KnowledgeStoreのインスタンスのキャッシュ
let knowledgeStoreInstance: KnowledgeStore | null = null

// KnowledgeStoreインスタンスを取得する関数
const getKnowledgeStore = (): KnowledgeStore => {
  if (knowledgeStoreInstance === null) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStoreInstance = new KnowledgeStore(openaiApiKey)
  }
  return knowledgeStoreInstance
}

export const artifactCreate: unknown = createTool({
  id: 'create_note',
  inputSchema: z.object({
    title: z.string().describe('Title of the note (required)'),
    content: z.string().describe('Content of the note (in markdown format, required)')
  }),
  description:
    'Tool to create and store user notes. Useful for saving memos, code, and valuable information for later reference.',
  execute: async ({ context }) => {
    try {
      // Validate title and content
      if (!context.title?.trim() || !context.content?.trim()) {
        throw new Error('Title and content cannot be empty')
      }

      const title = context.title.trim()
      const content = context.content.trim()

      // Generate ID with "note--" prefix
      const id = `note--${title}`

      // Get KnowledgeStore instance
      const knowledgeStore = getKnowledgeStore()

      // Save note as knowledge
      await knowledgeStore.addTexts([content], [id])

      return JSON.stringify({
        success: true,
        message: `Note "${title}" has been created successfully.`,
        id: id
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Note creation error: ${errorMessage}`)
    }
  }
})

export const artifactSearch: unknown = createTool({
  id: 'search_notes',
  inputSchema: z.object({
    query: z.string().describe('Search query to find notes by content similarity or title')
  }),
  description:
    'Tool to search for user notes by content similarity and title. Uses both semantic search and prefix-based search with fuzzy matching for titles.',
  execute: async ({ context }) => {
    try {
      const knowledgeStore = getKnowledgeStore()

      if (!context.query?.trim()) {
        throw new Error('Search query cannot be empty')
      }

      const query = context.query.trim()

      // Define result type to fix TypeScript errors
      interface ArtifactResult {
        id: string
        title: string
        created_at: number
        similarity: number
        match_type: string
      }

      const results: ArtifactResult[] = []
      const existingIds = new Set<string>()

      // First, search by searchByPrefix with the query directly
      // This will find artifacts with IDs containing the search term
      const prefixResults = await knowledgeStore.searchByPrefix('note--', 500, query)

      // Get semantic search results for content-based matching
      const semanticResults = await knowledgeStore.similaritySearch(query, 500)
      const semanticArtifacts = semanticResults.filter((result) => result.id.startsWith('note--'))

      // Process prefix search results
      for (const result of prefixResults) {
        const titleMatch = result.id.match(/^note--(.+)$/)
        const title = titleMatch ? titleMatch[1] : result.id

        results.push({
          id: result.id,
          title,
          created_at: result.created_at,
          similarity: 0.95, // High relevance for direct prefix matches
          match_type: 'prefix'
        })
        existingIds.add(result.id)
      }

      // Process semantic search results
      for (const result of semanticArtifacts) {
        if (!existingIds.has(result.id)) {
          const titleMatch = result.id.match(/^note--(.+)$/)
          const title = titleMatch ? titleMatch[1] : result.id

          results.push({
            id: result.id,
            title,
            created_at: result.created_at,
            similarity: result._similarity,
            match_type: 'semantic'
          })
          existingIds.add(result.id)
        }
      }

      // Get all artifacts for fuzzy search
      const allArtifacts = await knowledgeStore.searchByPrefix('note--', 20)
      const artifactItems = allArtifacts.map((result) => {
        const titleMatch = result.id.match(/^note--(.+)$/)
        const title = titleMatch ? titleMatch[1] : result.id

        return {
          id: result.id,
          title,
          created_at: result.created_at,
          _similarity: result._similarity
        }
      })

      // Set up fuzzy search options
      const fuseOptions = {
        includeScore: true,
        keys: ['title'],
        threshold: 0.4 // Lower threshold means more strict matching
      }

      // Perform fuzzy search on artifact titles
      const fuse = new Fuse(artifactItems, fuseOptions)
      const fuseResults = fuse.search(query)

      // Add fuzzy search results (deduplicate by ID)
      for (const result of fuseResults) {
        if (!existingIds.has(result.item.id)) {
          existingIds.add(result.item.id)
          results.push({
            id: result.item.id,
            title: result.item.title,
            created_at: result.item.created_at,
            similarity: result.score ? 1 - result.score : 0.5, // Convert Fuse score to similarity
            match_type: 'fuzzy_id'
          })
        }
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity)

      return JSON.stringify({
        success: true,
        count: results.length,
        notes: results
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Artifact search error: ${errorMessage}`)
    }
  }
})

export const artifactUpdate: unknown = createTool({
  id: 'update_note',
  inputSchema: z.object({
    id: z.string().describe('ID of the note to update (required)'),
    title: z.string().optional().describe('New title for the note (optional)'),
    content: z.string().optional().describe('New content for the note (optional)')
  }),
  description: 'Tool to update an existing note. Provide either a new title, new content, or both.',
  execute: async ({ context }) => {
    try {
      // Validate input
      if (!context.id?.trim()) {
        throw new Error('Note ID cannot be empty')
      }

      if (!context.title?.trim() && !context.content?.trim()) {
        throw new Error('At least one of title or content must be provided')
      }

      const artifactId = context.id.trim()

      // Check if ID starts with note-- prefix, if not, add it
      const fullArtifactId = artifactId.startsWith('note--') ? artifactId : `note--${artifactId}`

      // Get KnowledgeStore instance
      const knowledgeStore = getKnowledgeStore()

      // Get current artifact
      const entry = await knowledgeStore.getEntryById(fullArtifactId)

      if (!entry) {
        throw new Error(`Artifact with ID "${artifactId}" not found`)
      }

      // Prepare update data
      const newTitle = context.title?.trim() || entry.id.replace(/^note--/, '')
      const newContent = context.content?.trim() || entry.content
      const newId = `note--${newTitle}`

      // Update the artifact
      await knowledgeStore.upsertText(newContent, newId, fullArtifactId)

      return JSON.stringify({
        success: true,
        message: `Note "${newTitle}" has been updated successfully.`,
        id: newId
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Note update error: ${errorMessage}`)
    }
  }
})

export const artifactGet: unknown = createTool({
  id: 'get_note',
  inputSchema: z.object({
    id: z.string().describe('ID of the note to retrieve (required)')
  }),
  description:
    'Tool to retrieve a single note by ID. Returns the note content, title, and metadata.',
  execute: async ({ context }) => {
    try {
      // Validate input
      if (!context.id?.trim()) {
        throw new Error('Note ID cannot be empty')
      }

      const artifactId = context.id.trim()

      // Check if ID starts with note-- prefix, if not, add it
      const fullArtifactId = artifactId.startsWith('note--') ? artifactId : `note--${artifactId}`

      // Get KnowledgeStore instance
      const knowledgeStore = getKnowledgeStore()

      // Get artifact
      const entry = await knowledgeStore.getEntryById(fullArtifactId)

      if (!entry) {
        throw new Error(`Note with ID "${artifactId}" not found`)
      }

      // Get title from ID
      const title = entry.id.replace(/^note--/, '')

      return JSON.stringify({
        success: true,
        note: {
          id: entry.id,
          title,
          content: entry.content,
          created_at: entry.created_at,
          metadata: entry.metadata
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Note retrieval error: ${errorMessage}`)
    }
  }
})
