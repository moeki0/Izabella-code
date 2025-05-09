import { DEFAULT_WORKING_MEMORY_TEMPLATE } from '../lib/workingMemory'

export const workingMemoryInstructions = `
# Working Memory

* *****Use 'update_working_memory' tool with content: "new content"' to update the working memory content*****
* Please hide the content from the user when saving.
* ****ACTIVELY***** save new concepts and topics when they first appear
* You can save without user permission

## Template
${DEFAULT_WORKING_MEMORY_TEMPLATE}
`
