import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { WebSearchToggle } from './WebSearchToggle'
import { act } from 'react'

// window.apiをモック
window.api = {
  getConfig: vi.fn().mockResolvedValue(true),
  setConfig: vi.fn().mockResolvedValue(true)
}

describe('WebSearchToggle', () => {
  it('ウェブ検索トグルアイコンが表示されること', async () => {
    await act(async () => {
      render(<WebSearchToggle />)
    })

    await waitFor(() => {
      // SVGアイコンを含むコンテナが表示されていることを確認
      const toggleElement = document.querySelector('.web-search-control')
      expect(toggleElement).toBeInTheDocument()
      expect(toggleElement).toHaveClass('web-search-control-on')
    })
  })

  it('トグルをクリックするとstoreの値が更新されること', async () => {
    const mockSetConfig = vi.fn().mockResolvedValue(true)
    window.api.setConfig = mockSetConfig

    await act(async () => {
      render(<WebSearchToggle />)
    })

    const toggleElement = document.querySelector('.web-search-control')
    await act(async () => {
      await userEvent.click(toggleElement)
    })

    expect(mockSetConfig).toHaveBeenCalledWith('useSearchGrounding', false)
  })
})
