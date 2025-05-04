import { describe, expect, it, vi, beforeAll } from 'vitest'

// モックオブジェクト
const mockStore = {
  get: vi.fn(),
  set: vi.fn()
}

// electron-storeをモック
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => mockStore)
}))

describe('store', () => {
  beforeAll(() => {
    // ESM モジュールのキャッシュをクリア
    vi.resetModules()
  })

  it('store インスタンスが正しく初期化されること', async () => {
    // store.tsをインポート
    const { store } = await import('./store')

    // Store コンストラクタが呼ばれたことを確認
    const Store = (await import('electron-store')).default
    expect(Store).toHaveBeenCalledTimes(1)

    // storeが期待通りのインスタンスであることを確認
    expect(store).toBeDefined()
    expect(store).toBe(mockStore)
  })

  it('store が期待される関数を持つこと', async () => {
    const { store } = await import('./store')

    // 型チェック - 実際のオブジェクトの構造が期待通りか
    expect(store).toEqual(
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function)
      })
    )
  })
})
