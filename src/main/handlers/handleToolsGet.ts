import { tools } from '../lib/llm'
import { store } from '../lib/store'
import { Assistant } from './handleSend'
import pickBy from 'lodash/pickBy'

export const handleToolsGet = (): Array<{ name: string; description: string }> => {
  const assistants = store.get('assistants') as Array<Assistant>
  const currentAssistantName = store.get('assistant')
  const assistant = assistants?.find((a) => a.name === currentAssistantName)

  if (!assistant || !assistant.tools) {
    return Object.keys(tools).map((name) => ({
      name,
      description: tools[name].description
    }))
  }

  const availableTools =
    assistant.tools.length > 0
      ? pickBy(tools, (_, key) => {
          return (
            assistant.tools.filter((tool) => {
              return key.match(new RegExp(tool))
            }).length > 0
          )
        })
      : tools
  return Object.keys(availableTools).map((name) => ({
    name,
    description: tools[name].description
  }))
}
