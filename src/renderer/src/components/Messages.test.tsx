import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Messages from './Messages'

describe('Messages', () => {
  const mockMessages = [
    {
      role: 'user' as const,
      content: 'Hello'
    },
    {
      role: 'assistant' as const,
      content: 'Hi there!'
    },
    {
      role: 'tool' as const,
      tool_name: 'Test Tool',
      tool_req: '{"test": "request"}',
      tool_res: '{"test": "response"}',
      open: false
    }
  ]

  const defaultProps = {
    messages: mockMessages,
    showMessageContextMenu: vi.fn(),
    loading: false,
    handleToolClick: vi.fn(),
    onScroll: vi.fn()
  }

  it('ユーザーメッセージが表示されること', () => {
    render(<Messages {...defaultProps} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('アシスタントメッセージが表示されること', () => {
    render(<Messages {...defaultProps} />)
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('ツールメッセージが表示されること', () => {
    render(<Messages {...defaultProps} />)
    expect(screen.getByText('Test Tool')).toBeInTheDocument()
  })

  it('ローディング表示が動作すること', () => {
    render(<Messages {...defaultProps} loading={true} />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('メッセージを右クリックするとコンテキストメニューが表示されること', () => {
    render(<Messages {...defaultProps} />)

    const message = screen.getByText('Hello')
    fireEvent.contextMenu(message)

    expect(defaultProps.showMessageContextMenu).toHaveBeenCalledWith('Hello')
  })

  it('ツールのトグルボタンをクリックするとhandleToolClickが呼ばれること', () => {
    render(<Messages {...defaultProps} />)

    const toolButton = screen.getByRole('button')
    fireEvent.click(toolButton)

    expect(defaultProps.handleToolClick).toHaveBeenCalledWith(2)
  })
})
