import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Header } from './Header'

describe('Header', () => {
  const defaultProps = {
    isMenuOpen: false,
    setIsMenuOpen: vi.fn()
  }

  it('タイトルとタイムスタンプが表示されること', () => {
    const title = 'Test Title'
    const startedAt = new Date('2025-05-01')

    render(<Header {...defaultProps} title={title} startedAt={startedAt} />)

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText('Thursday, May 1, 2025')).toBeInTheDocument()
  })

  it('検索ボックスが表示され、入力が可能なこと', async () => {
    const setSearchQuery = vi.fn()
    const search = vi.fn()

    render(<Header {...defaultProps} setSearchQuery={setSearchQuery} search={search} />)

    const searchInput = screen.getByPlaceholderText('Search threads...')
    await userEvent.type(searchInput, 'test')

    expect(setSearchQuery).toHaveBeenCalledWith('test')
    expect(search).toHaveBeenCalledWith('test')
  })

  it('新規作成ボタンクリック時にnavigateが呼ばれること', async () => {
    const onNewThread = vi.fn()
    render(<Header {...defaultProps} onNewThread={onNewThread} />)

    await userEvent.click(screen.getByRole('button', { name: 'new' }))

    expect(onNewThread).toHaveBeenCalled()
  })

  it('スレッド一覧ボタンクリック時にそれが呼ばれること', async () => {
    const onThreadList = vi.fn()
    render(<Header {...defaultProps} onThreadList={onThreadList} />)

    await userEvent.click(screen.getByRole('button', { name: 'threads' }))

    expect(onThreadList).toHaveBeenCalled()
  })

  it('メニューボタンをクリックするとアシスタントパネルの表示が切り替わること', async () => {
    const setIsMenuOpen = vi.fn()
    render(<Header {...defaultProps} setIsMenuOpen={setIsMenuOpen} isAssistantsOpen={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'menu' }))

    expect(setIsMenuOpen).toHaveBeenCalledWith(true)
  })
})
