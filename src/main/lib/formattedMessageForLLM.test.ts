import { describe, expect, it } from 'vitest'
import { formatMessageForLLM, MessageType } from './formattedMessageForLLM'

describe('formatMessageForLLM', () => {
  it('toolロールのメッセージはnullを返すこと', () => {
    const message = {
      role: 'tool',
      tool_name: 'test-tool',
      tool_req: '{"test": true}',
      tool_res: '{"result": "success"}'
    }

    const result = formatMessageForLLM(message)
    expect(result).toBeNull()
  })

  it('userロールのメッセージを正しくフォーマットすること', () => {
    const message = {
      role: 'user',
      content: 'Hello, world!'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'user',
      content: 'Hello, world!'
    }

    expect(result).toEqual(expected)
  })

  it('assistantロールのメッセージを正しくフォーマットすること', () => {
    const message = {
      role: 'assistant',
      content: 'Hi there!'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'assistant',
      content: 'Hi there!'
    }

    expect(result).toEqual(expected)
  })

  it('contentがundefinedの場合は空文字列を使用すること', () => {
    const message = {
      role: 'user'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'user',
      content: ''
    }

    expect(result).toEqual(expected)
  })

  it('metadataが存在する場合、contentとmetadataを正しく結合すること', () => {
    const message = {
      role: 'user',
      content: 'Hello',
      metadata: '{"language": "English", "source": "chat"}'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'user',
      content: JSON.stringify({
        content: 'Hello',
        metadata: {
          language: 'English',
          source: 'chat'
        }
      })
    }

    expect(result).toEqual(expected)
  })

  it('contentがJSON形式で、contentプロパティを持つ場合、そのcontentを使用すること', () => {
    const message = {
      role: 'assistant',
      content: '{"content": "Extracted content", "other": "value"}',
      metadata: '{"processed": true}'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'assistant',
      content: JSON.stringify({
        content: 'Extracted content',
        metadata: {
          processed: true
        }
      })
    }

    expect(result).toEqual(expected)
  })

  it('contentがJSON形式だがパースに失敗した場合は元のcontentを使用すること', () => {
    const message = {
      role: 'user',
      content: '{invalid json',
      metadata: '{"valid": true}'
    }

    const result = formatMessageForLLM(message)
    const expected: MessageType = {
      role: 'user',
      content: JSON.stringify({
        content: '{invalid json',
        metadata: {
          valid: true
        }
      })
    }

    expect(result).toEqual(expected)
  })
})
