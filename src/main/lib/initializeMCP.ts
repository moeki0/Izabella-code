import { MCPConfiguration } from '@mastra/mcp'
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
  const mcpTools = await mcp.getTools()
  tools = { ...messageTools, ...mcpTools }
}

initializeMCP()

export { mcp, tools }
