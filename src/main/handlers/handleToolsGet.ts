import { tools } from '../lib/llm'

export const handleToolsGet = (): Array<{
  name: string
  description: string
}> => {
  return Object.keys(tools).map((name) => ({
    name,
    description: tools[name].description
  }))
}
