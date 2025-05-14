import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'
import { HierarchicalNSW } from 'hnswlib-node'
import * as yaml from 'js-yaml'
import { v4 as uuidv4 } from 'uuid'

interface KnowledgeEntry {
  id: string
  content: string
  metadata: Record<string, unknown>
  created_at: number
  importance?: number
}

export class MarkdownKnowledgeStore {
  private knowledgePath: string
  private embeddings: OpenAIEmbeddings
  private index!: HierarchicalNSW
  private indexPath: string
  private idToDocId: Map<number, string>
  private docIdToId: Map<string, number>
  private nextId: number
  private debug: boolean

  constructor(openaiApiKey?: string, debug = true) {
    this.debug = debug

    if (this.debug) console.log('Initializing MarkdownKnowledgeStore')

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY
    })

    this.knowledgePath = join(app.getPath('userData'), 'knowledge')
    if (this.debug) console.log(`Knowledge path: ${this.knowledgePath}`)

    this.indexPath = join(app.getPath('userData'), 'knowledge.hnsw')

    // ID mappings between HNSW index and document IDs
    this.idToDocId = new Map()
    this.docIdToId = new Map()
    this.nextId = 0

    this.initKnowledgeDirectory()
    this.initHnswIndex()
  }

  private async initKnowledgeDirectory(): Promise<void> {
    try {
      if (this.debug) console.log(`Creating directory: ${this.knowledgePath}`)
      await fs.mkdir(this.knowledgePath, { recursive: true })
      if (this.debug) console.log('Knowledge directory created or already exists')
    } catch (error) {
      console.error('ナレッジディレクトリ作成エラー:', error)
    }
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

  private async readMarkdownFile(filePath: string): Promise<KnowledgeEntry> {
    if (this.debug) console.log(`Reading markdown file: ${filePath}`)
    const content = await fs.readFile(filePath, 'utf-8')
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/)

    if (!frontmatterMatch) {
      throw new Error(`Invalid markdown format in file: ${filePath}`)
    }

    const [, frontmatterYaml, markdownContent] = frontmatterMatch
    const frontmatter = yaml.load(frontmatterYaml) as {
      id: string
      created_at: number
      metadata: Record<string, unknown>
      importance?: number
    }

    return {
      id: frontmatter.id,
      content: markdownContent.trim(),
      metadata: frontmatter.metadata || {},
      created_at: frontmatter.created_at || Math.floor(Date.now() / 1000),
      importance: frontmatter.importance || 0
    }
  }

  private async writeMarkdownFile(entry: KnowledgeEntry): Promise<void> {
    if (this.debug) console.log(`Writing markdown file for ID: ${entry.id}`)

    const frontmatter = {
      id: entry.id,
      created_at: entry.created_at,
      importance: entry.importance || 0,
      metadata: entry.metadata || {}
    }

    const content = `---
${yaml.dump(frontmatter)}---

${entry.content}
`

    const filePath = join(this.knowledgePath, `${entry.id}.md`)
    if (this.debug) console.log(`File path: ${filePath}`)

    try {
      await fs.writeFile(filePath, content, 'utf-8')
      if (this.debug) console.log(`File written successfully: ${filePath}`)
    } catch (error) {
      console.error(`Error writing file: ${error}`)
      throw error
    }
  }

  async addDocuments(texts: string[], ids: string[]): Promise<number> {
    if (this.debug) console.log(`Adding ${texts.length} documents`)

    if (texts.length !== ids.length) {
      throw new Error('Texts and ids must have the same length')
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    let insertCount = 0

    for (let i = 0; i < texts.length; i++) {
      if (this.debug) console.log(`Processing document ${i + 1}/${texts.length} with ID: ${ids[i]}`)

      const chunks = await splitter.splitText(texts[i])
      if (this.debug) console.log(`Split into ${chunks.length} chunks`)

      // If the ID is not provided, generate a UUID
      const docId = ids[i] || uuidv4()

      // Create or update the main markdown file with the full content
      const markdownEntry: KnowledgeEntry = {
        id: docId,
        content: texts[i],
        metadata: {},
        created_at: Math.floor(Date.now() / 1000),
        importance: 0
      }

      try {
        await this.writeMarkdownFile(markdownEntry)
        if (this.debug) console.log(`Main markdown file written for ID: ${docId}`)
      } catch (error) {
        console.error(`Failed to write markdown file: ${error}`)
        continue
      }

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const chunkId = `${docId}_chunk_${j}`

        try {
          // Get embedding vector from OpenAI
          if (this.debug) console.log(`Getting embedding for chunk ${j + 1}/${chunks.length}`)
          const embedding = await this.embeddings.embedQuery(chunk)

          // Add to HNSW index
          const id = this.nextId++
          this.index.addPoint(embedding, id)
          this.idToDocId.set(id, chunkId)
          this.docIdToId.set(chunkId, id)
          if (this.debug) console.log(`Added to index: ${chunkId} -> ${id}`)

          insertCount++
        } catch (error) {
          console.error('ドキュメント挿入エラー:', error)
        }
      }
    }

    // Save the index after adding documents
    if (this.debug) console.log('Saving index')
    await this.saveIndex()
    if (this.debug) console.log(`Inserted ${insertCount} chunks in total`)

    return insertCount
  }

  async similaritySearch(
    query: string,
    k = 20
  ): Promise<
    Array<{
      pageContent: string
      id: string
      _similarity: number
      _importance: number
      created_at: number
    }>
  > {
    try {
      if (this.debug) console.log(`Searching for: ${query}`)
      const queryEmbedding = await this.embeddings.embedQuery(query)

      // Search using HNSW index
      const result = this.index.searchKnn(queryEmbedding, k)

      // Get docIds from index results
      const docIds = result.neighbors
        .map((id) => this.idToDocId.get(id))
        .filter(Boolean) as string[]

      if (docIds.length === 0) {
        if (this.debug) console.log('No results found')
        return []
      }

      // Extract original IDs from chunk IDs and deduplicate
      const originalIds = new Set<string>()
      docIds.forEach((docId) => {
        const originalId = docId.split('_chunk_')[0]
        originalIds.add(originalId)
      })

      if (this.debug) console.log(`Found ${originalIds.size} unique documents`)

      // Load markdown files for these IDs
      const entries: KnowledgeEntry[] = []
      for (const id of originalIds) {
        try {
          const filePath = join(this.knowledgePath, `${id}.md`)
          const entry = await this.readMarkdownFile(filePath)
          entries.push(entry)
        } catch (error) {
          console.error(`Error reading markdown file for ID ${id}:`, error)
        }
      }

      // Map the entries back to the original result order with similarity scores
      const results = docIds
        .map((docId, index) => {
          const originalId = docId.split('_chunk_')[0]
          const entry = entries.find((e) => e.id === originalId)

          if (!entry) return null

          // Base similarity score (from vector search)
          const similarity = 1 - result.distances[index] // Convert distance to similarity

          // Include importance and creation timestamp in the result object for later ranking
          return {
            pageContent: entry.content,
            id: originalId,
            _similarity: similarity,
            _importance: entry.importance || 0,
            created_at: entry.created_at || 0
          }
        })
        .filter(Boolean) as Array<{
        pageContent: string
        id: string
        _similarity: number
        _importance: number
        created_at: number
      }>

      if (this.debug) console.log(`Returning ${results.length} results`)
      return results
    } catch (error) {
      console.error('検索エラー:', error)
      return []
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return
    if (this.debug) console.log(`Deleting ${ids.length} documents`)

    for (const id of ids) {
      try {
        // Delete the markdown file
        const filePath = join(this.knowledgePath, `${id}.md`)
        if (this.debug) console.log(`Deleting file: ${filePath}`)
        await fs.readFile(filePath)
        await fs.unlink(filePath)

        // Remove from index
        // Find all chunk IDs that start with this ID
        const chunkIds: string[] = []
        this.idToDocId.forEach((docId, indexId) => {
          if (docId.startsWith(`${id}_chunk_`)) {
            chunkIds.push(docId)
            this.index.markDelete(indexId)
            this.idToDocId.delete(indexId)
          }
        })

        // Remove from docIdToId mapping
        chunkIds.forEach((chunkId) => {
          this.docIdToId.delete(chunkId)
        })

        if (this.debug) console.log(`Removed ${chunkIds.length} chunks from index`)
      } catch (error) {
        console.error(`Error deleting knowledge entry with ID ${id}:`, error)
      }
    }

    // Save the index after deletions
    if (this.debug) console.log('Saving index after deletions')
    await this.saveIndex()
  }

  async addTexts(texts: string[], ids: string[]): Promise<number> {
    return this.addDocuments(texts, ids)
  }

  async upsertText(text: string, id: string, targetId: string): Promise<number> {
    if (this.debug) console.log(`Upserting text`)

    // Read the target entry first to get its importance
    let importance = 0
    try {
      const filePath = join(this.knowledgePath, `${targetId}.md`)
      const entry = await this.readMarkdownFile(filePath)
      importance = entry.importance || 0
      if (this.debug)
        console.log(`Retrieved importance ${importance} from existing entry ${targetId}`)
    } catch (error) {
      if (this.debug) console.log(`Could not retrieve importance from ${targetId}:`, error)
    }

    // Delete the old entry
    await this.deleteByIds([targetId])

    // Create the new entry with preserved importance
    try {
      const markdownEntry: KnowledgeEntry = {
        id,
        content: text,
        metadata: {},
        created_at: Math.floor(Date.now() / 1000),
        importance
      }

      await this.writeMarkdownFile(markdownEntry)

      // Add to index
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      })

      const chunks = await splitter.splitText(text)
      let insertCount = 0

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const chunkId = `${id}_chunk_${j}`

        try {
          // Get embedding vector
          const embedding = await this.embeddings.embedQuery(chunk)

          // Add to HNSW index
          const indexId = this.nextId++
          this.index.addPoint(embedding, indexId)
          this.idToDocId.set(indexId, chunkId)
          this.docIdToId.set(chunkId, indexId)

          insertCount++
        } catch (error) {
          console.error('Chunk insertion error:', error)
        }
      }

      // Save the index
      await this.saveIndex()

      return insertCount
    } catch (error) {
      console.error('Error in upsertText:', error)
      return 0
    }
  }

  async search(
    query: string,
    k = 20
  ): Promise<
    Array<{
      pageContent: string
      id: string
      _similarity: number
      _importance: number
      created_at: number
    }>
  > {
    return this.similaritySearch(query.slice(0, 100), k)
  }

  async increaseImportance(id: string, amount = 1): Promise<boolean> {
    try {
      if (this.debug) console.log(`Increasing importance for ID: ${id}`)

      const filePath = join(this.knowledgePath, `${id}.md`)

      try {
        const entry = await this.readMarkdownFile(filePath)

        // Increase importance
        entry.importance = (entry.importance || 0) + amount

        // Write back to file
        await this.writeMarkdownFile(entry)

        if (this.debug) console.log(`Importance updated for ${id} to ${entry.importance}`)
        return true
      } catch (error) {
        console.error(`Error increasing importance for ID ${id}:`, error)
        return false
      }
    } catch (error) {
      console.error(`Error in increaseImportance:`, error)
      return false
    }
  }

  close(): void {
    // No database connection to close
    if (this.debug) console.log('Closing MarkdownKnowledgeStore')
  }
}
