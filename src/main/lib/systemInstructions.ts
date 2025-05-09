import { readWorkingMemory } from './workingMemory'

export const systemInstructions = async (): Promise<string> => {
  const workingMemoryContent = await readWorkingMemory()
  return `
# Working Memory
${workingMemoryContent}
`
}
