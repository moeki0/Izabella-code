import { describe, expect, it, vi } from 'vitest'
import { handleThreadContextMenu } from './handleThreadContextMenu'
import { Menu } from 'electron'
import { handleThreadDelete } from './handleThreadDelete'

// モックの設定
vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({
      popup: vi.fn()
    })
  }
}))

vi.mock('../lib/intl', () => ({
  intl: {
    formatMessage: ({ id }) => (id === 'delete' ? 'Delete' : id)
  }
}))

vi.mock('./handleThreadDelete', () => ({
  handleThreadDelete: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('..', () => ({
  mainWindow: {
    webContents: {
      send: vi.fn()
    }
  }
}))

describe('handleThreadContextMenu', () => {
  it('コンテキストメニューが正しく構築され、表示されること', () => {
    const mockThreadId = 'thread-123'

    handleThreadContextMenu(null, mockThreadId)

    // Menuが正しいテンプレートで構築されたか確認
    expect(Menu.buildFromTemplate).toHaveBeenCalled()
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    expect(templateArg).toHaveLength(1)
    expect(templateArg[0].label).toBe('Delete')

    // popupが呼び出されたか確認
    const menu = Menu.buildFromTemplate.mock.results[0].value
    expect(menu.popup).toHaveBeenCalled()
    expect(menu.popup).toHaveBeenCalledWith({ window: expect.anything() })
  })

  it('削除ボタンがクリックされたとき、handleThreadDeleteを呼び出し、イベントを発行すること', async () => {
    const mockThreadId = 'thread-123'

    handleThreadContextMenu(null, mockThreadId)

    // 削除機能のテスト
    const templateArg = Menu.buildFromTemplate.mock.calls[0][0]
    const deleteFunction = templateArg[0].click

    // クリック関数を実行
    await deleteFunction()

    // handleThreadDeleteが正しいIDで呼び出されたか確認
    expect(handleThreadDelete).toHaveBeenCalledWith(mockThreadId)

    // webContents.sendが正しい引数で呼び出されたか確認
    const { mainWindow } = await import('..')
    expect(mainWindow.webContents.send).toHaveBeenCalledWith('delete-thread', mockThreadId)
  })
})
