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

export class KnowledgeStore {
  private knowledgePath: string
  private embeddings: OpenAIEmbeddings
  private index!: HierarchicalNSW
  private indexPath: string
  private idToDocId: Map<number, string>
  private docIdToId: Map<string, number>
  private nextId: number

  constructor(openaiApiKey?: string) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: openaiApiKey || process.env.OPENAI_API_KEY
    })
    this.knowledgePath = join(app.getPath('userData'), 'knowledge')
    this.indexPath = join(app.getPath('userData'), 'knowledge.hnsw')
    this.idToDocId = new Map()
    this.docIdToId = new Map()
    this.nextId = 0
    this.initKnowledgeDirectory()
    this.initHnswIndex()
  }

  private async initKnowledgeDirectory(): Promise<void> {
    await fs.mkdir(this.knowledgePath, { recursive: true })
  }

  private initHnswIndex(): void {
    try {
      const dim = 1536
      this.index = new HierarchicalNSW('cosine', dim)
      this.initOrLoadIndex()
    } catch {
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
      const maxElements = 100000
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
      await this.index.readIndex(this.indexPath)
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
    } catch {
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
      await this.index.writeIndex(this.indexPath)
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
      // eslint-disable-next-line no-empty
    } catch {}
  }

  private async readMarkdownFile(filePath: string): Promise<KnowledgeEntry> {
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
    await fs.writeFile(filePath, content, 'utf-8')
  }

  async addDocuments(texts: string[], ids: string[]): Promise<number> {
    if (texts.length !== ids.length) {
      throw new Error('Texts and ids must have the same length')
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    let insertCount = 0

    for (let i = 0; i < texts.length; i++) {
      const chunks = await splitter.splitText(texts[i])
      const docId = ids[i] || uuidv4()
      const markdownEntry: KnowledgeEntry = {
        id: docId,
        content: texts[i],
        metadata: {},
        created_at: Math.floor(Date.now() / 1000),
        importance: 0
      }

      try {
        await this.writeMarkdownFile(markdownEntry)
      } catch {
        continue
      }

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const chunkId = `${docId}_chunk_${j}`

        try {
          const embedding = await this.embeddings.embedQuery(chunk)
          const id = this.nextId++
          this.index.addPoint(embedding, id)
          this.idToDocId.set(id, chunkId)
          this.docIdToId.set(chunkId, id)
          insertCount++
        } catch (err) {
          console.error('ドキュメント挿入エラー:', err)
        }
      }
    }

    await this.saveIndex()

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
      const queryEmbedding = await this.embeddings.embedQuery(query)
      const result = this.index.searchKnn(queryEmbedding, k)
      const docIds = result.neighbors
        .map((id) => this.idToDocId.get(id))
        .filter(Boolean) as string[]

      if (docIds.length === 0) {
        return []
      }

      const originalIds = new Set<string>()
      docIds.forEach((docId) => {
        const originalId = docId.split('_chunk_')[0]
        originalIds.add(originalId)
      })

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

      const results = docIds
        .map((docId, index) => {
          const originalId = docId.split('_chunk_')[0]
          const entry = entries.find((e) => e.id === originalId)
          if (!entry) return null
          const similarity = 1 - result.distances[index] // Convert distance to similarity
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

      return results
    } catch (err) {
      console.error('検索エラー:', err)
      return []
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return
    for (const id of ids) {
      try {
        const filePath = join(this.knowledgePath, `${id}.md`)
        await fs.readFile(filePath)
        await fs.unlink(filePath)
        const chunkIds: string[] = []
        this.idToDocId.forEach((docId, indexId) => {
          if (docId.startsWith(`${id}_chunk_`)) {
            chunkIds.push(docId)
            this.index.markDelete(indexId)
            this.idToDocId.delete(indexId)
          }
        })

        chunkIds.forEach((chunkId) => {
          this.docIdToId.delete(chunkId)
        })
      } catch (error) {
        console.error(`Error deleting knowledge entry with ID ${id}:`, error)
      }
    }
    await this.saveIndex()
  }

  async addTexts(texts: string[], ids: string[]): Promise<number> {
    return this.addDocuments(texts, ids)
  }

  async upsertText(text: string, id: string, targetId: string): Promise<number> {
    let importance = 0
    try {
      const filePath = join(this.knowledgePath, `${targetId}.md`)
      const entry = await this.readMarkdownFile(filePath)
      importance = entry.importance || 0
    } catch {
      // nothing to do
    }

    await this.deleteByIds([targetId])

    try {
      const markdownEntry: KnowledgeEntry = {
        id,
        content: text,
        metadata: {},
        created_at: Math.floor(Date.now() / 1000),
        importance
      }

      await this.writeMarkdownFile(markdownEntry)

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
          const embedding = await this.embeddings.embedQuery(chunk)

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
    } catch (err) {
      console.error('Error in upsertText:', err)
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
    // プレフィックス検索のサポート
    if (query.startsWith('prefix:')) {
      const prefix = query.substring(7).trim()
      return this.searchByPrefix(prefix, k)
    }

    // 通常の類似度検索
    return this.similaritySearch(query.slice(0, 100), k)
  }

  // IDのプレフィックスで検索する関数
  async searchByPrefix(
    prefix: string,
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
      const allFiles = await fs.readdir(this.knowledgePath)
      const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

      // プレフィックスに一致するファイルをフィルタリング
      const matchingFiles = mdFiles.filter((file) => {
        const id = file.replace('.md', '')
        return id.startsWith(prefix)
      })

      // 最大k個までのファイルを処理
      const selectedFiles = matchingFiles.slice(0, Math.min(k, matchingFiles.length))

      const results: Array<{
        pageContent: string
        id: string
        _similarity: number
        _importance: number
        created_at: number
      }> = []

      for (const file of selectedFiles) {
        try {
          const filePath = join(this.knowledgePath, file)
          const entry = await this.readMarkdownFile(filePath)
          results.push({
            pageContent: entry.content,
            id: entry.id,
            _similarity: 1, // プレフィックス検索では類似度は常に1とする
            _importance: entry.importance || 0,
            created_at: entry.created_at || 0
          })
        } catch (error) {
          console.error(`Error reading markdown file: ${file}`, error)
        }
      }

      // 作成日時の降順でソート
      results.sort((a, b) => b.created_at - a.created_at)

      return results
    } catch (error) {
      console.error('Error searching by prefix:', error)
      return []
    }
  }

  async getRandomEntries(
    count = 3,
    excludeIds: string[] = []
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
      const allFiles = await fs.readdir(this.knowledgePath)
      const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

      const excludeIdSet = new Set(excludeIds)
      const validFiles = mdFiles.filter((file) => {
        const id = file.replace('.md', '')
        return !excludeIdSet.has(id)
      })

      if (validFiles.length === 0) return []

      // Shuffle the array
      for (let i = validFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[validFiles[i], validFiles[j]] = [validFiles[j], validFiles[i]]
      }

      // Take the first 'count' files
      const selectedFiles = validFiles.slice(0, Math.min(count, validFiles.length))

      const results: Array<{
        pageContent: string
        id: string
        _similarity: number
        _importance: number
        created_at: number
      }> = []

      for (const file of selectedFiles) {
        try {
          const filePath = join(this.knowledgePath, file)
          const entry = await this.readMarkdownFile(filePath)
          results.push({
            pageContent: entry.content,
            id: entry.id,
            _similarity: 0, // Not relevant for random entries
            _importance: entry.importance || 0,
            created_at: entry.created_at || 0
          })
        } catch (error) {
          console.error(`Error reading markdown file: ${file}`, error)
        }
      }

      return results
    } catch (error) {
      console.error('Error getting random entries:', error)
      return []
    }
  }

  async getChronologicallyCloseEntries(
    referenceTimestamp: number,
    count = 3,
    excludeIds: string[] = [],
    timeWindow = 60 * 60 * 6 // 6 hours in seconds
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
      const allFiles = await fs.readdir(this.knowledgePath)
      const mdFiles = allFiles.filter((file) => file.endsWith('.md'))

      const excludeIdSet = new Set(excludeIds)
      const entries: Array<{
        id: string
        content: string
        created_at: number
        importance: number
        timeDiff: number
      }> = []

      for (const file of mdFiles) {
        const id = file.replace('.md', '')
        if (excludeIdSet.has(id)) continue

        try {
          const filePath = join(this.knowledgePath, file)
          const entry = await this.readMarkdownFile(filePath)

          // Calculate absolute time difference
          const timeDiff = Math.abs(entry.created_at - referenceTimestamp)

          // Only consider entries within the time window
          if (timeDiff <= timeWindow) {
            entries.push({
              id: entry.id,
              content: entry.content,
              created_at: entry.created_at,
              importance: entry.importance || 0,
              timeDiff
            })
          }
        } catch (error) {
          console.error(`Error reading markdown file: ${file}`, error)
        }
      }

      // Sort by closest in time (smallest timeDiff first)
      entries.sort((a, b) => a.timeDiff - b.timeDiff)

      // Take the top entries
      const closestEntries = entries.slice(0, Math.min(count, entries.length))

      return closestEntries.map((entry) => ({
        pageContent: entry.content,
        id: entry.id,
        _similarity: 0, // Not relevant for chronological entries
        _importance: entry.importance,
        created_at: entry.created_at
      }))
    } catch (error) {
      console.error('Error getting chronologically close entries:', error)
      return []
    }
  }

  async increaseImportance(id: string, amount = 1): Promise<boolean> {
    try {
      const filePath = join(this.knowledgePath, `${id}.md`)

      try {
        const entry = await this.readMarkdownFile(filePath)
        if (entry.importance && entry.importance > 100) {
          return false
        }
        entry.importance = (entry.importance || 0) + amount
        return true
      } catch {
        return false
      }
    } catch {
      return false
    }
  }

  // Get a knowledge entry by ID
  async getEntryById(id: string): Promise<KnowledgeEntry | null> {
    try {
      const filePath = join(this.knowledgePath, `${id}.md`)
      return await this.readMarkdownFile(filePath)
    } catch (error) {
      console.error(`Error reading knowledge entry with ID ${id}:`, error)
      return null
    }
  }

  // Update an existing knowledge entry
  async updateEntry(entry: KnowledgeEntry): Promise<boolean> {
    try {
      // Make sure the entry exists first
      const filePath = join(this.knowledgePath, `${entry.id}.md`)
      await fs.access(filePath)

      // Write the updated entry
      await this.writeMarkdownFile(entry)
      return true
    } catch (error) {
      console.error(`Error updating knowledge entry with ID ${entry.id}:`, error)
      return false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close(): void {}

  // Add a knowledge entry with full metadata
  async addKnowledgeEntry(entry: KnowledgeEntry): Promise<boolean> {
    try {
      await this.writeMarkdownFile(entry)

      // Add to vector store for search
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      })

      const chunks = await splitter.splitText(entry.content)
      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j]
        const chunkId = `${entry.id}_chunk_${j}`

        try {
          const embedding = await this.embeddings.embedQuery(chunk)
          const indexId = this.nextId++
          this.index.addPoint(embedding, indexId)
          this.idToDocId.set(indexId, chunkId)
          this.docIdToId.set(chunkId, indexId)
        } catch (error) {
          console.error('Chunk insertion error:', error)
        }
      }

      await this.saveIndex()
      return true
    } catch (error) {
      console.error(`Error adding knowledge entry with ID ${entry.id}:`, error)
      return false
    }
  }
}
