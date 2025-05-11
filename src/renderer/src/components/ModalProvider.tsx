import React, { useState, ReactNode } from 'react'
import MessageContextModal from './MessageContextModal'
import { ModalContext } from '../lib/context'

// モーダルプロバイダーのプロップス
type ModalProviderProps = {
  children: ReactNode
}

// モーダルプロバイダーコンポーネント
export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [messageContextId, setMessageContextId] = useState<string | null>(null)
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('')

  // メッセージコンテキストモーダルを表示する
  const showMessageContext = (messageId: string, searchQuery?: string): void => {
    setMessageContextId(messageId)
    setCurrentSearchQuery(searchQuery || '')
  }

  // すべてのモーダルを閉じる
  const closeModals = (): void => {
    setMessageContextId(null)
  }

  return (
    <ModalContext.Provider value={{ showMessageContext, closeModals }}>
      {children}

      {/* メッセージコンテキストモーダル */}
      {messageContextId && (
        <MessageContextModal
          messageId={messageContextId}
          searchQuery={currentSearchQuery}
          onClose={closeModals}
          showMessageContextMenu={(text, messageId, isAssistantMessage) => {
            window.electron.ipcRenderer.send(
              'show-message-context-menu',
              text,
              messageId,
              isAssistantMessage
            )
          }}
        />
      )}
    </ModalContext.Provider>
  )
}
