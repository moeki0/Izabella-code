import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'

const getWorkingMemoryPath = (): string => join(app.getPath('userData'), 'memory.md')
const getKnowledgePath = (): string => join(app.getPath('userData'), 'knowledge')

export const DEFAULT_WORKING_MEMORY_TEMPLATE = `
# ユーザー情報
- **名前**: [名前]
- [その他のユーザー情報]
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

    try {
      await fs.access(knowledgePath)
    } catch {
      await fs.mkdir(knowledgePath, { recursive: true })
      return [] // Return empty array if directory was just created
    }

    const files = await fs.readdir(knowledgePath)
    const markdownFiles = files.filter((file) => file.endsWith('.md'))
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
    fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    const latestFiles = fileStats.slice(0, limit).map((file) => file.filename)

    return latestFiles
  } catch (error) {
    console.error('Error getting latest knowledge files:', error)
    return []
  }
}
