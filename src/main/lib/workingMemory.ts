import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'

const WORKING_MEMORY_PATH = join(app.getPath('userData'), 'memory.md')

export const DEFAULT_WORKING_MEMORY_TEMPLATE = `
# ユーザー情報
- **環境**: ローカルのChatZenインスタンス
- **作業メモリーの状態**: オン
- **名前**: [名前]
- [その他のユーザー情報]

# アクティブなプロジェクトの状況: [現在アクティブなプロジェクト名]
- **目的**: [プロジェクトの目的概要]
- **現在の状態**: [現在のフェーズと主な進捗]
- **重要な決定事項**: [最近の重要な決定]
- **主な参照**: [関連するファイルパスまたはURL]
- [アクティブなプロジェクトに関するその他の重要な概要]

# その他のプロジェクトの状況:
- **[他のプロジェクト名]**: [関連する可能性のある情報の簡単な概要]
- **[別のプロジェクト名]**: [関連する可能性のある情報の簡単な概要]
- ...

# タスク:
- [作業中の主なタスク一覧 - 短期タスクはナレッジベースで管理し、ここには概要を記録]

# 決定事項:
- [プロジェクト横断的な重要な決定や、他のセクションに含めにくい決定事項]

# 場所:
- [会話でよく参照されるファイルパスやURL]

# 概念:
- [会話でよく出てくる、または重要な概念や用語の定義]

# 人物:
- [会話に関連する人物とその役割]

# イベント:
- [重要な会議やイベント]

# その他:
- [上記に分類されないその他の重要な情報]

# ナレッジインデックス:
- このセクションには、ナレッジベースに保存された情報の概要と検索のヒントが含まれています
- 例：詳細なエンジニアリングガイドラインはナレッジベースに保存（ファイルパス: /docs/engineering/guidelines.md）
- 例：プロジェクト概要、チーム役割、技術アーキテクチャ情報はナレッジベースに保存
- Example: Application features (alpha version, modeless design, long-term memory) information is in working memory.
`

export const ensureWorkingMemoryExists = async (): Promise<void> => {
  try {
    await fs.access(WORKING_MEMORY_PATH)
  } catch {
    await fs.writeFile(WORKING_MEMORY_PATH, DEFAULT_WORKING_MEMORY_TEMPLATE)
  }
}

export const readWorkingMemory = async (): Promise<string> => {
  await ensureWorkingMemoryExists()
  return await fs.readFile(WORKING_MEMORY_PATH, 'utf-8')
}

export const updateWorkingMemory = async (content: string): Promise<void> => {
  await fs.writeFile(WORKING_MEMORY_PATH, content)
}
