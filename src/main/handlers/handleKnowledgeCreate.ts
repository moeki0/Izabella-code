import { ipcMain } from 'electron'
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
}
