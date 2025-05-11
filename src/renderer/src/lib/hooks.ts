import { useContext } from 'react'
import { ModalContext } from './context'

// モーダルコンテキストを使用するためのフック
export const useModal = (): {
  showMessageContext: (messageId: string, searchQuery?: string) => void
  closeModals: () => void
} => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
