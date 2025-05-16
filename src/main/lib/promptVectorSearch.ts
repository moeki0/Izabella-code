import { KnowledgeStore } from './knowledgeStore'
import { store } from './store'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createMessage } from './message'
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
  is_abstract?: boolean
  related_entries?: string[]
}

export async function extractAbstractConcepts(
  prompt: string,
  recentMessages: string[] = []
): Promise<string[]> {
  try {
    const geminiModel = 'gemini-2.0-flash'
    const model = google(geminiModel)

    const result = await generateObject({
      model,
      schema: z.object({
        concepts: z.array(z.string()).describe('抽出された抽象的な概念のリスト')
      }),
      temperature: 0,
      prompt: `
# 会話から抽象的傾向・パターンを抽出するタスク

あなたの役割は、ユーザーとアシスタントの会話から、具体的な事象や事例に基づいて、より抽象的・一般的な傾向やパターンを見出すことです。
単なる内容の要約ではなく、会話から読み取れる深層的な特性、行動パターン、思考傾向などを抽出してください。
抽象化とは、個別の具体例から背後にある一般的な法則や傾向を見出すプロセスです。

## 抽象化の優れた例：
- 具体例：「書籍の整理方法について質問し、提案された方法を試している」
  抽象化：「体系的な情報管理への関心が高く、新しい整理手法を積極的に取り入れる傾向がある」

- 具体例：「特定の技術的な問題について詳細に質問し、複数の解決策を比較検討している」
  抽象化：「技術的課題に対して多角的な視点から分析する思考パターンを持ち、最適解を模索する探究心がある」

- 具体例：「同じ質問を繰り返し、異なる表現で説明を求めている」
  抽象化：「概念を完全に理解するまで繰り返し確認する学習スタイルを持ち、多様な説明方法から理解を深めようとする」

## 避けるべき抽象化の例：
- 単なる要約：「ユーザーは技術的な質問をした」（具体的すぎて抽象化になっていない）
- 過度な一般化：「ユーザーは知識に興味がある」（抽象度が高すぎて具体的な洞察がない）
- 根拠のない推測：「ユーザーは完璧主義者である」（十分な証拠なしに性格特性を断定）

メッセージ履歴:
${recentMessages.join('\n\n')}

入力（最重要）: ${prompt}

会話から抽出された抽象的な概念をリスト形式（3-5個程度）で出力してください。`
    })

    // UIに抽象化プロセスの結果を表示
    try {
      if (mainWindow) {
        mainWindow.webContents.send('abstract-concepts', {
          concepts: result.object.concepts,
          prompt: prompt
        })
      }
    } catch (error) {
      console.error('Failed to send abstract concepts to renderer:', error)
    }

    return result.object.concepts
  } catch (error) {
    console.error('抽象概念抽出エラー:', error)
    return [prompt] // Fallback to original prompt as a single concept
  }
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

メッセージ履歴:
${recentMessages.join('\n\n')}

ワーキングメモリ:
${workingMemory}

入力（最重要）: ${prompt}

最適な検索クエリを生成してください。`
    })

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
  abstractResults?: PromptSearchResult[]
  normalResults?: PromptSearchResult[]
  abstractConcepts?: string[]
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

    // 1. メッセージ履歴から抽象的な概念を抽出
    const abstractConcepts = await extractAbstractConcepts(prompt, recentMessages)

    // 2. 通常の検索クエリも生成（フォールバック用）
    const searchQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)

    // 3. 抽象概念とヒットした抽象ナレッジを格納する配列
    interface KnowledgeSearchResult {
      pageContent: string
      id: string
      _similarity: number
      _importance: number
      created_at: number
    }

    interface ConceptSearchResult {
      concept: string
      results: KnowledgeSearchResult[]
    }

    const abstractResults: ConceptSearchResult[] = []

    // 4. 各抽象概念で検索を実行
    for (const concept of abstractConcepts) {
      const conceptResults = await knowledgeStore.search(
        concept,
        Math.ceil(limit / abstractConcepts.length)
      )
      // 抽象ナレッジのみをフィルタリング
      const filteredAbstractResults = await Promise.all(
        conceptResults
          .filter((r) => r._similarity >= similarityThreshold)
          .map(async (result) => {
            const entry = await knowledgeStore.getEntryById(result.id)
            if (entry && entry.is_abstract) {
              return result
            }
            return null
          })
      )

      abstractResults.push({
        concept,
        results: filteredAbstractResults.filter(Boolean)
      })
    }

    // 5. 抽象概念検索と通常検索の両方を実行
    const abstractKnowledgeResults: KnowledgeSearchResult[] = abstractResults.flatMap(
      (r) => r.results
    )

    // 通常の検索クエリを使用（常に実行）
    const normalSearchResults = await knowledgeStore.search(searchQuery, limit)

    // 両方の結果を結合
    const results: KnowledgeSearchResult[] = [...abstractKnowledgeResults, ...normalSearchResults]

    mainWindow.webContents.send('search-query', {
      originalQuery: prompt,
      optimizedQuery: searchQuery
    })

    // 通常のフィルタリングとランク付けのロジックを使用
    const filteredResults = results.filter((result) => result._similarity >= similarityThreshold)

    for (const result of filteredResults) {
      await knowledgeStore.increaseImportance(result.id)
    }

    // 抽象ナレッジに関連するエピソード（具体）ナレッジを取得
    const episodicResults: KnowledgeSearchResult[] = []
    for (const result of filteredResults) {
      const entry = await knowledgeStore.getEntryById(result.id)
      if (entry && entry.is_abstract && entry.episode && entry.episode.length > 0) {
        // 関連エピソードナレッジを取得
        for (const episodeId of entry.episode) {
          const episodeEntry = await knowledgeStore.getEntryById(episodeId)
          if (episodeEntry) {
            episodicResults.push({
              pageContent: episodeEntry.content,
              id: episodeEntry.id,
              _similarity: 0.85, // 高めのスコアを設定（抽象ナレッジに関連する具体ナレッジとして）
              _importance: episodeEntry.importance || 0,
              created_at: episodeEntry.created_at || 0
            })
          }
        }
      }
    }

    // 抽象ナレッジと関連エピソードナレッジを結合
    const combinedResults = [...filteredResults, ...episodicResults]

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
      created_at: result.created_at || 0,
      is_abstract: false, // Default value, will be updated if needed
      related_entries: [] // Will store related episodic entries if this is an abstract
    }))

    // Get IDs of already found results to avoid duplicates
    const foundIds = relevantResults.map((result) => result.id)

    // Get abstract and episodic knowledge relationships
    await enrichWithAbstractEpisodicRelationships(relevantResults, knowledgeStore)

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
        created_at: result.created_at || 0,
        is_abstract: false,
        related_entries: []
      }))

      // Also get abstract and episodic relationships for chronological results
      await enrichWithAbstractEpisodicRelationships(chronologicalResults, knowledgeStore)
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

// Helper function to enrich search results with abstract/episodic relationships
async function enrichWithAbstractEpisodicRelationships(
  results: PromptSearchResult[],
  knowledgeStore: KnowledgeStore
): Promise<void> {
  for (const result of results) {
    try {
      // Get the full knowledge entry
      const entry = await knowledgeStore.getEntryById(result.id)
      if (!entry) continue

      // Update abstract flag
      result.is_abstract = entry.is_abstract || false

      // Handle abstract entries - get related episodic entries
      if (entry.is_abstract && entry.episode && entry.episode.length > 0) {
        result.related_entries = entry.episode
      }

      // Handle episodic entries - get related abstract entries
      else if (entry.abstract && entry.abstract.length > 0) {
        result.related_entries = entry.abstract
      }
    } catch (error) {
      console.error(`エントリーの関係情報取得エラー (ID: ${result.id}):`, error)
    }
  }
}

export async function searchKnowledgeWithQueryInfo(
  prompt: string,
  recentMessages: string[] = [],
  limit = 20,
  similarityThreshold = 0.1,
  workingMemory: string
): Promise<SearchQueryResult> {
  // 1. 抽象概念を抽出
  const abstractConcepts = await extractAbstractConcepts(prompt, recentMessages)

  // 2. 通常の検索クエリを生成
  const optimizedQuery = await generateSearchQuery(prompt, recentMessages, workingMemory)

  // 3. 検索実行
  const allResults = await searchKnowledgeWithPrompt(
    prompt,
    recentMessages,
    limit,
    similarityThreshold,
    workingMemory
  )

  // 4. 抽象概念の検索結果と通常の検索結果を分離
  const abstractResults = allResults.filter((result) => result.is_abstract)
  const normalResults = allResults.filter((result) => !result.is_abstract)

  // 5. 結果をまとめる
  return {
    originalQuery: prompt,
    optimizedQuery,
    results: allResults,
    abstractResults,
    normalResults,
    abstractConcepts
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

  try {
    // 検索結果をメッセージとしてデータベースに保存
    const resultsForRenderer = {
      // すべての結果ID
      results: searchData.results.map((result) => result.id),

      // 抽象ナレッジのID
      abstractResults: searchData.abstractResults
        ? searchData.abstractResults.map((result) => result.id)
        : [],

      // 通常検索結果のID（抽象ナレッジに関連するエピソードを除外）
      normalResults: searchData.normalResults
        ? searchData.normalResults
            .filter((result) => {
              // 抽象ナレッジのエピソードは除外
              if (result.related_entries && result.related_entries.length > 0) {
                // 抽象ナレッジを親に持つエピソードかチェック
                for (const abstractResult of searchData.abstractResults || []) {
                  if (abstractResult.related_entries?.includes(result.id)) {
                    return false // 除外
                  }
                }
              }
              return true // 含める
            })
            .map((result) => result.id)
        : []
    }

    // 検索結果をツールメッセージとして保存
    await createMessage({
      role: 'tool',
      toolName: 'search_result',
      toolReq: JSON.stringify({
        query: searchData.originalQuery
      }),
      toolRes: JSON.stringify(resultsForRenderer)
    })

    // 抽象概念クエリをツールメッセージとして常に保存（空の場合も）
    await createMessage({
      role: 'tool',
      toolName: 'abstract_concepts_search',
      toolReq: JSON.stringify({
        prompt: searchData.originalQuery
      }),
      toolRes: JSON.stringify({
        optimizedQuery: searchData.optimizedQuery,
        abstractConcepts: searchData.abstractConcepts || [],
        abstractResults: searchData.abstractResults
          ? searchData.abstractResults.map((r) => r.id)
          : []
      })
    })

    // レンダラーに検索結果を送信
    if (mainWindow) {
      // 検索結果の送信
      mainWindow.webContents.send('search-result', resultsForRenderer)

      // 抽象概念検索結果を常に送信
      mainWindow.webContents.send('abstract-concepts-search', {
        concepts: searchData.abstractConcepts || [],
        abstractResults: searchData.abstractResults
          ? searchData.abstractResults.map((r) => r.id)
          : [],
        prompt: searchData.originalQuery,
        optimizedQuery: searchData.optimizedQuery,
        // 抽象ナレッジのエピソードIDリストも含める
        episodeIds: [...abstractRelatedEpisodeIds]
      })

      // 抽象概念の解析結果も送信（互換性のため）
      if (searchData.abstractConcepts && searchData.abstractConcepts.length > 0) {
        mainWindow.webContents.send('abstract-concepts', {
          concepts: searchData.abstractConcepts,
          prompt: searchData.originalQuery
        })
      }
    }
  } catch (error) {
    console.error('Failed to send search query to renderer:', error)
  }

  // Separate results by type
  const relatedResults = searchData.results.filter((result) => result.similarity > 0.1)
  const chronoResults = searchData.results.filter(
    (result) => result.similarity > 0 && result.similarity <= 0.1
  )

  // Further separate into abstract and episodic knowledge
  const abstractResults = searchData.results.filter((result) => result.is_abstract)

  // エピソードの内容を取得する関数
  async function getEpisodeContent(episodeId: string): Promise<string | null> {
    try {
      const episodeEntry = await getKnowledgeStore().getEntryById(episodeId)
      if (episodeEntry) {
        return episodeEntry.content
      }
    } catch (error) {
      console.error(`エピソード内容取得エラー (ID: ${episodeId}):`, error)
    }
    return null
  }

  // 抽象ナレッジに関連するエピソードのIDを集める
  const abstractRelatedEpisodeIds = new Set<string>()
  for (const result of abstractResults) {
    if (result.related_entries && result.related_entries.length > 0) {
      for (const episodeId of result.related_entries) {
        abstractRelatedEpisodeIds.add(episodeId)
      }
    }
  }

  // Format knowledge section
  const relevantKnowledgeSection = `
# プロンプト関連のナレッジ情報
以下はプロンプトに関連する既存のナレッジベースからの情報です。この情報を回答に活用してください：

検索クエリ: "${searchData.originalQuery}"
> 最適化されたクエリ: "${searchData.optimizedQuery}"

${
  abstractResults.length > 0
    ? `## 抽象ナレッジ
抽象化された一般的な概念や情報:

${await Promise.all(
  abstractResults.map(async (result) => {
    let dateStr = ''
    if (result.created_at) {
      const date = new Date(result.created_at * 1000)
      dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // エピソードの内容を取得して表示する
    let episodeContent = ''
    if (result.related_entries && result.related_entries.length > 0) {
      const episodeContents = await Promise.all(
        result.related_entries.map(async (episodeId) => {
          const content = await getEpisodeContent(episodeId)
          if (content) {
            return `#### エピソード: ${episodeId}
${content.slice(0, 500)}...`
          }
          return null
        })
      )

      // null以外のエピソード内容を結合
      const validEpisodeContents = episodeContents.filter(Boolean)
      if (validEpisodeContents.length > 0) {
        episodeContent = `\n\n関連エピソード内容:\n${validEpisodeContents.join('\n\n')}`
      }
    }

    return `### ${result.id} (抽象ナレッジ, 類似度: ${result.similarity.toFixed(2)}${
      result.importance ? `, 重要度: ${result.importance}` : ''
    }${dateStr ? `, 作成日: ${dateStr}` : ''})
${result.content.slice(0, 1000)}${episodeContent}
`
  })
).then((results) => results.join('\n'))}`
    : ''
}

${
  relatedResults.filter((r) => !r.is_abstract && !abstractRelatedEpisodeIds.has(r.id)).length > 0
    ? `## 関連エピソードナレッジ

${relatedResults
  .filter((r) => !r.is_abstract && !abstractRelatedEpisodeIds.has(r.id)) // 抽象ナレッジのエピソードは除外
  .map((result) => {
    let dateStr = ''
    if (result.created_at) {
      const date = new Date(result.created_at * 1000)
      dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Include related abstract entries if available
    const relatedAbstracts =
      result.related_entries && result.related_entries.length > 0
        ? `\n\n関連抽象ナレッジ: ${result.related_entries.join(', ')}`
        : ''

    return `### ${result.id} (類似度: ${result.similarity.toFixed(2)}${
      result.importance ? `, 重要度: ${result.importance}` : ''
    }${dateStr ? `, 作成日: ${dateStr}` : ''})
${result.content.slice(0, 1000)}${relatedAbstracts}
`
  })
  .join('\n')}`
    : ''
}

${
  chronoResults.filter((r) => !abstractRelatedEpisodeIds.has(r.id)).length > 0
    ? `## その他のナレッジ

${
  chronoResults.filter((r) => !abstractRelatedEpisodeIds.has(r.id)).length > 0
    ? `### 時間的近似ナレッジ

${chronoResults
  .filter((r) => !abstractRelatedEpisodeIds.has(r.id)) // 抽象ナレッジのエピソードは除外
  .map((result) => {
    let dateStr = ''
    if (result.created_at) {
      const date = new Date(result.created_at * 1000)
      dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
    }

    // Include information about whether this is abstract or has related entries
    const typeInfo = result.is_abstract ? '抽象ナレッジ, ' : ''
    const relatedInfo =
      result.related_entries && result.related_entries.length > 0
        ? `\n\n関連${result.is_abstract ? 'エピソード' : '抽象ナレッジ'}: ${result.related_entries.join(', ')}`
        : ''

    return `#### ${result.id} (${typeInfo}類似度: ${result.similarity.toFixed(2)}${
      result.importance ? `, 重要度: ${result.importance}` : ''
    }${dateStr ? `, 作成日: ${dateStr}` : ''})
${result.content.slice(0, 1000)}${relatedInfo}
`
  })
  .join('\n')}`
    : ''
}

`
    : ''
}
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
