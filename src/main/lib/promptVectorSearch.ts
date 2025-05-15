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
  importance?: number
  created_at?: number
}

export async function generateSearchQuery(
  prompt: string,
  recentMessages: string[] = [],
  workingMemory: string = ''
): Promise<string> {
  try {
    const geminiModel = 'gemini-2.0-flash'
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
  limit = 20,
  similarityThreshold = 0.1,
  workingMemory: string = ''
): Promise<PromptSearchResult[]> {
  try {
    const knowledgeStore = getKnowledgeStore()

    const searchQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)

    const results = await knowledgeStore.search(searchQuery, limit)

    mainWindow.webContents.send('search-query', {
      originalQuery: prompt,
      optimizedQuery: searchQuery
    })

    // Filter results by similarity threshold
    const filteredResults = results.filter((result) => result._similarity >= similarityThreshold)

    // Increase importance for each referenced knowledge entry
    for (const result of filteredResults) {
      await knowledgeStore.increaseImportance(result.id)
    }

    // Calculate combined score using similarity, importance and freshness
    // Rerank results based on combined score
    const rankedResults = [...filteredResults].sort((a, b) => {
      // Get creation timestamps with proper type handling
      // Define an interface to safely access created_at
      interface KnowledgeSearchResult {
        _similarity: number
        _importance: number
        created_at: number
      }

      const createdAtA = (a as KnowledgeSearchResult).created_at || 0
      const createdAtB = (b as KnowledgeSearchResult).created_at || 0

      // Normalize timestamps (newer = higher value)
      const now = Math.floor(Date.now() / 1000)
      const maxAge = 60 * 60 * 24 * 365 // 1 year in seconds

      // Calculate freshness score (0-1 range, 1 = newest)
      const freshnessA = Math.max(0, Math.min(1, 1 - (now - createdAtA) / maxAge))
      const freshnessB = Math.max(0, Math.min(1, 1 - (now - createdAtB) / maxAge))

      // Calculate importance normalization
      const maxImportance = Math.max(...filteredResults.map((r) => r._importance || 0)) || 1

      // Calculate combined score (60% similarity, 20% normalized importance, 20% freshness)
      const scoreA =
        0.6 * a._similarity + 0.2 * ((a._importance || 0) / maxImportance) + 0.2 * freshnessA
      const scoreB =
        0.6 * b._similarity + 0.2 * ((b._importance || 0) / maxImportance) + 0.2 * freshnessB

      return scoreB - scoreA // Sort descending
    })

    return rankedResults.map((result) => ({
      content: result.pageContent,
      id: result.id,
      similarity: result._similarity,
      importance: result._importance || 0,
      created_at: result.created_at || 0
    }))
  } catch (error) {
    console.error('プロンプトベクトル検索エラー:', error)
    return []
  }
}

export async function searchKnowledgeWithQueryInfo(
  prompt: string,
  recentMessages: string[] = [],
  limit = 20,
  similarityThreshold = 0.1,
  workingMemory: string
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
  try {
    if (mainWindow) {
      mainWindow.webContents.send('start-search', {
        prompt,
        status: 'searching'
      })
    }
  } catch (error) {
    console.error('Failed to send start-search event to renderer:', error)
  }

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
    20,
    0.5,
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
      mainWindow.webContents.send('search-result', {
        results: searchData.results.map((result) => result.id)
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
  .map((result) => {
    // Create a readable date string for the created_at timestamp
    let dateStr = ''
    if (result.created_at) {
      const date = new Date(result.created_at * 1000)
      dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    return `## ${result.id} (類似度: ${result.similarity.toFixed(2)}${result.importance ? `, 重要度: ${result.importance}` : ''}${dateStr ? `, 作成日: ${dateStr}` : ''})
${result.content.slice(0, 1000)}
`
  })
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
