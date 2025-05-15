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
  let contentToUse = message.content || ''
  if (message.metadata) {
    let content = contentToUse
    try {
      const parsed = JSON.parse(contentToUse)
      if (parsed.content) {
        content = parsed.content
      }
    } catch {
      // Content is not JSON, use as is
    }
    const metadata = JSON.parse(message.metadata)
    const combinedObj = {
      content: content,
      metadata: metadata
    }

    contentToUse = JSON.stringify(combinedObj)
  }

  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: contentToUse
  }
}
