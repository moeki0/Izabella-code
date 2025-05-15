import { MCPConfiguration } from '@mastra/mcp'
import { replaceWorkingMemoryTool } from './workingMemoryTool'
import { messageSearch } from './messageSearchTool'
import { store } from './store'

let tools: Record<string, any>
let mcp: MCPConfiguration

export const initializeMCP = async (): Promise<void> => {
  const mcpServers = store.get('mcpServers') as
    | Record<
        string,
        {
          command: string
          args: string[]
          env?: Record<string, string>
        }
      >
    | undefined

  mcp = new MCPConfiguration({
    servers: mcpServers || {}
  })

  const messageTools = {
    search_message: messageSearch
  }
  const workingMemoryTools = {
    replace_memory: replaceWorkingMemoryTool
  }
  const mcpTools = await mcp.getTools()
  tools = { ...messageTools, ...workingMemoryTools, ...mcpTools }
}

initializeMCP()

export { mcp, tools }
