import { z } from 'zod'
import { createTool } from '@mastra/core'
import { KnowledgeStore } from './knowledgeStore'
import { store } from './store'

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
  id: 'create_artifact',
  inputSchema: z.object({
    title: z.string().describe('Title of the artifact (required)'),
    content: z.string().describe('Content of the artifact (in markdown format, required)')
  }),
  description:
    'Tool to create and store user artifacts. Useful for saving memos, code, and valuable information for later reference.',
  execute: async ({ context }) => {
    try {
      // Validate title and content
      if (!context.title?.trim() || !context.content?.trim()) {
        throw new Error('Title and content cannot be empty')
      }

      const title = context.title.trim()
      const content = context.content.trim()

      // Generate ID with "artifact--" prefix
      const id = `artifact--${title}`

      // Get KnowledgeStore instance
      const knowledgeStore = getKnowledgeStore()

      // Save artifact as knowledge
      await knowledgeStore.addTexts([content], [id])

      return JSON.stringify({
        success: true,
        message: `Artifact "${title}" has been created successfully.`,
        id: id
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Artifact creation error: ${errorMessage}`)
    }
  }
})
