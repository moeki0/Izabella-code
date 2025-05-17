import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { store } from './store'
// UUIDの代わりに意味のあるIDを使用するので、import不要
import { KnowledgeStore } from './knowledgeStore'
import { AbstractionRequest, AbstractKnowledge } from './knowledgeSchema'
import { createMessage } from './message'
import { mainWindow } from '..'

// Generate abstract knowledge from conversations
export async function generateAbstractions(
  request: AbstractionRequest,
  userMessageId?: string // 関連するユーザーメッセージID
): Promise<AbstractKnowledge[]> {
  try {
    // Get the model to use
    const geminiModel = 'gemini-2.0-flash'
    const model = google(geminiModel)

    // Prepare conversation history in a format suitable for the prompt
    const conversationHistory = request.conversations
      .map((msg) => `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`)
      .join('\n\n')

    // Generate abstract concepts using LLM
    const result = await generateObject({
      model,
      schema: z.object({
        abstractions: z.array(
          z.object({
            content: z.string().describe('抽象化された概念や傾向、パターンの説明'),
            rationale: z
              .string()
              .describe(
                'この抽象化が導き出された具体的な事象と、それがより広い文脈でどのような意味を持つかの説明'
              ),
            knowledgeId: z
              .string()
              .describe(
                'この抽象化のためのユニークな識別子（英数字、ハイフン、アンダースコアのみ、スペースなし）'
              )
          })
        )
      }),
      temperature: 0.2,
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

## 会話履歴

${conversationHistory}

## タスク

上記の会話履歴から、3〜5つの抽象的な傾向やパターンを抽出してください。各抽象化には以下の要素を含めてください：

1. 抽象化された傾向やパターンを簡潔に表現した見出し
2. その傾向・パターンの詳細説明（2-3文程度）
3. この抽象化が会話のどの部分から導き出されたか、具体的な事例と共に説明
4. ナレッジID：抽象化の内容を表す一意の識別子（英数字、ハイフン、アンダースコアのみ使用可能）

ナレッジIDの例：
- 抽象化が「問題解決における構造的アプローチの採用」なら → "structured-problem-solving-approach"
- 抽象化が「テクノロジーの学習に対する探究心」なら → "technology-learning-curiosity"
- 抽象化が「効率的な情報整理への志向」なら → "efficient-information-organization-tendency"

抽象化は以下の基準を満たす必要があります：
- 具体的な事象から一般的な傾向・パターンへの変換であること
- 個別の事例を超えて応用可能な洞察を提供すること
- 会話の文脈から十分な根拠があること
- 人間の行動、思考、関心、課題解決アプローチなどに関するものであること
- ナレッジIDは内容を適切に反映し、一意性を持つこと（20-40文字程度が望ましい）

深い洞察と具体例に基づいた質の高い抽象化を提供してください。
`
    })

    // UIにリアルタイムで抽象化生成プロセスを表示
    try {
      if (mainWindow) {
        // メッセージの日付情報を送信
        const now = new Date()
        mainWindow.webContents.send('message-saved', messageId, {
          created_at: now.toISOString()
        })

        const abstractionsWithIds = result.object.abstractions.map((abstraction) => {
          return {
            ...abstraction,
            knowledgeId: `abstract-${abstraction.knowledgeId}`
          }
        })

        mainWindow.webContents.send('abstraction-generation', {
          abstractions: abstractionsWithIds,
          episodeIds: request.knowledge_ids,
          messageId: messageId,
          userMessageId: userMessageId
        })
      }
    } catch (error) {
      console.error('Failed to send abstraction generation to renderer:', error)
    }

    // Convert the results to AbstractKnowledge format
    const abstractKnowledge: AbstractKnowledge[] = result.object.abstractions.map((abstraction) => {
      // LLMが生成したナレッジIDを使用する
      // 不正な文字を取り除き、フォーマットを整える
      let idBase = ''

      if (abstraction.knowledgeId) {
        // 生成されたIDをクリーンアップ
        idBase = abstraction.knowledgeId
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-') // 英数字、ハイフン、アンダースコア以外を置換
          .replace(/--+/g, '-') // 連続したハイフンを1つに
          .replace(/^-|-$/g, '') // 先頭と末尾のハイフンを削除
          .slice(0, 50) // 長すぎる場合は切り詰める
      }

      // IDが生成されなかったか短すぎる場合はコンテンツから生成する
      if (!idBase || idBase.length < 3) {
        idBase = abstraction.content
          .split('\n')[0] // 最初の行だけを使用
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-') // 英数字とハイフン以外を置換
          .replace(/--+/g, '-') // 連続したハイフンを1つに
          .replace(/^-|-$/g, '') // 先頭と末尾のハイフンを削除
          .slice(0, 40) // 最初の40文字だけを使用
      }

      // IDが短すぎる場合は「abstract」を追加
      if (idBase.length < 3) {
        idBase = `abstract-concept-${Date.now()}`
      }

      // より構造化された読みやすいコンテンツフォーマットを使用
      const formattedContent = `# ${abstraction.content}

## 抽象化の根拠と具体例
${abstraction.rationale}

## 関連するエピソードナレッジ
${request.knowledge_ids.join(', ')}`

      // 最終的な抽象ナレッジIDを生成
      const finalId = `abstract-${idBase}`

      return {
        id: finalId,
        content: formattedContent,
        episode: request.knowledge_ids,
        is_abstract: true
      }
    })

    return abstractKnowledge
  } catch (error) {
    console.error('抽象化生成エラー:', error)
    return []
  }
}

// Save abstract knowledge and update episodic knowledge with references
export async function saveAbstractions(abstractions: AbstractKnowledge[]): Promise<string[]> {
  try {
    if (abstractions.length === 0) return []

    const openaiApiKey = store.get('apiKeys.openai') as string
    const knowledgeStore = new KnowledgeStore(openaiApiKey)
    const savedIds: string[] = []

    // Save each abstraction
    for (const abstraction of abstractions) {
      const { id, content, episode } = abstraction

      // Create a text document for the abstract knowledge with all required properties
      const abstractEntry = {
        id,
        content,
        metadata: {},
        created_at: Math.floor(Date.now() / 1000),
        importance: 0,
        episode,
        is_abstract: true
      }

      await knowledgeStore.addKnowledgeEntry(abstractEntry)
      savedIds.push(id)

      // Update each episodic knowledge with a reference to this abstraction
      for (const episodeId of episode) {
        await updateEpisodeWithAbstraction(episodeId, id, knowledgeStore)
      }
    }

    return savedIds
  } catch (error) {
    console.error('抽象化保存エラー:', error)
    return []
  }
}

// Helper to update an episodic knowledge entry with reference to an abstraction
async function updateEpisodeWithAbstraction(
  episodeId: string,
  abstractionId: string,
  knowledgeStore: KnowledgeStore
): Promise<void> {
  try {
    // Fetch the episode knowledge
    const episode = await knowledgeStore.getEntryById(episodeId)
    if (!episode) return

    // Add the abstraction reference if it doesn't already exist
    if (!episode.abstract) {
      episode.abstract = [abstractionId]
    } else if (!episode.abstract.includes(abstractionId)) {
      episode.abstract.push(abstractionId)
    } else {
      return // Abstraction already exists in the references
    }

    // Save the updated episode
    await knowledgeStore.updateEntry(episode)
  } catch (error) {
    console.error(`エピソード更新エラー (ID: ${episodeId}):`, error)
  }
}
