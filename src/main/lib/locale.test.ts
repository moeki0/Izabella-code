import { describe, expect, it } from 'vitest'
import { locale } from './locale'

describe('locale', () => {
  it('日本語と英語のロケールデータが存在すること', () => {
    expect(locale.ja).toBeDefined()
    expect(locale.en).toBeDefined()
  })

  it('日本語ロケールに必要なキーがすべて含まれていること', () => {
    const requiredKeys = [
      'app',
      'about',
      'setting',
      'services',
      'hide',
      'hideOthers',
      'quit',
      'file',
      'openDir',
      'new',
      'duplicate',
      'search',
      'searchFullText',
      'close',
      'edit',
      'cut',
      'copy',
      'paste',
      'pasteAndMatchStyle',
      'delete',
      'selectAll',
      'speak',
      'startSpeaking',
      'stopSpeaking',
      'view',
      'sidebar',
      'zoomIn',
      'zoomOut',
      'toggleDevTools',
      'resetZoom',
      'togglefullscreen',
      'window',
      'minimize',
      'zoom',
      'front',
      'help',
      'github',
      'openInDefaultApp',
      'revealInFinder',
      'copyPath',
      'copyPrompt',
      'backLink',
      'copyAll'
    ]

    requiredKeys.forEach((key) => {
      expect(locale.ja[key]).toBeDefined()
      expect(typeof locale.ja[key]).toBe('string')
    })
  })

  it('英語ロケールに必要なキーがすべて含まれていること', () => {
    const requiredKeys = [
      'app',
      'about',
      'setting',
      'services',
      'hide',
      'hideOthers',
      'quit',
      'file',
      'openDir',
      'new',
      'duplicate',
      'search',
      'searchFullText',
      'close',
      'edit',
      'cut',
      'copy',
      'paste',
      'pasteAndMatchStyle',
      'delete',
      'selectAll',
      'speak',
      'startSpeaking',
      'stopSpeaking',
      'view',
      'sidebar',
      'zoomIn',
      'zoomOut',
      'toggleDevTools',
      'resetZoom',
      'togglefullscreen',
      'window',
      'minimize',
      'zoom',
      'front',
      'help',
      'github',
      'openInDefaultApp',
      'revealInFinder',
      'copyPath',
      'copyPrompt',
      'backLink',
      'copyAll'
    ]

    requiredKeys.forEach((key) => {
      expect(locale.en[key]).toBeDefined()
      expect(typeof locale.en[key]).toBe('string')
    })
  })

  it('日本語と英語のロケールに同じキーセットが含まれていること', () => {
    const jaKeys = Object.keys(locale.ja).sort()
    const enKeys = Object.keys(locale.en).sort()

    expect(jaKeys).toEqual(enKeys)
  })

  it('特定のキーが適切に翻訳されていることを確認', () => {
    // 日本語
    expect(locale.ja.app).toBe('Izabella')
    expect(locale.ja.file).toBe('ファイル')
    expect(locale.ja.edit).toBe('編集')
    expect(locale.ja.view).toBe('表示')
    expect(locale.ja.help).toBe('ヘルプ')

    // 英語
    expect(locale.en.app).toBe('Izabella')
    expect(locale.en.file).toBe('File')
    expect(locale.en.edit).toBe('Edit')
    expect(locale.en.view).toBe('View')
    expect(locale.en.help).toBe('Help')
  })
})
