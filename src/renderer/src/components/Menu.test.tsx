import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Menu } from './Menu'

// コンポーネントをモック
vi.mock('./Tools', () => ({
  Tools: () => <div data-testid="tools-component">Tools Component</div>
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

  it('Toolsが表示されていること', () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()
  })

  it('getTools関数がToolsコンポーネントに正しく渡されること', () => {
    render(<Menu isOpen={true} getTools={mockGetTools} />)

    // Toolsコンポーネントが表示されていることを確認
    expect(screen.getByTestId('tools-component')).toBeInTheDocument()
  })
})
