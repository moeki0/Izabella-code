import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react'
import '@testing-library/jest-dom'
import Chat, { ChatProps } from './Chat'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { act } from 'react'

vi.mock('@uiw/react-codemirror')

// window.electronをモック
window.electron = {
  ipcRenderer: {
    invoke: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn()
  }
}

// window.apiをモック
window.api = {
  getConfig: vi.fn().mockResolvedValue(true),
  setConfig: vi.fn().mockResolvedValue(true),
  deleteMessage: vi.fn().mockResolvedValue(true),
  getMessageContext: vi.fn().mockResolvedValue({ success: true, data: [] }),
  init: vi.fn().mockResolvedValue({ title: 'Test', messages: [] }),
  getLocale: vi.fn().mockResolvedValue('en')
}

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
  registerMessageSavedListener: vi.fn().mockReturnValue(() => {}),
  registerFinishListener: vi.fn().mockReturnValue(() => {}),
  registerErrorListener: vi.fn().mockImplementation((callback) => {
    callback('test error')
    return () => {}
  }),
  registerToolResultListener: vi.fn().mockReturnValue(() => {}),
  registerTitleListener: vi.fn().mockReturnValue(() => {}),
  registerInterruptListener: vi.fn().mockReturnValue(() => {}),
  registerNewThreadListener: vi.fn().mockReturnValue(() => {}),
  registerRetryListener: vi.fn().mockReturnValue(() => {}),
  registerSourceListener: vi.fn().mockReturnValue(() => {}),
  registerKnowledgeSavedListener: vi.fn().mockReturnValue(() => {}),
  registerMemoryUpdatedListener: vi.fn().mockReturnValue(() => {}),
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
  beforeEach(() => {
    vi.spyOn(window, 'scroll').mockImplementation(() => {})
  })
  test('初期状態では、エラーメッセージが表示される', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(screen.getByText('test error')).toBeInTheDocument()
    })
  })

  test('初期化後、チャットが表示される', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(mockDependencies.init).toHaveBeenCalled()
    })
  })

  test('ツールを閉じられること', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(mockDependencies.init).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('{"foo":"bar"}')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'close-tool-0' }))
    })

    await waitFor(() => {
      expect(screen.queryByText('{"foo":"bar"}')).toBeFalsy()
    })
  })

  test.skip('メッセージの送信が動作する', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(mockDependencies.init).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Izabella')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Izabella')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello' } })
    })

    // No need to look for send button - just simulate the meta+enter keystroke

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
    })

    await waitFor(() => {
      expect(mockDependencies.send).toHaveBeenCalledWith('Hello', false)
    })
  })

  test('エラーメッセージが表示される', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(screen.getByText('test error')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('close-error'))
    })

    await waitFor(() => {
      expect(screen.queryByText('Test error')).toBeFalsy()
    })
  })

  test.skip('ツールパネルの表示切り替えが動作する', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(screen.getByLabelText('menu')).toBeInTheDocument()
    })

    const toolsButton = screen.getByLabelText('menu')

    await act(async () => {
      fireEvent.click(toolsButton)
    })

    await waitFor(() => {
      expect(screen.getByTestId('menu')).toBeInTheDocument()
    })
  })

  test.skip('中断ボタンが動作する', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(mockDependencies.init).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Izabella')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Izabella')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello' } })
    })

    // No need to look for send button - just simulate the meta+enter keystroke

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', metaKey: true })
    })

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interrupt/i })
      expect(button).toBeInTheDocument()
      return button
    })

    const interruptButton = screen.getByRole('button', { name: /interrupt/i })

    await act(async () => {
      fireEvent.click(interruptButton)
    })

    await waitFor(() => {
      expect(mockDependencies.interrupt).toHaveBeenCalled()
    })
  })

  test.skip('キーボードで送信する', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(mockDependencies.init).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Izabella')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Izabella')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello' } })
    })

    await act(async () => {
      await userEvent.type(input, '{meta>}{enter}{/meta}')
    })

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /interrupt/i })
      expect(button).toBeInTheDocument()
      return button
    })
  })

  test.skip('スレッド一覧をスクロールすると、ヘッダーのスタイルが変更されること', async () => {
    await act(async () => {
      renderChat()
    })

    await waitFor(() => {
      expect(screen.getByTestId('messages')).toBeInTheDocument()
    })

    const messagesDiv = screen.getByTestId('messages')

    await act(async () => {
      fireEvent.scroll(messagesDiv, { target: { scrollTop: 100 } })
    })

    await waitFor(() => {
      expect(screen.getByRole('banner')).toHaveClass('header-scrolled')
    })
  })
})
