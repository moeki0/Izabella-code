import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'fs'

const WORKING_MEMORY_PATH = join(app.getPath('userData'), 'working-memory.md')

export const DEFAULT_WORKING_MEMORY_TEMPLATE = `
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

# Knowledge Index:
- This section contains summaries and search hints for information stored in the knowledge base.
- Example: Detailed engineering guidelines are stored in the knowledge base. (File path: /docs/engineering/guidelines.md)
- Example: Project overview, team roles, and technical architecture information are stored in the knowledge base.
- Example: Application features (alpha version, modeless design, long-term memory) information is in working memory.
`

export const ensureWorkingMemoryExists = async (): Promise<void> => {
  try {
    await fs.access(WORKING_MEMORY_PATH)
  } catch {
    await fs.writeFile(WORKING_MEMORY_PATH, DEFAULT_WORKING_MEMORY_TEMPLATE)
  }
}

export const readWorkingMemory = async (): Promise<string> => {
  await ensureWorkingMemoryExists()
  return await fs.readFile(WORKING_MEMORY_PATH, 'utf-8')
}

export const updateWorkingMemory = async (content: string): Promise<void> => {
  await fs.writeFile(WORKING_MEMORY_PATH, content)
}
