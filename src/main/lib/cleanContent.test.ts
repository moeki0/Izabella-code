import { describe, expect, it } from 'vitest'
import { cleanContentForDisplay, isJsonContent } from './cleanContent'

describe('cleanContentForDisplay', () => {
  it('空文字列の場合、空文字列を返すこと', () => {
    expect(cleanContentForDisplay('')).toBe('')
    expect(cleanContentForDisplay(null as unknown as string)).toBe('')
    expect(cleanContentForDisplay(undefined as unknown as string)).toBe('')
  })

  it('contentプロパティを持つJSONオブジェクトの場合、contentの値を返すこと', () => {
    const jsonContent = JSON.stringify({ content: 'This is the content' })
    expect(cleanContentForDisplay(jsonContent)).toBe('This is the content')
  })

  it('JSONパースに失敗した場合は通常の処理を続行すること', () => {
    const invalidJson = '{ "content": "This is broken JSON'
    expect(cleanContentForDisplay(invalidJson)).toBe(invalidJson)
  })

  it('JSONブロックパターンを削除すること', () => {
    const content = 'Start\n```json\n{"key": "value"}\n```\nEnd'
    expect(cleanContentForDisplay(content)).toBe('Start\nEnd')
  })

  it('conversation_metadataタグを削除すること', () => {
    const content = 'Start\n<conversation_metadata>{"theme": "dark"}</conversation_metadata>\nEnd'
    expect(cleanContentForDisplay(content)).toBe('Start\nEnd')
  })

  it('themeを含むJSONオブジェクトを削除すること', () => {
    const content = 'Start\n{"theme": "dark", "mode": "auto"}\nEnd'
    expect(cleanContentForDisplay(content)).toBe('Start\nEnd')
  })

  it('metadataを含むJSONオブジェクトを削除した結果を返すこと', () => {
    const content = 'Start\n{"metadata": {"source": "chat"}}\nEnd'
    expect(cleanContentForDisplay(content)).toBe('Start\n}\nEnd')
  })

  it('3つ以上の連続した改行を1つの改行に置き換えること', () => {
    const content = 'Line 1\n\n\n\nLine 2'
    expect(cleanContentForDisplay(content)).toBe('Line 1\nLine 2')
  })

  it('クリーンアップ後のコンテンツが空になった場合、元のコンテンツを返すこと', () => {
    const content = '```json\n{"key": "value"}\n```'
    expect(cleanContentForDisplay(content)).toBe(content)
  })

  it('複数のJSONブロックパターンを削除すること', () => {
    const content = 'Start\n```json\n{"key": "value"}\n```\nMiddle\n{"theme": "dark"}\nEnd'
    expect(cleanContentForDisplay(content)).toBe('Start\nMiddle\nEnd')
  })
})

describe('isJsonContent', () => {
  it('null、undefined、空文字列の場合はfalseを返すこと', () => {
    expect(isJsonContent('')).toBe(false)
    expect(isJsonContent(null as unknown as string)).toBe(false)
    expect(isJsonContent(undefined as unknown as string)).toBe(false)
  })

  it('有効なJSONの場合はtrueを返すこと', () => {
    expect(isJsonContent('{"key": "value"}')).toBe(true)
    expect(isJsonContent('{"content": "text", "metadata": {}}')).toBe(true)
  })

  it('JSONのような形式だがパースに失敗する場合はfalseを返すこと', () => {
    expect(isJsonContent('{"key": value}')).toBe(false)
    expect(isJsonContent('{broken json}')).toBe(false)
  })

  it('JSONのような形式でない場合はfalseを返すこと', () => {
    expect(isJsonContent('plain text')).toBe(false)
    expect(isJsonContent('not json { at all }')).toBe(false)
  })
})
