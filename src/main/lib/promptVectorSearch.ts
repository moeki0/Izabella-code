import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'
import { store } from './store'
import { createMessage } from './message'
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

export interface SearchQueryResult {
  originalQuery: string
  results: PromptSearchResult[]
}

export async function searchKnowledgeWithPrompt(
  prompt: string,
  recentMessages: string[] = [],
  limit = 7,
  similarityThreshold = 0.1
): Promise<PromptSearchResult[]> {
  try {
    const knowledgeStore = getKnowledgeStore()
    const results = await knowledgeStore.search(
      [prompt, recentMessages.join('\n')].join('\n'),
      limit
    )

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
  similarityThreshold = 0.1
): Promise<SearchQueryResult> {
  const results = await searchKnowledgeWithPrompt(
    prompt,
    recentMessages,
    limit,
    similarityThreshold
  )

  return {
    originalQuery: [prompt, ...recentMessages.join('|n')].join('\n'),
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

  // Get search results with query information
  const searchData = await searchKnowledgeWithQueryInfo(prompt, recentMessages, 7, 0.1)

  if (searchData.results.length === 0) {
    return baseInstructions
  }

  // Create a message showing the search process
  await createMessage({
    role: 'tool',
    toolName: 'knowledge_search',
    toolReq: JSON.stringify({
      prompt: searchData.originalQuery,
      messageHistory: recentMessages.length
    }),
    toolRes: JSON.stringify({
      resultsCount: searchData.results.length
    })
  })

  // Send search query information to the renderer process
  try {
    if (mainWindow) {
      mainWindow.webContents.send('search-query', {
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
