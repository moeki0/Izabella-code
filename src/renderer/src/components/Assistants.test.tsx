import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Assistants } from './Assistants'

// window.apiをモック
const mockGetConfig = vi.fn()
const mockSetConfig = vi.fn()

describe('Assistants', () => {
  // 各テスト前にモックをリセット
  beforeEach(() => {
    vi.resetAllMocks()

    // window.apiのモックを設定
    window.api = {
      getConfig: mockGetConfig,
      setConfig: mockSetConfig
    } as unknown

    // デフォルトの値を設定
    mockGetConfig.mockImplementation((key) => {
      if (key === 'assistants') {
        return Promise.resolve([
          { name: 'Assistant 1', instructions: 'Instructions 1' },
          { name: 'Assistant 2', instructions: 'Instructions 2' }
        ])
      }
      if (key === 'assistant') {
        return Promise.resolve('Assistant 1')
      }
      return Promise.resolve(null)
    })
  })

  it('初期化時にアシスタント一覧と現在のアシスタントを取得すること', async () => {
    render(<Assistants />)

    // APIが呼ばれたことを確認
    expect(mockGetConfig).toHaveBeenCalledWith('assistants')
    expect(mockGetConfig).toHaveBeenCalledWith('assistant')

    // UIに表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument()
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
      expect(screen.getByText('Assistant 2')).toBeInTheDocument()
    })

    // 現在選択されているアシスタントに適切なクラスが設定されていることを確認
    const assistant1Element = screen.getByText('Assistant 1')
    expect(assistant1Element.className).toContain('assistants-list-item-current')
  })

  it('アシスタントをクリックすると選択が切り替わること', async () => {
    render(<Assistants />)

    // Assistant 2をクリック
    await waitFor(() => {
      expect(screen.getByText('Assistant 2')).toBeInTheDocument()
    })

    const assistant2Element = screen.getByText('Assistant 2')
    await userEvent.click(assistant2Element)

    // 設定が更新されたことを確認
    expect(mockSetConfig).toHaveBeenCalledWith('assistant', 'Assistant 2')

    // クラスが更新されるためにステートが変更されたことを確認
    await waitFor(() => {
      expect(assistant2Element.className).toContain('assistants-list-item-current')
    })
  })

  it('デフォルトアシスタントをクリックすると選択が切り替わること', async () => {
    render(<Assistants />)

    // Defaultをクリック
    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument()
    })

    const defaultElement = screen.getByText('Default')
    await userEvent.click(defaultElement)

    // 設定が更新されたことを確認
    expect(mockSetConfig).toHaveBeenCalledWith('assistant', 'default')

    // クラスが更新されるためにステートが変更されたことを確認
    await waitFor(() => {
      expect(defaultElement.className).toContain('assistants-list-item-current')
    })
  })

  it('アシスタントがない場合にデフォルトのみが表示されること', async () => {
    // アシスタントが空の配列を返すようにモックを変更
    mockGetConfig.mockImplementation((key) => {
      if (key === 'assistants') {
        return Promise.resolve([])
      }
      if (key === 'assistant') {
        return Promise.resolve('default')
      }
      return Promise.resolve(null)
    })

    render(<Assistants />)

    // デフォルトのみが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument()
      expect(screen.queryByText('Assistant 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Assistant 2')).not.toBeInTheDocument()
    })

    // デフォルトが選択されていることを確認
    const defaultElement = screen.getByText('Default')
    expect(defaultElement.className).toContain('assistants-list-item-current')
  })
})
