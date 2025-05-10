import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'

const getWorkingMemoryPath = (): string => join(app.getPath('userData'), 'memory.md')
const getKnowledgeIndexPath = (): string => join(app.getPath('userData'), 'knowledge-index.md')

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
`

export const DEFAULT_KNOWLEDGE_INDEX_TEMPLATE = `
- 例：詳細なエンジニアリングガイドラインはナレッジベースに保存（ファイルパス: /docs/engineering/guidelines.md）
- 例：プロジェクト概要、チーム役割、技術アーキテクチャ情報はナレッジベースに保存
`

export const ensureWorkingMemoryExists = async (): Promise<void> => {
  try {
    await fs.access(getWorkingMemoryPath())
  } catch {
    await fs.writeFile(getWorkingMemoryPath(), DEFAULT_WORKING_MEMORY_TEMPLATE)
  }
}

export const ensureKnowledgeIndexExists = async (): Promise<void> => {
  try {
    await fs.access(getKnowledgeIndexPath())
  } catch {
    await fs.writeFile(getKnowledgeIndexPath(), DEFAULT_KNOWLEDGE_INDEX_TEMPLATE)
  }
}

export const readWorkingMemory = async (): Promise<string> => {
  await ensureWorkingMemoryExists()
  return await fs.readFile(getWorkingMemoryPath(), 'utf-8')
}

export const readKnowledgeIndex = async (): Promise<string> => {
  await ensureKnowledgeIndexExists()
  return await fs.readFile(getKnowledgeIndexPath(), 'utf-8')
}

export const getMemoryContent = async (): Promise<string> => {
  return await readWorkingMemory()
}

export const getKnowledgeIndexContent = async (): Promise<string> => {
  return await readKnowledgeIndex()
}

export const updateWorkingMemory = async (content: string): Promise<void> => {
  await fs.writeFile(getWorkingMemoryPath(), content)
}

export const updateKnowledgeIndex = async (content: string): Promise<void> => {
  await fs.writeFile(getKnowledgeIndexPath(), content)
}

export const replaceWorkingMemory = async (oldText: string, newText: string): Promise<void> => {
  const currentContent = await readWorkingMemory()
  const updatedContent = currentContent.replace(oldText, newText)
  await fs.writeFile(getWorkingMemoryPath(), updatedContent)
}

export const replaceKnowledgeIndex = async (oldText: string, newText: string): Promise<void> => {
  const currentContent = await readKnowledgeIndex()
  const updatedContent = currentContent.replace(oldText, newText)
  await fs.writeFile(getKnowledgeIndexPath(), updatedContent)
}
