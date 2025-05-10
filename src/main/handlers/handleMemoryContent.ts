import { getMemoryContent, getLatestKnowledgeFiles } from '../lib/workingMemory'
import { google } from '@ai-sdk/google'
import { store } from '../lib/store'
import { generateObject } from 'ai'
import { z } from 'zod'

export const handleGetMemoryContent = async (): Promise<string> => {
  try {
    return await getMemoryContent()
  } catch (error) {
    console.error('Error getting memory content:', error)
    return 'Error occurred while retrieving memory content'
  }
}

export const handleGetLatestKnowledgeFiles = async (): Promise<string[]> => {
  try {
    return await getLatestKnowledgeFiles(40)
  } catch (error) {
    console.error('Error getting latest knowledge files:', error)
    return []
  }
}

export const handleSummarizeMemoryContent = async (): Promise<
  Array<{ title: string; content: string }> | string
> => {
  try {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string
    const memoryContent = await getMemoryContent()
    const prompt = `Summarize this working memory content by section, focusing on the most important information in Japanese. Create a list of sections with titles and content summaries.

      ${memoryContent}`
    const response = await generateObject({
      schema: z.object({
        items: z.array(
          z.object({
            title: z.string(),
            content: z.string()
          })
        )
      }),
      model: google('gemini-2.0-flash-lite'),
      temperature: 0.2,
      prompt
    })

    return response.object.items
  } catch (error) {
    console.error('Error summarizing memory content:', error)
    return 'Error occurred while summarizing memory content'
  }
}
