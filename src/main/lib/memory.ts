import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/core/storage/libsql'
import { LibSQLVector } from '@mastra/core/vector/libsql'
import { join } from 'node:path'
import { app } from 'electron'
import { TokenLimiter } from '@mastra/memory/processors'

export const memory = new Memory({
  storage: new LibSQLStore({
    config: {
      url: `file:${join(app.getPath('userData'), 'memory.db')}`
    }
  }),
  vector: new LibSQLVector({
    connectionUrl: `file:${join(app.getPath('userData'), 'memory.db')}`
  }),
  processors: [new TokenLimiter(127000)],
  options: {
    workingMemory: {
      enabled: true,
      use: 'tool-call',
      template: `
# User Information
- **Environment**: Local ChatZen instance
- **Working Memory Status**: ON
- **Name**: [name]
- [Other user information]

# Active Project Context: [Current active project name]
- **Purpose**: [Project purpose summary]
- **Current Status**: [Current phase and major progress]
- **Key Decisions**: [Recent important decisions]
- **Main References**: [List of related file paths or URLs]
- [Other important summaries related to active project]

# Other Project Contexts:
- **[Other project name]**: [Brief overview or summary of potentially related information]
- **[Another project name]**: [Brief overview or summary of potentially related information]
- ...

# Tasks:
- [List of main tasks being worked on - short-term tasks managed in knowledge base, summaries recorded here]

# Decisions:
- [Cross-project important decisions or decisions difficult to include in other Working Memory sections]

# Locations:
- [List of file paths or URLs frequently referenced in conversations]

# Concepts:
- [Definitions of concepts or terms that frequently appear or are important in conversations]

# People:
- [People relevant to conversations and their roles]

# Events:
- [Important meetings and events]

# Other:
- [Other important information not classified above]
`
    }
  }
})
