const JSON_BLOCK_PATTERNS = [
  /```json[\s\S]*?```/g,
  /<conversation_metadata>[\s\S]*?<\/conversation_metadata>/g,
  /\{[\s\S]*?"theme"[\s\S]*?\}/g,
  /\{[\s\S]*?"metadata"[\s\S]*?\}/g
]

export function cleanContentForDisplay(content: string): string {
  if (!content) return ''

  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const jsonObj = JSON.parse(content.trim())

      if (jsonObj.content) {
        return jsonObj.content
      }
    } catch {
      // JSONパースに失敗した場合は通常の処理を続行
    }
  }

  let cleanedContent = content
  JSON_BLOCK_PATTERNS.forEach((pattern) => {
    cleanedContent = cleanedContent.replaceAll(pattern, '')
  })
  cleanedContent = cleanedContent.replaceAll(/\n{2,}/g, '\n')
  cleanedContent = cleanedContent.trim()
  if (cleanedContent.length === 0) {
    return content
  }
  return cleanedContent
}

export function isJsonContent(content: string): boolean {
  if (!content) return false
  const trimmedContent = content.trim()
  if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
    try {
      JSON.parse(trimmedContent)
      return true
    } catch {
      return false
    }
  }

  return false
}
