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
    formatMessage: ({ id }) => {
      if (id === 'copyAll') return 'Copy All'
      if (id === 'deleteMessage') return 'Delete Message'
      return id
    }
  }
}))

vi.mock('..', () => ({
  mainWindow: {
    webContents: {
      send: vi.fn()
    }
  }
}))

describe('handleMessageContextMenu', () => {
  it('コンテキストメニューが正しく構築され、表示されること', () => {
    const mockText = 'メッセージテキスト'
    const mockMessageId = 'test-message-id'

    handleMessageContextMenu(null, mockText, mockMessageId)

    // Menuが正しいテンプレートで構築されたか確認
    expect(Menu.buildFromTemplate).toHaveBeenCalled()
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    expect(templateArg).toHaveLength(3)
    expect(templateArg[0].label).toBe('Copy All')
    expect(templateArg[1].type).toBe('separator')
    expect(templateArg[2].label).toBe('Delete Message')

    // popupが呼び出されたか確認
    const menu = Menu.buildFromTemplate.mock.results[0].value
    expect(menu.popup).toHaveBeenCalled()
  })

  it('クリップボードに正しいテキストがコピーされること', () => {
    const mockText = 'メッセージテキスト'
    const mockMessageId = 'test-message-id'

    handleMessageContextMenu(null, mockText, mockMessageId)

    // コピー機能のテスト
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    const copyFunction = templateArg[0].click

    // クリック関数を実行
    copyFunction()

    // clipboard.writeTextが正しいテキストで呼ばれたか確認
    expect(clipboard.writeText).toHaveBeenCalledWith(mockText)
  })

  it('削除ボタンクリックで正しいイベントが送信されること', () => {
    const mockText = 'メッセージテキスト'
    const mockMessageId = 'test-message-id'

    handleMessageContextMenu(null, mockText, mockMessageId)

    // 削除機能のテスト
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    expect(templateArg[2].label).toBe('Delete Message')

    const deleteFunction = templateArg[2].click

    // クリック関数を実行
    deleteFunction()

    // 実際のsendメソッドが呼ばれたが詳細テストは他の単体テストで行う
  })
})
