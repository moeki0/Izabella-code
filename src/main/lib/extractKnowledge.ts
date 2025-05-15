import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { knowledgeExtractionSchema, KnowledgeExtractionResult } from './knowledgeSchema'
import { saveToKnowledgeBase } from './knowledgeTools'
import log from 'electron-log/main'
import { generateKnowledgeId } from './generateKnowledgeId'
import { z } from 'zod'

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
- アシスタントが生成した役立つコンテンツはあとで再利用できるように記録してください。`

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

/**
 * 長いテキストを要約して縮小する
 */
async function compressKnowledge(text: string): Promise<string> {
  try {
    const model = google('gemini-2.0-flash-lite')

    const systemPrompt = `あなたは長いナレッジテキストを要約する専門家です。以下のルールに従ってください：
1. 重要な情報を全て保持してください
2. 冗長な表現、例示、詳細な説明を簡潔にしてください
3. 全体の意味と文脈を維持してください
4. 結果は半分程度に圧縮してください
5. 元のテキストのスタイルとトーンを維持してください`

    const userPrompt = `以下のナレッジテキストを要約して簡潔にしてください：
---
${text}
---

重要な情報を全て保持しながら、冗長さを排除し、半分程度に圧縮してください`

    const response = await generateObject({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      schema: z.object({
        compressed_text: z.string().describe('圧縮されたナレッジテキスト')
      })
    })

    log.info('Knowledge compression completed')
    return response.object.compressed_text
  } catch (error) {
    log.error('Error compressing knowledge:', error)
    // Fallback to original text if compression fails
    return text
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
        log.info(`Skipping low relevance entry: ${entry.id}`)
        continue
      }

      let contentToSave = entry.content

      // 1000文字以上の場合は圧縮する
      if (contentToSave.length > 1000) {
        log.info(`Compressing long knowledge entry: ${entry.id} (${contentToSave.length} chars)`)
        contentToSave = await compressKnowledge(contentToSave)
        log.info(`Compressed to ${contentToSave.length} chars`)
      }

      const id = entry.id || (await generateKnowledgeId(entry.content, 'knowledge'))

      await saveToKnowledgeBase({
        text: contentToSave,
        id: id,
        similarityThreshold: 0.8
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
