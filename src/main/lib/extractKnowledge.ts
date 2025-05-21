import { google } from '@ai-sdk/google'
import {
  searchKnowledge,
  createKnowledge,
  updateKnowledge,
  deleteKnowledge
} from './knowledgeTools'
import { Agent } from '@mastra/core'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function processConversationForKnowledge(
  conversationHistory: ConversationMessage[]
): Promise<string[]> {
  try {
    const tools = {
      search_knowledge: searchKnowledge,
      create_knowledge: createKnowledge,
      update_knowledge: updateKnowledge,
      delete_knowledge: deleteKnowledge
    }

    const model = google('gemini-2.5-flash-preview-04-17')
    const agent = new Agent({
      instructions: `
あなたは会話から知識を抽出し、整理・管理するエージェントです。まず会話履歴を分析して重要な情報を特定し、それを知識ベースに保存します。

## フェーズ1: 知識の抽出
会話履歴から、ナレッジベースに保存すべき重要な情報を抽出してください。抽出すべき情報の例:
- ユーザーに関する事実や好み
- プロジェクトに関する決定事項
- 重要な概念や用語の定義
- タスクや計画
- 技術的な詳細や解決策
- 再利用可能なコード、コマンド、手順

以下の情報は抽出しないでください:
- 一時的な挨拶や感情表現
- 会話の流れを維持するための定型句
- すぐに古くなる一時的な情報
- 誤っている可能性が高い情報

各知識エントリは以下の形式で作成してください:
- id: 内容を簡潔に表す英数字とハイフンの文字列（例: user-preferences, project-timeline）
- content: 抽出したテキスト内容（詳細かつ具体的に）
- importance: 知識の重要度を0-100で評価（100が最も重要）

## フェーズ2: 知識の管理
抽出した各知識エントリについて:
1. search_knowledge ツールを使用して、類似する既存の知識エントリがあるか検索
2. 類似する知識が見つかった場合:
   - 既存の知識と新しい知識を比較分析
   - ナレッジの数が膨大になりすぎないようにマージできそうな情報があれば積極的に既存のナレッジにマージする
   - 情報に矛盾がある場合は、新しい情報を優先
   - update_knowledge ツールを使用して知識を更新
3. 類似する知識が見つからない場合:
   - create_knowledge ツールを使用して新しいエントリを作成
   - importanceパラメータには評価した重要度（0-100）を設定
4. 古くなったり不要になった知識が見つかった場合:
   - delete_knowledge ツールを使用して削除

重要な注意事項:
- 会話の文脈全体を考慮して情報の重要性を判断してください
- 同じ内容の重複したエントリを作成しないでください
- 情報は整理して保存し、後で検索しやすいようにしてください
- 1000文字を超える長い知識エントリは、重要な情報を保持したまま簡潔に要約してください
- 処理した知識エントリのIDリストを最終的に返してください`,
      name: 'KnowledgeAgent',
      model,
      tools
    })

    const conversationString = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n\n')

    const stream = await agent.stream(
      [
        {
          role: 'user',
          content: `
以下の会話履歴を分析し、重要な知識を抽出して処理してください。そして、作成または更新した知識エントリのIDリストを返してください。

会話履歴:
${conversationString}`
        }
      ],
      {
        maxSteps: 30,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 2048
            }
          }
        }
      }
    )

    const processedIds: string[] = []
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'tool-result') {
        const result = JSON.parse(chunk.result)
        if (
          result.action === 'created' ||
          result.action === 'updated' ||
          result.action === 'merged'
        ) {
          processedIds.push(result.id)
        }
      }
    }

    return processedIds
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return []
  }
}
