import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/core/storage/libsql'
import { LibSQLVector } from '@mastra/core/vector/libsql'
import { join } from 'node:path'
import { app } from 'electron'
import { TokenLimiter } from '@mastra/memory/processors'
import { store } from './store'

export const memory = new Memory({
  storage: new LibSQLStore({
    config: {
      url: `file:${join(app.getPath('userData'), 'memory.db')}`
    }
  }),
  vector: new LibSQLVector({
    connectionUrl: `file:${join(app.getPath('userData'), 'memory.db')}`
  }),
  processors: [new TokenLimiter((store.get('tokenLimit') as number) || 127000)],
  options: {
    workingMemory: {
      enabled: true,
      use: 'tool-call'
    }
  }
})
