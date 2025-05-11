import { createContext } from 'react'

// モーダルの状態管理用のコンテキスト
type ModalContextType = {
  showMessageContext: (messageId: string, searchQuery?: string) => void
  closeModals: () => void
}

/**
 * モーダル表示のためのReactコンテキスト
 * モーダルの表示/非表示状態やメッセージコンテキストの表示をコントロールする
 */
export const ModalContext = createContext<ModalContextType | undefined>(undefined)
