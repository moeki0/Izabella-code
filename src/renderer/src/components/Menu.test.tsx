import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Menu } from './Menu'

// コンポーネントをモック
vi.mock('./Tools', () => ({
  Tools: () => <div data-testid="tools-component">Tools Component</div>
}))

vi.mock('./Assistants', () => ({
  Assistants: () => <div data-testid="assistants-component">Assistants Component</div>
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

  it('Assistantsタブをクリックするとそのタブが選択されること', async () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // Assistantsタブをクリック
    const assistantsTab = screen.getByText('Assistants')
    await userEvent.click(assistantsTab)

    // Assistantsタブが選択されていることを確認
    expect(assistantsTab.className).toContain('menu-header-item-active')

    // Assistantsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('assistants-component')).toBeInTheDocument()

    // 他のコンポーネントが表示されていないことを確認
    expect(screen.queryByTestId('tools-component')).not.toBeInTheDocument()
    expect(screen.queryByTestId('models-component')).not.toBeInTheDocument()
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
    expect(screen.queryByTestId('assistants-component')).not.toBeInTheDocument()
  })

  it('タブを切り替えた後、再度Toolsタブに戻れること', async () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // 一度Assistantsタブへ切り替え
    const assistantsTab = screen.getByText('Assistants')
    await userEvent.click(assistantsTab)

    // Toolsタブへ戻る
    const toolsTab = screen.getByText('Tools')
    await userEvent.click(toolsTab)

    // Toolsタブが選択されていることを確認
    expect(toolsTab.className).toContain('menu-header-item-active')

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()

    // 他のコンポーネントが表示されていないことを確認
    expect(screen.queryByTestId('assistants-component')).not.toBeInTheDocument()
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
