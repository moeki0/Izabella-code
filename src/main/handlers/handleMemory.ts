import { readKnowledgeIndex } from '../lib/workingMemory'
import { google } from '@ai-sdk/google'
import { store } from '../lib/store'
import { generateObject } from 'ai'
import { z } from 'zod'

export const handleSummarize = async (): Promise<
  Array<{ title: string; content: string }> | string
> => {
  try {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string
    const knowledgeIndex = await readKnowledgeIndex()
    const prompt = `Summarize this Knowledge Index content focusing on the most important information in Japanese.

      ${knowledgeIndex}`
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
    console.error('Error summarizing content:', error)
    return 'Error occured'
  }
}
