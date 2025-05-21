import { KnowledgeStore } from './knowledgeStore'
import { store } from './store'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { readWorkingMemory } from './workingMemory'
import { mainWindow } from '..'

let knowledgeStore: KnowledgeStore | null = null

const getKnowledgeStore = (): KnowledgeStore => {
  if (!knowledgeStore) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new KnowledgeStore(openaiApiKey)
  }
  return knowledgeStore
}

export interface PromptSearchResult {
  content: string
  id: string
  similarity: number
  importance?: number
  created_at?: number
  related_entries?: string[]
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
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 2048
          }
        }
      },
      temperature: 0,
      prompt: `
あなたはIzabellaとして、ユーザー(moekiさん)との対話において、最も適切で役立つ応答を生成することを目的としています。
そのために、過去の会話履歴やナレッジベースから必要な情報を検索する役割を担います。

ユーザーの最新の入力、これまでのメッセージ履歴、およびあなたのワーキングメモリの内容を深く分析してください。
そして、**ユーザーへの応答を生成するために、どのような情報（過去の会話、Kibelaナレッジなど）が必要か**を判断し、その情報を効率的に取得するための最適なベクトル検索クエリを生成してください。

検索クエリ生成の思考プロセス：
1.  現在の会話の文脈とユーザーの入力から、Izabellaが次にどのような情報を提供すべきか、どのような応答を生成すべきかを判断します。
2.  その応答生成のために、過去の記憶やナレッジの中から、どのような情報が必要かを特定します。
3.  必要な情報を効率的に取得するための、最適なベクトル検索クエリを生成します。

生成する検索クエリは、以下の要件を満たしてください：
-   **応答生成に必要な情報**を効率的に検索できるような、具体的かつ関連性の高いキーワードや概念を含める。
-   単語の表面的な一致だけでなく、**意味的な関連性**を捉えられるように工夫する。
-   検索に不要な冗長な表現（挨拶、感情、質問形式など）は一切含めない。
-   検索システムが処理しやすい、洗練された形式にする。

メッセージ履歴:
${recentMessages.join('\n\n')}

ワーキングメモリ:
${workingMemory}

入力（最重要）: ${prompt}

最適な検索クエリを生成してください。`
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
  similarityThreshold = 0.5,
  workingMemory: string = ''
): Promise<PromptSearchResult[]> {
  try {
    const knowledgeStore = getKnowledgeStore()
    const searchQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)
    interface KnowledgeSearchResult {
      pageContent: string
      id: string
      _similarity: number
      _importance: number
      created_at: number
    }

    // 通常の検索クエリを使用（常に実行）
    const normalSearchResults = await knowledgeStore.search(searchQuery, limit)

    // 両方の結果を結合
    const results: KnowledgeSearchResult[] = [...normalSearchResults]

    mainWindow.webContents.send('search-query', {
      originalQuery: prompt,
      optimizedQuery: searchQuery
    })

    // 通常のフィルタリングとランク付けのロジックを使用
    const filteredResults = results.filter((result) => result._similarity >= similarityThreshold)

    for (const result of filteredResults) {
      await knowledgeStore.increaseImportance(result.id)
    }

    // 抽象ナレッジと関連エピソードナレッジを結合
    const combinedResults = [...filteredResults]

    const rankedResults = [...combinedResults].sort((a, b) => {
      const createdAtA = (a as KnowledgeSearchResult).created_at || 0
      const createdAtB = (b as KnowledgeSearchResult).created_at || 0
      const now = Math.floor(Date.now() / 1000)
      const maxAge = 60 * 60 * 24 * 365 // 1 year in seconds
      const freshnessA = Math.max(0, Math.min(1, 1 - (now - createdAtA) / maxAge))
      const freshnessB = Math.max(0, Math.min(1, 1 - (now - createdAtB) / maxAge))
      const maxImportance = Math.max(...filteredResults.map((r) => r._importance || 0)) || 1
      const scoreA =
        0.9 * a._similarity + 0.05 * ((a._importance || 0) / maxImportance) + 0.05 * freshnessA
      const scoreB =
        0.9 * b._similarity + 0.05 * ((b._importance || 0) / maxImportance) + 0.05 * freshnessB

      return scoreB - scoreA // Sort descending
    })

    // Convert to standard format
    const relevantResults = rankedResults.map((result) => ({
      content: result.pageContent,
      id: result.id,
      similarity: result._similarity,
      importance: result._importance || 0,
      created_at: result.created_at || 0
    }))

    // Get IDs of already found results to avoid duplicates
    const foundIds = relevantResults.map((result) => result.id)
    // No more random entries

    // 2. Add chronologically close knowledge if we have any relevant results
    let chronologicalResults: PromptSearchResult[] = []
    if (relevantResults.length > 0) {
      // Use the timestamp of the most relevant result as reference
      const referenceResult = relevantResults[0]
      const referenceTimestamp = referenceResult.created_at || 0

      // Exclude relevant results we already have
      const allFoundIds = [...foundIds]

      const chronoCount = Math.min(3, Math.max(1, Math.floor(limit * 0.1))) // About 10% of limit or at least 1
      const chronoEntries = await knowledgeStore.getChronologicallyCloseEntries(
        referenceTimestamp,
        chronoCount,
        allFoundIds
      )

      chronologicalResults = chronoEntries.map((result) => ({
        content: result.pageContent,
        id: result.id,
        similarity: 0.1, // Low but non-zero similarity
        importance: result._importance || 0,
        created_at: result.created_at || 0
      }))
    }

    // Combine all results, keeping overall limit in mind
    const finalResults = [...relevantResults, ...chronologicalResults]

    // Ensure we don't exceed the total limit
    return finalResults.slice(0, limit)
  } catch (error) {
    console.error('プロンプトベクトル検索エラー:', error)
    return []
  }
}

export async function searchKnowledgeWithQueryInfo(
  prompt: string,
  recentMessages: string[] = [],
  limit = 20,
  similarityThreshold = 0.5,
  workingMemory: string
): Promise<SearchQueryResult> {
  const optimizedQuery = `重要: ${prompt}` + recentMessages.join('\n')
  const allResults = await searchKnowledgeWithPrompt(
    prompt,
    recentMessages,
    limit,
    similarityThreshold,
    workingMemory
  )

  return {
    originalQuery: prompt,
    optimizedQuery,
    results: allResults
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

  let workingMemory = ''
  try {
    workingMemory = await readWorkingMemory()
  } catch (error) {
    console.error('Failed to read working memory:', error)
  }

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

  try {
    // 検索結果をメッセージとしてデータベースに保存
    const resultsForRenderer = {
      results: searchData.results.map((result) => result.id)
    }

    if (mainWindow) {
      mainWindow.webContents.send('search-result', resultsForRenderer)
    }
  } catch {
    // nothing to do
  }

  // Format knowledge section
  const relevantKnowledgeSection = `
# プロンプト関連のナレッジ情報
以下はプロンプトに関連する既存のナレッジベースからの情報です。この情報を回答に活用してください：

検索クエリ: "${searchData.originalQuery}"
> 最適化されたクエリ: "${searchData.optimizedQuery}"

${searchData.results?.map((result) => result.content)}
`
  const insertPoint = baseInstructions.indexOf('# ナレッジ')
  if (insertPoint === -1) {
    return `${baseInstructions}\n${relevantKnowledgeSection}`
  }

  return (
    baseInstructions.slice(0, insertPoint) +
    relevantKnowledgeSection +
    baseInstructions.slice(insertPoint)
  )
}
