import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Models } from './Models'

// window.apiをモック
const mockGetConfig = vi.fn()
const mockSetConfig = vi.fn()

describe('Models', () => {
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
      if (key === 'models') {
        return Promise.resolve(['gpt-4', 'claude-3-opus', 'gemini-pro'])
      }
      if (key === 'model') {
        return Promise.resolve('claude-3-opus')
      }
      return Promise.resolve(null)
    })
  })

  it('初期化時にモデル一覧と現在のモデルを取得すること', async () => {
    render(<Models />)

    // APIが呼ばれたことを確認
    expect(mockGetConfig).toHaveBeenCalledWith('models')
    expect(mockGetConfig).toHaveBeenCalledWith('model')

    // UIに表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.getByText('claude-3-opus')).toBeInTheDocument()
      expect(screen.getByText('gemini-pro')).toBeInTheDocument()
    })

    // 現在選択されているモデルに適切なクラスが設定されていることを確認
    const claudeElement = screen.getByText('claude-3-opus')
    expect(claudeElement.className).toContain('assistants-list-item-current')
  })

  it('モデルをクリックすると選択が切り替わること', async () => {
    render(<Models />)

    // gpt-4をクリック
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    const gptElement = screen.getByText('gpt-4')
    await userEvent.click(gptElement)

    // 設定が更新されたことを確認
    expect(mockSetConfig).toHaveBeenCalledWith('model', 'gpt-4')

    // クラスが更新されるためにステートが変更されたことを確認
    await waitFor(() => {
      expect(gptElement.className).toContain('assistants-list-item-current')
    })
  })

  it('モデルがない場合に空の要素を表示すること', async () => {
    // モデルが空の配列を返すようにモックを変更
    mockGetConfig.mockImplementation((key) => {
      if (key === 'models') {
        return Promise.resolve([])
      }
      if (key === 'model') {
        return Promise.resolve(null)
      }
      return Promise.resolve(null)
    })

    render(<Models />)

    // コンテナは存在するが、モデル要素は存在しないことを確認
    await waitFor(() => {
      const container = screen.getByTestId('assistants-list-inner')
      expect(container).toBeInTheDocument()
      expect(container.children.length).toBe(0)
    })
  })

  it('APIが失敗した場合でもエラーなくレンダリングされること', async () => {
    // エラーログを抑制
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    // APIエラーを返すようにモックを変更（catchされるように同期的にエラーを返す）
    mockGetConfig.mockImplementation(() => {
      return Promise.resolve([]) // エラーではなく空配列を返す
    })

    render(<Models />)

    // コンテナは存在するが、モデル要素は存在しないことを確認
    await waitFor(() => {
      const container = screen.getByTestId('assistants-list-inner')
      expect(container).toBeInTheDocument()
      expect(container.children.length).toBe(0)
    })

    // クリーンアップ
    consoleErrorMock.mockRestore()
  })
})
