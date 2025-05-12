import { MarkdownKnowledgeStore } from './markdownKnowledgeStore'
import { store } from './store'

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

export async function searchKnowledgeWithPrompt(
  prompt: string,
  recentMessages: string[] = [],
  limit = 7,
  similarityThreshold = 0.75
): Promise<PromptSearchResult[]> {
  try {
    const knowledgeStore = getKnowledgeStore()

    // Combine the current prompt with recent message history
    const searchContext =
      recentMessages.length > 0 ? [prompt, ...recentMessages].join('\n\n') : prompt

    const results = await knowledgeStore.search(searchContext, limit)

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

export async function enhanceInstructionsWithKnowledge(
  prompt: string,
  baseInstructions: string,
  recentMessages: string[] = []
): Promise<string> {
  const searchResults = await searchKnowledgeWithPrompt(prompt, recentMessages)

  if (searchResults.length === 0) {
    return baseInstructions
  }

  // Format the search results into a section to be included in the instructions
  const relevantKnowledgeSection = `
# プロンプト関連のナレッジ情報
以下はプロンプトに関連する既存のナレッジベースからの情報です。この情報を回答に活用してください：

${searchResults
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
