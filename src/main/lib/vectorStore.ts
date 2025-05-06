import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'

export interface TextMetadata {
  id: string
  text: string
}

export class SqliteVectorStore {
  private db: Database.Database
  private dbPath: string
  private embeddings: OpenAIEmbeddings
  private tableName: string

  constructor(openaiApiKey?: string) {
    this.tableName = `vectors_knowledge`
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY
    })

    this.dbPath = join(app.getPath('userData'), `knowledge.sqlite`)
    this.db = new Database(this.dbPath)

    this.initDatabase()
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        embedding BLOB,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_id ON ${this.tableName}(id)`)

    console.log(`標準モードのベクトルストアを初期化しました: ${this.tableName}`)
  }

  async addDocuments(texts: string[], metadatas: TextMetadata[]): Promise<number> {
    if (texts.length !== metadatas.length) {
      throw new Error('Texts and metadatas must have the same length')
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    let insertCount = 0

    for (let i = 0; i < texts.length; i++) {
      const chunks = await splitter.splitText(texts[i])

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const docId = `${metadatas[i].id}_chunk_${j}`
        const metadataStr = JSON.stringify(metadatas[i])

        try {
          // OpenAIから埋め込みベクトルを取得
          const embeddings = await this.embeddings.embedQuery(chunk)
          const embeddingBuffer = Buffer.from(new Float32Array(embeddings).buffer)

          // トランザクションでデータを挿入
          this.db.transaction(() => {
            // 標準テーブルに挿入
            this.db
              .prepare(
                `
              INSERT OR REPLACE INTO ${this.tableName} (id, content, metadata, embedding, created_at)
              VALUES (?, ?, ?, ?, strftime('%s', 'now'))
            `
              )
              .run(docId, chunk, metadataStr, embeddingBuffer)
          })()

          insertCount++
        } catch (error) {
          console.error('ドキュメント挿入エラー:', error)
        }
      }
    }

    return insertCount
  }

  async similaritySearch(
    query: string,
    k = 5
  ): Promise<Array<{ pageContent: string; metadata: TextMetadata }>> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query)

      const recentDocs = this.db
        .prepare(
          `
        SELECT id, content, metadata, embedding
        FROM ${this.tableName}
        ORDER BY rowid DESC
        LIMIT 100
      `
        )
        .all() as Array<{ id: string; content: string; metadata: string; embedding: Buffer }>

      const results = recentDocs
        .map((doc) => {
          const docEmbedding = new Float32Array(
            doc.embedding.buffer.slice(
              doc.embedding.byteOffset,
              doc.embedding.byteOffset + doc.embedding.byteLength
            )
          )

          const similarity = this.cosineSimilarity(queryEmbedding, Array.from(docEmbedding))

          return {
            ...doc,
            similarity
          }
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k)

      return results.map((doc) => ({
        pageContent: doc.content,
        metadata: JSON.parse(doc.metadata) as TextMetadata
      }))
    } catch (error) {
      console.error('検索エラー:', error)
      return []
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return

    const placeholders = ids.map(() => '?').join(', ')

    this.db.transaction(() => {
      this.db
        .prepare(
          `
        DELETE FROM ${this.tableName}
        WHERE id IN (${placeholders}) OR id LIKE ?
      `
        )
        .run(...ids, `${ids[0]}_%`)
    })()
  }

  async addTexts(texts: string[], metadatas: TextMetadata[]): Promise<number> {
    return this.addDocuments(texts, metadatas)
  }

  async upsertTexts(texts: string[], metadatas: TextMetadata[]): Promise<number> {
    if (texts.length !== metadatas.length) {
      throw new Error('Texts and metadatas must have the same length')
    }

    const ids = metadatas.map((m) => m.id)
    await this.deleteByIds(ids)
    return this.addTexts(texts, metadatas)
  }

  async search(
    query: string,
    k = 5
  ): Promise<Array<{ pageContent: string; metadata: TextMetadata }>> {
    return this.similaritySearch(query.slice(0, 100), k)
  }

  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}
