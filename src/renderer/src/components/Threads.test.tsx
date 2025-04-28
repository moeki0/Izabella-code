import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Threads from './Threads'
import { localizeDate } from '../lib/locale'
import '@testing-library/jest-dom'

const mockNavigate = vi.fn()
const getTools = vi.fn().mockResolvedValue([])
const getThreads = vi.fn().mockResolvedValue([])
const searchThreads = vi.fn().mockResolvedValue([])
const registerNewThreadListener = vi.fn().mockReturnValue(() => {})
const registerDeleteThreadListener = vi.fn().mockReturnValue(() => {})
const onNewThread = vi.fn()
const onThreadContextMenu = vi.fn()
const showThreadContextMenu = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate
}))

const defaultProps = {
  initialThreads: [
    {
      id: '1',
      title: 'Test Thread',
      created_at: '2025-05-01T12:00:00Z',
      update_at: '2025-05-01T12:00:00Z',
      messages: [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' }
      ]
    }
  ],
  getTools,
  getThreads,
  searchThreads,
  registerNewThreadListener,
  registerDeleteThreadListener,
  onNewThread,
  onThreadContextMenu,
  showThreadContextMenu
}

describe('Threads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('スレッド一覧が表示されること', () => {
    render(<Threads {...defaultProps} />)

    expect(screen.getByText('Test Thread')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
    expect(screen.getByText(localizeDate(new Date('2025-05-01T12:00:00Z')))).toBeInTheDocument()
  })

  it('スレッドをクリックすると、そのスレッドに遷移すること', async () => {
    render(<Threads {...defaultProps} />)

    fireEvent.click(screen.getByTestId('thread-1'))

    expect(mockNavigate).toHaveBeenCalledWith('/threads/1')
  })

  it('スレッドを右クリックすると、コンテキストメニューが表示されること', () => {
    render(<Threads {...defaultProps} />)

    const thread = screen.getByText('Test Thread').closest('.thread-list-item')!
    fireEvent.contextMenu(thread)

    expect(showThreadContextMenu).toHaveBeenCalledWith('1')
  })

  it('検索ボックスに入力すると、検索が実行されること', async () => {
    render(<Threads {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search threads...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    expect(searchThreads).toHaveBeenCalledWith('test')
  })

  it('スレッド一覧をスクロールすると、ヘッダーのスタイルが変更されること', () => {
    render(<Threads {...defaultProps} />)

    const threadsDiv = screen.getByTestId('threads')
    fireEvent.scroll(threadsDiv, { target: { scrollTop: 100 } })

    expect(screen.getByRole('banner')).toHaveClass('header-scrolled')
  })
})
