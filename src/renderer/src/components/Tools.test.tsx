import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
})
