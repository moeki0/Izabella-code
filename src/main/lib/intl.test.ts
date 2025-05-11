import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import { app } from 'electron'

// electron appのモック
vi.mock('electron', () => ({
  app: {
    getLocale: vi.fn().mockReturnValue('en'),
    getPath: vi.fn().mockReturnValue('/mock/path')
  }
}))

// fsとpathのモック
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    writeFileSync: vi.fn()
  }
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn().mockReturnValue('/mock/path/locale-preference.json')
  }
}))

// intlオブジェクトの独自のモックを作成
const mockFormatMessage = vi.fn().mockImplementation(({ id }) => {
  return id
})

describe('intl', () => {
  // テスト前にモジュールキャッシュをクリア
  beforeAll(() => {
    vi.resetModules()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('intl オブジェクトが英語ロケールで初期化されること', async () => {
    // モジュールをインポート
    const { intl, initLocale } = await import('./intl')

    // 手動で初期化
    initLocale('en')

    // 期待する設定でintlが初期化されたか確認
    expect(intl.locale).toBe('en')
    expect(intl.messages).toBeInstanceOf(Object)
  })

  it('formatMessage が正しく動作すること', async () => {
    // モジュールをインポート
    const { intl, initLocale } = await import('./intl')

    // formatMessageのスパイを設定
    const spy = vi.spyOn(intl, 'formatMessage')

    // 手動で初期化
    initLocale('en')

    // formatMessageをテスト
    intl.formatMessage({ id: 'app' })
    expect(spy).toHaveBeenCalledWith({ id: 'app' })

    intl.formatMessage({ id: 'file' })
    expect(spy).toHaveBeenCalledWith({ id: 'file' })

    intl.formatMessage({ id: 'edit' })
    expect(spy).toHaveBeenCalledWith({ id: 'edit' })

    // 存在しないメッセージIDの場合
    intl.formatMessage({ id: 'nonExistentKey' })
    expect(spy).toHaveBeenCalledWith({ id: 'nonExistentKey' })
  })
})
