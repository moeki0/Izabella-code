import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { knowledgeExtractionSchema, KnowledgeExtractionResult } from './knowledgeSchema'
import { saveToKnowledgeBase } from './knowledgeTools'
import log from 'electron-log/main'
import { generateKnowledgeId } from './generateKnowledgeId'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 会話履歴からナレッジとして保存すべき情報を抽出する
 */
export async function extractKnowledgeFromConversation(
  conversationHistory: ConversationMessage[]
): Promise<KnowledgeExtractionResult | Error> {
  const systemPrompt = `あなたは、AIアシスタントIZABELLAとユーザーとの会話履歴を分析し、ナレッジベースに保存すべき重要な情報を抽出する専門家です。

以下の会話履歴を読み、ナレッジベースに保存する価値のある情報（ユーザーに関する事実、プロジェクトに関する決定事項、重要な概念、タスク、技術的な詳細など）を特定してください。

抽出した情報は、指定されたJSON形式で出力してください。保存すべき情報がない場合や、抽出が困難な場合は、空の配列を持つJSONオブジェクトを出力してください。

考慮事項：
- 一時的な挨拶、感情的な表現、会話の流れを維持するための定型句は含めないでください。
- 誤っている可能性のある情報や、すぐに古くなる一時的な情報は慎重に判断してください。
- 抽出する情報は、後でIZABELLAがユーザーとの対話で参照し、役立てられるようなものであるべきです。
- 会話の文脈全体を考慮して、情報の重要性を判断してください。
- 特に、ユーザーが自身の状況、好み、過去の経験、プロジェクトの詳細、技術的な課題やアイデアについて言及した箇所に注意してください。
- 提案や決定事項、問題提起なども重要な情報です。
- アシスタントが生成した役立つコンテンツはあとで再利用できるように記録してください。
- どのプロジェクトの話なのか名前空間をナレッジのタイトルや本文に保存してください
`

  try {
    const model = google('gemini-2.0-flash')

    const result = await generateObject({
      model,
      system: systemPrompt,
      messages: conversationHistory,
      schema: knowledgeExtractionSchema
    })

    log.info('Knowledge extraction result:', result.object)

    return result.object
  } catch (error) {
    log.error('Error extracting knowledge:', error)
    return error as Error
  }
}

export async function saveExtractedKnowledge(
  extractionResult: KnowledgeExtractionResult
): Promise<string[]> {
  try {
    const { knowledge_entries } = extractionResult
    const savedIds: string[] = []

    // 抽出されたナレッジがない場合は処理終了
    if (knowledge_entries.length === 0) {
      log.info('No knowledge entries to save')
      return savedIds
    }

    for (const entry of knowledge_entries) {
      if (entry.relevance_score < 3) {
        log.info(`Skipping low relevance entry: ${entry.title}`)
        continue
      }

      const contentToSave = entry.content
      const id = entry.title || (await generateKnowledgeId(entry.content, 'knowledge'))

      await saveToKnowledgeBase({
        text: contentToSave,
        id: id,
        similarityThreshold: 0.7
      })

      log.info(`Saved knowledge entry: ${id}`)
      savedIds.push(id)
    }

    log.info(
      `Knowledge extraction complete. Processed ${knowledge_entries.length} entries, saved ${savedIds.length}.`
    )
    return savedIds
  } catch (error) {
    log.error('Error saving extracted knowledge:', error)
    return []
  }
}

export async function processConversationForKnowledge(
  conversationHistory: ConversationMessage[]
): Promise<string[]> {
  try {
    // 会話履歴が短すぎる場合は処理しない
    if (conversationHistory.length < 2) {
      return []
    }

    const extractionResult = await extractKnowledgeFromConversation(conversationHistory)

    if (extractionResult instanceof Error) {
      log.error('Knowledge extraction failed:', extractionResult)
      return []
    }

    return await saveExtractedKnowledge(extractionResult)
  } catch (error) {
    log.error('Error processing conversation for knowledge:', error)
    return []
  }
}
