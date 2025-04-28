import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react'
import '@testing-library/jest-dom'
import Chat, { ChatProps } from './Chat'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'

vi.mock('@uiw/react-codemirror')

const mockDependencies = {
  init: vi.fn().mockResolvedValue({
    title: 'Test Chat',
    messages: [
      {
        role: 'tool',
        tool_name: 'Test tool',
        tool_req: '{"foo":"bar"}',
        open: true
      },
      {
        role: 'tool',
        tool_name: 'Another tool',
        tool_req: '{"foo2":"bar2"}',
        open: true
      }
    ]
  }),
  send: vi.fn(),
  getAssistants: vi.fn().mockResolvedValue([]),
  getTools: vi.fn().mockResolvedValue([]),
  link: vi.fn(),
  interrupt: vi.fn(),
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
  registerStreamListener: vi.fn().mockReturnValue(() => {}),
  registerToolCallListener: vi.fn().mockReturnValue(() => {}),
  registerStepFinishListener: vi.fn().mockReturnValue(() => {}),
  registerFinishListener: vi.fn().mockReturnValue(() => {}),
  registerErrorListener: vi.fn().mockImplementation((callback) => {
    callback('test error')
    return () => {}
  }),
  registerToolResultListener: vi.fn().mockReturnValue(() => {}),
  registerTitleListener: vi.fn().mockReturnValue(() => {}),
  registerNewThreadListener: vi.fn().mockReturnValue(() => {}),
  registerRetryListener: vi.fn().mockReturnValue(() => {}),
  showMessageContextMenu: vi.fn(),
  approveToolCall: vi.fn(),
  mermaidInit: vi.fn(),
  mermaidRun: vi.fn(),
  highlightAll: vi.fn()
}

const renderChat = (props: Partial<ChatProps> = {}): RenderResult => {
  return render(
    <MemoryRouter>
      <Chat {...{ ...mockDependencies, ...props }} />
    </MemoryRouter>
  )
}

describe('Chat', () => {
  test('初期状態では、ツールのローディング状態が表示される', () => {
    renderChat()
    expect(screen.getByText('Loading tools...')).toBeInTheDocument()
  })

  test('初期化後、チャットが表示される', async () => {
    renderChat()
    expect(mockDependencies.init).toHaveBeenCalledWith('test-uuid')
  })

  test('ツールを閉じられること', async () => {
    renderChat()
    await waitFor(() => expect(mockDependencies.init).toHaveBeenCalled())

    expect(screen.getByText('{"foo":"bar"}')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'close-tool-0' }))
    expect(screen.queryByText('{"foo":"bar"}')).toBeFalsy()
  })

  test('メッセージの送信が動作する', async () => {
    renderChat()
    await waitFor(() => expect(mockDependencies.init).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('ChatZen')
    fireEvent.change(input, { target: { value: 'Hello' } })

    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)

    expect(mockDependencies.send).toHaveBeenCalledWith('Hello', 'test-uuid', 'test-uuid', false)
  })

  test('エラーメッセージが表示される', () => {
    renderChat()
    expect(screen.getByText('test error')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('close-error'))

    expect(screen.queryByText('Test error')).toBeFalsy()
  })

  test('ツールパネルの表示切り替えが動作する', () => {
    renderChat()
    const toolsButton = screen.getByLabelText('menu')
    fireEvent.click(toolsButton)
    expect(screen.getByTestId('menu')).toBeInTheDocument()
  })

  test('中断ボタンが動作する', async () => {
    renderChat()
    await waitFor(() => expect(mockDependencies.init).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('ChatZen')
    fireEvent.change(input, { target: { value: 'Hello' } })

    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interrupt/i })
      expect(button).toBeInTheDocument()
      return button
    })

    const interruptButton = screen.getByRole('button', { name: /interrupt/i })
    fireEvent.click(interruptButton)

    expect(mockDependencies.interrupt).toHaveBeenCalled()
  })

  test('キーボードで送信する', async () => {
    renderChat()
    await waitFor(() => expect(mockDependencies.init).toHaveBeenCalled())

    const input = screen.getByPlaceholderText('ChatZen')
    fireEvent.change(input, { target: { value: 'Hello' } })
    await userEvent.type(input, '{meta>}{enter}{/meta}')

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interrupt/i })
      expect(button).toBeInTheDocument()
      return button
    })
  })

  test('スレッド一覧をスクロールすると、ヘッダーのスタイルが変更されること', () => {
    renderChat()

    const messagesDiv = screen.getByTestId('messages')
    fireEvent.scroll(messagesDiv, { target: { scrollTop: 100 } })

    expect(screen.getByRole('banner')).toHaveClass('header-scrolled')
  })
})
