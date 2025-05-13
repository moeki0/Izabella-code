import { tools } from '../lib/llm'
import { store } from '../lib/store'
import log from 'electron-log/main'

export const handleToolsGet = (): Array<{
  name: string
  description: string
}> => {
  const enabledTools = store.get('enabledTools') as string[] | undefined

  const toolsList = Object.keys(tools).map((name) => ({
    name,
    description: tools[name].description
  }))

  log.info(`Available tools: ${toolsList.map((t) => t.name).join(', ')}`)
  log.info(`Enabled tools: ${enabledTools ? enabledTools.join(', ') : 'none'}`)

  return toolsList
}
