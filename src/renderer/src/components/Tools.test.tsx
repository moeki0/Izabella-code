import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Tools } from './Tools'

describe('Tools', () => {
  const mockTools = [
    { name: 'Tool 1', description: 'Test description 1' },
    { name: 'Tool 2', description: 'Test description 2' }
  ]
  const getTools = vi.fn().mockResolvedValue(mockTools)

  it('ツールリストが表示されること', async () => {
    render(<Tools getTools={getTools} />)

    expect(getTools).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByText('Tool 1')).toBeInTheDocument()
      expect(screen.getByText('Test description 1')).toBeInTheDocument()
      expect(screen.getByText('Tool 2')).toBeInTheDocument()
      expect(screen.getByText('Test description 2')).toBeInTheDocument()
    })
  })

  it('空のツールリストが渡された場合、何も表示されないこと', async () => {
    const emptyGetTools = vi.fn().mockResolvedValue([])
    render(<Tools getTools={emptyGetTools} />)

    await waitFor(() => {
      const wrapper = screen.getByTestId('tools-list')
      expect(wrapper.children.length).toBe(0)
    })
  })

  it('検索によってツールをフィルタリングできること', async () => {
    render(<Tools getTools={getTools} />)

    await waitFor(() => {
      expect(screen.getByText('Tool 1')).toBeInTheDocument()
      expect(screen.getByText('Tool 2')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search tools...')
    fireEvent.change(searchInput, { target: { value: 'Tool 1' } })

    expect(screen.getByText('Tool 1')).toBeInTheDocument()
    expect(screen.queryByText('Tool 2')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'description 2' } })

    expect(screen.queryByText('Tool 1')).not.toBeInTheDocument()
    expect(screen.getByText('Tool 2')).toBeInTheDocument()
  })
})
