import { ipcMain, app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'js-yaml'
import { store } from '../lib/store'
import { KnowledgeStore } from '../lib/knowledgeStore'
import { generateArtifactTitle } from '../lib/generateArtifactTitle'
import { mainWindow } from '..'

let knowledgeStore: KnowledgeStore | null = null

// KnowledgeStore シングルトンの取得
const getKnowledgeStore = (): KnowledgeStore => {
  if (knowledgeStore === null) {
    const openaiApiKey = store.get('apiKeys.openai') as string
    knowledgeStore = new KnowledgeStore(openaiApiKey)
  }
  return knowledgeStore
}

export const handleKnowledgeCreate = (): void => {
  // 既存のハンドラーをIDが指定された場合のために残す
  ipcMain.handle('create-knowledge', async (_, text: string, id?: string) => {
    try {
      const store = getKnowledgeStore()

      // IDが指定されていない場合はGeminiを使ってタイトルを自動生成
      let finalId = id
      if (!finalId) {
        const generatedTitle = await generateArtifactTitle(text)
        finalId = `note--${generatedTitle}`
      }

      await store.addTexts([text], [finalId])

      // タイトル情報をフロントエンドに送信
      const title = finalId.replace(/^note--/, '')
      if (mainWindow) {
        mainWindow.webContents.send('note-created', {
          id: finalId,
          title: title,
          content: text
        })
      }

      return {
        action: 'created',
        id: finalId,
        title: title
      }
    } catch (error) {
      console.error('Knowledge creation error:', error)
      throw new Error(`Knowledge creation failed: ${error}`)
    }
  })

  ipcMain.handle('reindex-knowledge', async () => {
    try {
      const knowledgePath = join(app.getPath('userData'), 'knowledge')

      // 既存のインデックスファイルを削除
      const indexPath = join(app.getPath('userData'), 'knowledge.hnsw')
      const mappingPath = `${indexPath}.mapping`

      try {
        await fs.unlink(indexPath)
      } catch {
        // ファイルが存在しない場合は無視
      }
      try {
        await fs.unlink(mappingPath)
      } catch {
        // ファイルが存在しない場合は無視
      }

      // 新しいKnowledgeStoreインスタンスを作成してインデックスをリセット
      const openaiApiKey = store.get('apiKeys.openai') as string
      knowledgeStore = new KnowledgeStore(openaiApiKey)

      // マークダウンファイルを読み込んでインデックスを再構築
      const files = await fs.readdir(knowledgePath)
      const mdFiles = files.filter((file: string) => file.endsWith('.md'))

      let reindexedCount = 0
      for (const file of mdFiles) {
        const filePath = join(knowledgePath, file)
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/)

          if (frontmatterMatch) {
            const [, frontmatterYaml, markdownContent] = frontmatterMatch
            const frontmatter = yaml.load(frontmatterYaml) as { id: string; importance?: number }

            await knowledgeStore.addTexts(
              [markdownContent.trim()],
              [frontmatter.id],
              [frontmatter.importance || 0]
            )
            reindexedCount++
          }
        } catch (error) {
          console.error(`Error reindexing file ${file}:`, error)
        }
      }

      if (mainWindow) {
        mainWindow.webContents.send('knowledge-reindexed', { count: reindexedCount })
      }

      return { success: true, reindexedCount }
    } catch (error) {
      console.error('Knowledge reindex error:', error)
      throw new Error(`Knowledge reindex failed: ${error}`)
    }
  })
}
