import { describe, expect, it, vi, beforeAll } from 'vitest'
import { locale } from './locale'

// モック関数の定義
const mockFormatMessage = vi.fn().mockImplementation(({ id }) => {
  return locale.en[id] || id
})

// @formatjs/intl をモック
vi.mock('@formatjs/intl', () => ({
  createIntl: vi.fn().mockImplementation((config) => ({
    locale: config.locale,
    messages: config.messages,
    formatMessage: mockFormatMessage
  })),
  createIntlCache: vi.fn().mockReturnValue({})
}))

describe('intl', () => {
  // テスト前にモジュールキャッシュをクリア
  beforeAll(() => {
    vi.resetModules()
  })

  it('intl オブジェクトが英語ロケールで初期化されること', async () => {
    // モジュールをインポート
    const { intl } = await import('./intl')

    // 期待する設定でintlが初期化されたか確認
    expect(intl.locale).toBe('en')
    expect(intl.messages).toEqual(locale.en)
  })

  it('formatMessage が正しく動作すること', async () => {
    // モジュールをインポート
    const { intl } = await import('./intl')

    // 存在するメッセージIDの場合
    intl.formatMessage({ id: 'app' })
    expect(mockFormatMessage).toHaveBeenCalledWith({ id: 'app' })

    intl.formatMessage({ id: 'file' })
    expect(mockFormatMessage).toHaveBeenCalledWith({ id: 'file' })

    intl.formatMessage({ id: 'edit' })
    expect(mockFormatMessage).toHaveBeenCalledWith({ id: 'edit' })

    // 存在しないメッセージIDの場合
    intl.formatMessage({ id: 'nonExistentKey' })
    expect(mockFormatMessage).toHaveBeenCalledWith({ id: 'nonExistentKey' })
  })
})
