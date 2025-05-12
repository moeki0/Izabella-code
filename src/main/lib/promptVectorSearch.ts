import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'
import { store } from './store'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createMessage } from './message'
import { readWorkingMemory } from './workingMemory'
import { mainWindow } from '..'

let knowledgeStore: MarkdownKnowledgeStore | null = null

const getKnowledgeStore = (): MarkdownKnowledgeStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new MarkdownKnowledgeStore(openaiApiKey)
  }
  return knowledgeStore
}

export interface PromptSearchResult {
  content: string
  id: string
  similarity: number
}

export async function generateSearchQuery(
  prompt: string,
  recentMessages: string[] = [],
  workingMemory: string = ''
): Promise<string> {
  try {
    const geminiModel = 'gemini-2.5-flash-preview-04-17'
    const model = google(geminiModel)

    const result = await generateObject({
      model,
      schema: z.object({
        query: z.string()
      }),
      temperature: 0,
      prompt: `
あなたはベクトル検索のためのクエリを生成するシステムです。
ユーザーの入力とメッセージ履歴、ワーキングメモリの内容を分析し、検索に最適なクエリを生成してください。

検索クエリは以下の要件を満たす必要があります：
1. 具体的なキーワードを使用する
2. 不要な接続詞や助詞を除去する
3. 本質的な検索意図を抽出する
4. 単なる入力のコピーではなく、検索効率を高めるための最適化されたクエリにする

入力: ${prompt}

メッセージ履歴:
${recentMessages.join('\n\n')}

ワーキングメモリ:
${workingMemory}

最適な検索クエリを生成してください。`
    })

    // Save the generated query as a tool message
    await createMessage({
      role: 'tool',
      toolName: 'search_query_generation',
      toolReq: JSON.stringify({
        prompt,
        messageHistory: recentMessages.length,
        workingMemoryUsed: !!workingMemory
      }),
      toolRes: JSON.stringify({ generatedQuery: result.object.query })
    })

    return result.object.query
  } catch (error) {
    console.error('検索クエリ生成エラー:', error)
    return prompt // Fallback to original prompt
  }
}

export interface SearchQueryResult {
  originalQuery: string
  optimizedQuery: string
  results: PromptSearchResult[]
}

export async function searchKnowledgeWithPrompt(
  prompt: string,
  recentMessages: string[] = [],
  limit = 7,
  similarityThreshold = 0.75,
  workingMemory: string = ''
): Promise<PromptSearchResult[]> {
  try {
    const knowledgeStore = getKnowledgeStore()

    // Generate optimized search query using LLM
    const searchQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)

    const results = await knowledgeStore.search(searchQuery, limit)

    return results
      .filter((result) => result._similarity >= similarityThreshold)
      .map((result) => ({
        content: result.pageContent,
        id: result.id,
        similarity: result._similarity
      }))
  } catch (error) {
    console.error('プロンプトベクトル検索エラー:', error)
    return []
  }
}

export async function searchKnowledgeWithQueryInfo(
  prompt: string,
  recentMessages: string[] = [],
  limit = 7,
  similarityThreshold = 0.75,
  workingMemory: string = ''
): Promise<SearchQueryResult> {
  const optimizedQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)
  const results = await searchKnowledgeWithPrompt(
    prompt,
    recentMessages,
    limit,
    similarityThreshold,
    workingMemory
  )

  return {
    originalQuery: prompt,
    optimizedQuery,
    results
  }
}

export async function enhanceInstructionsWithKnowledge(
  prompt: string,
  baseInstructions: string,
  recentMessages: string[] = []
): Promise<string> {
  // Get working memory to provide context for the search
  let workingMemory = ''
  try {
    workingMemory = await readWorkingMemory()
  } catch (error) {
    console.error('Failed to read working memory:', error)
  }

  // Get search results with query information
  const searchData = await searchKnowledgeWithQueryInfo(
    prompt,
    recentMessages,
    7,
    0.75,
    workingMemory
  )

  if (searchData.results.length === 0) {
    return baseInstructions
  }

  // Create a message showing the search process
  await createMessage({
    role: 'tool',
    toolName: 'knowledge_search',
    toolReq: JSON.stringify({
      prompt: searchData.originalQuery,
      messageHistory: recentMessages.length,
      workingMemoryUsed: !!workingMemory
    }),
    toolRes: JSON.stringify({
      optimizedQuery: searchData.optimizedQuery,
      resultsCount: searchData.results.length
    })
  })

  // Send search query information to the renderer process
  try {
    if (mainWindow) {
      mainWindow.webContents.send('search-query', {
        originalQuery: searchData.originalQuery,
        optimizedQuery: searchData.optimizedQuery
      })
    }
  } catch (error) {
    console.error('Failed to send search query to renderer:', error)
  }

  // Format the search results into a section to be included in the instructions
  const relevantKnowledgeSection = `
# プロンプト関連のナレッジ情報
以下はプロンプトに関連する既存のナレッジベースからの情報です。この情報を回答に活用してください：

検索クエリ: "${searchData.originalQuery}"
> 最適化されたクエリ: "${searchData.optimizedQuery}"

${searchData.results
  .map(
    (result) => `## ${result.id}
${result.content.slice(0, 1000)}
`
  )
  .join('\n')}
`

  // Find where to insert the relevant knowledge in the base instructions
  const insertPoint = baseInstructions.indexOf('# ナレッジ')
  if (insertPoint === -1) {
    // If the marker isn't found, append to the end
    return `${baseInstructions}\n${relevantKnowledgeSection}`
  }

  // Insert the relevant knowledge just before the # ナレッジ section
  return (
    baseInstructions.slice(0, insertPoint) +
    relevantKnowledgeSection +
    baseInstructions.slice(insertPoint)
  )
}
