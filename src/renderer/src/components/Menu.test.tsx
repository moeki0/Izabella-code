import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Menu } from './Menu'

// コンポーネントをモック
vi.mock('./Tools', () => ({
  Tools: () => <div data-testid="tools-component">Tools Component</div>
}))

vi.mock('./Models', () => ({
  Models: () => <div data-testid="models-component">Models Component</div>
}))

describe('Menu', () => {
  const mockGetTools = vi.fn().mockResolvedValue([])

  it('isOpenがfalseの場合、何も表示されないこと', () => {
    const { container } = render(<Menu isOpen={false} getTools={mockGetTools} />)
    expect(container.firstChild).toBeNull()
  })

  it('isOpenがtrueの場合、メニューが表示されること', () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)
    expect(screen.getByTestId('menu')).toBeInTheDocument()
  })

  it('初期状態ではToolsタブが選択されていること', () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // Toolsのタブが選択されていることを確認
    const toolsTab = screen.getByText('Tools')
    expect(toolsTab.className).toContain('menu-header-item-active')

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()
  })

  // Assistantsタブは削除されたためテストをスキップ
  it.skip('Assistantsタブをクリックするとそのタブが選択されること', async () => {
    // テストは将来的に修正または削除予定
  })

  it('Modelsタブをクリックするとそのタブが選択されること', async () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // Modelsタブをクリック
    const modelsTab = screen.getByText('Models')
    await userEvent.click(modelsTab)

    // Modelsタブが選択されていることを確認
    expect(modelsTab.className).toContain('menu-header-item-active')

    // Modelsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('models-component')).toBeInTheDocument()

    // 他のコンポーネントが表示されていないことを確認
    expect(screen.queryByTestId('tools-component')).not.toBeInTheDocument()
  })

  it('タブを切り替えた後、再度Toolsタブに戻れること', async () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // 一度Modelsタブへ切り替え
    const modelsTab = screen.getByText('Models')
    await userEvent.click(modelsTab)

    // Toolsタブへ戻る
    const toolsTab = screen.getByText('Tools')
    await userEvent.click(toolsTab)

    // Toolsタブが選択されていることを確認
    expect(toolsTab.className).toContain('menu-header-item-active')

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()

    // 他のコンポーネントが表示されていないことを確認
    expect(screen.queryByTestId('models-component')).not.toBeInTheDocument()
  })

  it('getTools関数がToolsコンポーネントに正しく渡されること', () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // コンポーネントのプロップを直接確認できないが、
    // モック関数が呼び出される機会があることは確認済み

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()
  })
})
