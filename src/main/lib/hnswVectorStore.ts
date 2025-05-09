import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HierarchicalNSW } from 'hnswlib-node'

export class HnswVectorStore {
  private db: Database.Database
  private dbPath: string
  private embeddings: OpenAIEmbeddings
  private tableName: string
  private index!: HierarchicalNSW // Using definite assignment assertion
  private indexPath: string
  private idToDocId: Map<number, string>
  private docIdToId: Map<string, number>
  private nextId: number

  constructor(openaiApiKey?: string) {
    this.tableName = `vectors_knowledge`
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY
    })

    this.dbPath = join(app.getPath('userData'), `knowledge.sqlite`)
    this.indexPath = join(app.getPath('userData'), `knowledge.hnsw`)
    this.db = new Database(this.dbPath)

    // ID mappings between HNSW index and SQLite
    this.idToDocId = new Map()
    this.docIdToId = new Map()
    this.nextId = 0

    this.initDatabase()
    this.initHnswIndex()
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `)

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_id ON ${this.tableName}(id)`)
  }

  private initHnswIndex(): void {
    try {
      // OpenAI embeddings are 1536 dimensions
      const dim = 1536
      this.index = new HierarchicalNSW('cosine', dim)

      // Check if index file exists and initialize
      this.initOrLoadIndex()
    } catch (error) {
      console.error('HNSWインデックス初期化エラー:', error)
      // If there's an error, re-initialize the index
      const dim = 1536
      const maxElements = 100000
      this.index = new HierarchicalNSW('cosine', dim)
      this.index.initIndex(maxElements, 16, 200, 100)
    }
  }

  private async initOrLoadIndex(): Promise<void> {
    const indexExists = await this.indexExists()
    if (indexExists) {
      await this.loadIndex()
    } else {
      // Initialize empty index
      const maxElements = 100000 // Initial capacity, can be increased later
      this.index.initIndex(maxElements, 16, 200, 100)
    }
  }

  private async indexExists(): Promise<boolean> {
    try {
      await fs.access(this.indexPath)
      return true
    } catch {
      return false
    }
  }

  private async loadIndex(): Promise<void> {
    try {
      // Load the index file
      await this.index.readIndex(this.indexPath)

      // Load the mapping data
      const mappingPath = `${this.indexPath}.mapping`
      const mappingData = await fs.readFile(mappingPath, 'utf-8')
      const mapping = JSON.parse(mappingData)

      this.idToDocId = new Map(
        Object.entries(mapping.idToDocId).map(([key, value]) => [Number(key), value as string])
      )
      this.docIdToId = new Map(
        Object.entries(mapping.docIdToId).map(([key, value]) => [key, Number(value)])
      )
      this.nextId = mapping.nextId
    } catch (error) {
      console.error('インデックス読み込みエラー:', error)
      // If there's an error, re-initialize the index
      const dim = 1536
      const maxElements = 100000
      this.index = new HierarchicalNSW('cosine', dim)
      this.index.initIndex(maxElements, 16, 200, 100)
      this.idToDocId = new Map()
      this.docIdToId = new Map()
      this.nextId = 0
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      // Save the index file
      await this.index.writeIndex(this.indexPath)

      // Save the mapping data
      const idToDocIdObject: Record<number, string> = {}
      const docIdToIdObject: Record<string, number> = {}

      this.idToDocId.forEach((docId, id) => {
        idToDocIdObject[id] = docId
      })

      this.docIdToId.forEach((id, docId) => {
        docIdToIdObject[docId] = id
      })

      const mappingData = {
        idToDocId: idToDocIdObject,
        docIdToId: docIdToIdObject,
        nextId: this.nextId
      }

      const mappingPath = `${this.indexPath}.mapping`
      await fs.writeFile(mappingPath, JSON.stringify(mappingData))
    } catch (error) {
      console.error('インデックス保存エラー:', error)
    }
  }

  async addDocuments(texts: string[], ids: string[]): Promise<number> {
    if (texts.length !== ids.length) {
      throw new Error('Texts and ids must have the same length')
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    // Initialize the splitter to split large texts into chunks

    let insertCount = 0

    for (let i = 0; i < texts.length; i++) {
      const chunks = await splitter.splitText(texts[i])

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const docId = `${ids[i]}_chunk_${j}`

        try {
          // Get embedding vector from OpenAI
          const embedding = await this.embeddings.embedQuery(chunk)

          // Insert only content and ID into SQLite database
          this.db.transaction(() => {
            this.db
              .prepare(
                `
                INSERT OR REPLACE INTO ${this.tableName} (id, content, metadata, created_at)
                VALUES (?, ?, ?, strftime('%s', 'now'))
              `
              )
              .run(docId, chunk, '{}')
          })()

          // Add to HNSW index
          const id = this.nextId++
          this.index.addPoint(embedding, id)
          this.idToDocId.set(id, docId)
          this.docIdToId.set(docId, id)

          insertCount++
        } catch (error) {
          console.error('ドキュメント挿入エラー:', error)
        }
      }
    }

    // Save the index after adding documents
    await this.saveIndex()

    return insertCount
  }

  async similaritySearch(
    query: string,
    k = 5
  ): Promise<Array<{ pageContent: string; id: string; _similarity: number }>> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query)

      // Search using HNSW index
      const result = this.index.searchKnn(queryEmbedding, k)

      // Get docIds from index results
      const docIds = result.neighbors
        .map((id) => this.idToDocId.get(id))
        .filter(Boolean) as string[]

      if (docIds.length === 0) {
        return []
      }

      // Fetch full documents from SQLite
      const placeholders = docIds.map(() => '?').join(', ')
      const docs = this.db
        .prepare(
          `
        SELECT id, content
        FROM ${this.tableName}
        WHERE id IN (${placeholders})
        `
        )
        .all(...docIds) as Array<{ id: string; content: string }>

      // Create a map for quick lookup
      const docsMap = new Map(docs.map((doc) => [doc.id, doc]))

      // Reorder results to match original search order
      const results = docIds
        .map((docId, index) => {
          const doc = docsMap.get(docId)
          if (!doc) return null

          // Extract the original ID from the document ID
          const originalId = docId.split('_chunk_')[0]

          return {
            pageContent: doc.content,
            id: originalId,
            // For internal tracking only, not returned to client
            _similarity: 1 - result.distances[index] // Convert distance to similarity (HNSW uses distance, not similarity)
          }
        })
        .filter(Boolean) as Array<{
        pageContent: string
        id: string
        _similarity: number
      }>

      return results.map(({ pageContent, id, _similarity }) => ({
        pageContent,
        id,
        _similarity
      }))
    } catch (error) {
      console.error('検索エラー:', error)
      return []
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return

    const placeholders = ids.map(() => '?').join(', ')
    const docsToDelete = this.db
      .prepare(
        `
        SELECT id FROM ${this.tableName}
        WHERE id IN (${placeholders}) OR id LIKE ?
        `
      )
      .all(...ids, `${ids[0]}_%`) as Array<{ id: string }>
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

    const docIdsToDelete = docsToDelete.map((doc) => doc.id)
    docIdsToDelete.forEach((id) => {
      this.index.markDelete(Number(id))
    })
  }

  async addTexts(texts: string[], ids: string[]): Promise<number> {
    return this.addDocuments(texts, ids)
  }

  async upsertTexts(texts: string[], ids: string[]): Promise<number> {
    if (texts.length !== ids.length) {
      throw new Error('Texts and ids must have the same length')
    }

    await this.deleteByIds(ids)
    return this.addTexts(texts, ids)
  }

  async search(
    query: string,
    k = 5
  ): Promise<Array<{ pageContent: string; id: string; _similarity: number }>> {
    return this.similaritySearch(query.slice(0, 100), k)
  }

  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}
