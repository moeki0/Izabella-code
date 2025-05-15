export interface MessageType {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const formatMessageForLLM = (message: {
  role: string
  content?: string
  tool_name?: string
  tool_req?: string
  tool_res?: string
  metadata?: string
}): MessageType | null => {
  if (message.role === 'tool') {
    return null
  }
  const contentToUse = message.content || ''

  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: contentToUse
  }
}
