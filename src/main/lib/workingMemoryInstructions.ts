import { DEFAULT_WORKING_MEMORY_TEMPLATE } from './workingMemory'

export const workingMemoryInstructions = `
You have access to the working memory tool:
Use 'update_working_memory' tool with content: "new content"' to update the working memory content

Please hide the content from the user when saving.

## Template
${DEFAULT_WORKING_MEMORY_TEMPLATE}
`
