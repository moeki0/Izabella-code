import { describe, expect, it, vi } from 'vitest'
import { handleMessageContextMenu } from './handleMessageContextMenu'
import { clipboard, Menu } from 'electron'

// モックの設定
vi.mock('electron', () => ({
  clipboard: {
    writeText: vi.fn()
  },
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({
      popup: vi.fn()
    })
  }
}))

vi.mock('../lib/intl', () => ({
  intl: {
    formatMessage: ({ id }) => (id === 'copyAll' ? 'Copy All' : id)
  }
}))

vi.mock('..', () => ({
  mainWindow: {}
}))

describe('handleMessageContextMenu', () => {
  it('コンテキストメニューが正しく構築され、表示されること', () => {
    const mockText = 'メッセージテキスト'

    handleMessageContextMenu(null, mockText)

    // Menuが正しいテンプレートで構築されたか確認
    expect(Menu.buildFromTemplate).toHaveBeenCalled()
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    expect(templateArg).toHaveLength(1)
    expect(templateArg[0].label).toBe('Copy All')

    // popupが呼び出されたか確認
    const menu = Menu.buildFromTemplate.mock.results[0].value
    expect(menu.popup).toHaveBeenCalled()
  })

  it('クリップボードに正しいテキストがコピーされること', () => {
    const mockText = 'メッセージテキスト'

    handleMessageContextMenu(null, mockText)

    // コピー機能のテスト
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    const copyFunction = templateArg[0].click

    // クリック関数を実行
    copyFunction()

    // clipboard.writeTextが正しいテキストで呼ばれたか確認
    expect(clipboard.writeText).toHaveBeenCalledWith(mockText)
  })
})
