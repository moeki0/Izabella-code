import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'

const getWorkingMemoryPath = (): string => join(app.getPath('userData'), 'memory.md')
const getKnowledgePath = (): string => join(app.getPath('userData'), 'knowledge')

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

export const ensureWorkingMemoryExists = async (): Promise<void> => {
  try {
    await fs.access(getWorkingMemoryPath())
  } catch {
    await fs.writeFile(getWorkingMemoryPath(), DEFAULT_WORKING_MEMORY_TEMPLATE)
  }
}

export const readWorkingMemory = async (): Promise<string> => {
  await ensureWorkingMemoryExists()
  return await fs.readFile(getWorkingMemoryPath(), 'utf-8')
}

export const getMemoryContent = async (): Promise<string> => {
  return await readWorkingMemory()
}

export const updateWorkingMemory = async (content: string): Promise<void> => {
  await fs.writeFile(getWorkingMemoryPath(), content)
}

export const replaceWorkingMemory = async (oldText: string, newText: string): Promise<void> => {
  const currentContent = await readWorkingMemory()
  const updatedContent = currentContent.replace(oldText, newText)
  await fs.writeFile(getWorkingMemoryPath(), updatedContent)
}

export async function getLatestKnowledgeFiles(limit = 40): Promise<string[]> {
  try {
    const knowledgePath = getKnowledgePath()

    // Ensure the knowledge directory exists
    try {
      await fs.access(knowledgePath)
    } catch {
      await fs.mkdir(knowledgePath, { recursive: true })
      return [] // Return empty array if directory was just created
    }

    // Read all files in the knowledge directory
    const files = await fs.readdir(knowledgePath)

    // Filter only markdown files
    const markdownFiles = files.filter((file) => file.endsWith('.md'))

    // Get file stats for each markdown file to sort by modification time
    const fileStats = await Promise.all(
      markdownFiles.map(async (filename) => {
        const filePath = join(knowledgePath, filename)
        const stats = await fs.stat(filePath)
        return {
          filename,
          mtime: stats.mtime
        }
      })
    )

    // Sort files by modification time (newest first)
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    // Get the filenames of the latest N files
    const latestFiles = fileStats.slice(0, limit).map((file) => file.filename)

    return latestFiles
  } catch (error) {
    console.error('Error getting latest knowledge files:', error)
    return []
  }
}

// Legacy functions to maintain compatibility with existing code
export const getKnowledgeIndexPath = (): string =>
  join(app.getPath('userData'), 'knowledge-index.md')
export const DEFAULT_KNOWLEDGE_INDEX_TEMPLATE = ''
export const ensureKnowledgeIndexExists = async (): Promise<void> => {}
export const readKnowledgeIndex = async (): Promise<string> => ''
export const getKnowledgeIndexContent = async (): Promise<string> => ''
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const updateKnowledgeIndex = async (_: string): Promise<void> => {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const replaceKnowledgeIndex = async (_oldText: string, _newText: string): Promise<void> => {}
