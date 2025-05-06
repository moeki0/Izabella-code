import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Header } from './Header'
import { act } from 'react'

describe('Header', () => {
  const defaultProps = {
    isMenuOpen: false,
    setIsMenuOpen: vi.fn()
  }

  it('メニューボタンをクリックするとアシスタントパネルの表示が切り替わること', async () => {
    const setIsMenuOpen = vi.fn()

    await act(async () => {
      render(<Header {...defaultProps} setIsMenuOpen={setIsMenuOpen} isAssistantsOpen={false} />)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'menu' })).toBeInTheDocument()
    })

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'menu' }))
    })

    await waitFor(() => {
      expect(setIsMenuOpen).toHaveBeenCalledWith(true)
    })
  })
})
