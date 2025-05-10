import { getLatestKnowledgeFiles } from '../lib/workingMemory'
import { google } from '@ai-sdk/google'
import { store } from '../lib/store'
import { generateObject } from 'ai'
import { z } from 'zod'

export const handleSummarize = async (): Promise<
  Array<{ title: string; content: string }> | string
> => {
  try {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = store.get('apiKeys.google') as string
    const latestKnowledgeFiles = await getLatestKnowledgeFiles(40)
    const filesList = latestKnowledgeFiles.map((file) => `- ${file}`).join('\n')

    const prompt = `最近のナレッジファイル一覧:

      ${filesList}

      これらのナレッジファイルを分類して要約してください。
      重要な情報に焦点を当てどのような内容があるかを日本語で書いてください。`

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
