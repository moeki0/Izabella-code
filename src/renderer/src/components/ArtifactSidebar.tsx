import { useCallback, useEffect, useState } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { useIntl } from '../lib/locale'

interface Artifact {
  id: string
  title: string
  content: string
  created_at: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

function ArtifactSidebar({ isOpen }: Props): React.JSX.Element | null {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const intl = useIntl()

  // アーティファクトの一覧を取得
  const fetchArtifacts = useCallback(async () => {
    try {
      if (window.api.searchKnowledge) {
        // アーティファクトのプレフィックスで検索
        const result = await window.api.searchKnowledge('prefix:note--', 100)

        if (result.results) {
          // ナレッジアイテムをアーティファクト形式に変換
          const artifactItems: Artifact[] = result.results.map((item) => {
            const titleMatch = item.id.match(/^note--(.+)$/)
            const title = titleMatch ? titleMatch[1] : item.id

            return {
              id: item.id,
              title: title,
              content: item.content,
              created_at: item.created_at || Date.now()
            }
          })

          // 作成日時の降順でソート
          artifactItems.sort((a, b) => b.created_at - a.created_at)
          setArtifacts(artifactItems)
        }
      }
    } catch (error) {
      console.error('Failed to fetch artifacts:', error)
    }
  }, [])

  // コンポーネントがマウントされたとき、またはサイドバーが開かれたときにアーティファクトを取得
  useEffect(() => {
    if (isOpen) {
      fetchArtifacts()
    }
  }, [isOpen, fetchArtifacts])

  // アーティファクト保存処理
  const handleSaveArtifact = async (): Promise<void> => {
    if (!content.trim() || !title.trim()) {
      return
    }

    setLoading(true)
    try {
      if (window.api.createKnowledge) {
        // "note--" プレフィックスにタイトルを付けたIDを生成
        const id = `note--${title.trim()}`

        window.api.createKnowledge(content, id)

        // 保存後、入力フィールドをクリアしてアーティファクト一覧を再取得
        setContent('')
        setTitle('')
        fetchArtifacts()
      }
    } catch (error) {
      console.error('Failed to save artifact:', error)
    } finally {
      setLoading(false)
    }
  }

  // アーティファクトの削除処理
  const handleDeleteArtifact = async (artifactId: string, artifactTitle: string): Promise<void> => {
    // 確認ダイアログ表示
    const confirmMessage =
      intl.formatMessage({ id: 'deleteArtifactConfirmation' }, { title: artifactTitle }) ||
      `Are you sure you want to delete "${artifactTitle}"?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      if (window.api.deleteKnowledge) {
        await window.api.deleteKnowledge([artifactId])

        // モーダルが開いていて、削除されたアーティファクトが選択されている場合はモーダルを閉じる
        if (isEditModalOpen && selectedArtifact && selectedArtifact.id === artifactId) {
          setIsEditModalOpen(false)
          setSelectedArtifact(null)
          setEditContent('')
          setEditTitle('')
        }

        fetchArtifacts()
      }
    } catch (error) {
      console.error('Failed to delete artifact:', error)
    }
  }

  // 編集モーダルを開く
  const openEditModal = (artifact: Artifact): void => {
    setSelectedArtifact(artifact)
    setEditContent(artifact.content)
    setEditTitle(artifact.title)
    setIsEditModalOpen(true)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="sidebar artifact-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          {intl.formatMessage({ id: 'artifacts' }) || 'Artifacts'}
        </div>
      </div>

      <div className="artifact-sidebar-content">
        <div className="artifact-sidebar-content-description">
          {intl.formatMessage({ id: 'artifactsDescription' })}
        </div>
        {/* 新規アーティファクト入力フォーム */}
        <div className="artifact-new-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={intl.formatMessage({ id: 'artifactTitle' }) || 'Title'}
            className="artifact-title-input"
          />
          <div className="artifact-editor">
            <ReactCodeMirror
              value={content}
              onChange={setContent}
              extensions={[
                markdown({ base: markdownLanguage, codeLanguages: languages }),
                EditorView.lineWrapping
              ]}
              placeholder={
                intl.formatMessage({ id: 'artifactContent' }) || 'Paste your content here...'
              }
              className="artifact-codemirror"
            />
          </div>
          <div>
            <button
              className="artifact-save-button"
              onClick={handleSaveArtifact}
              disabled={loading || !content.trim() || !title.trim()}
            >
              {intl.formatMessage({ id: 'save' }) || 'Save'}
            </button>
          </div>
        </div>

        {/* アーティファクト一覧 */}
        <div className="artifact-list">
          <h3>{intl.formatMessage({ id: 'savedArtifacts' }) || 'Saved Artifacts'}</h3>
          {artifacts.length > 0 ? (
            <ul className="artifact-items">
              {artifacts.map((artifact) => (
                <li key={artifact.id} className="artifact-item">
                  <div className="artifact-item-title">{artifact.title}</div>
                  <div className="artifact-item-actions">
                    <button
                      onClick={() => handleDeleteArtifact(artifact.id, artifact.title)}
                      className="delete-button"
                      aria-label="Delete artifact"
                    >
                      {intl.formatMessage({ id: 'delete' }) || 'Delete'}
                    </button>
                    <button
                      onClick={() => openEditModal(artifact)}
                      className="edit-button"
                      aria-label="Edit artifact"
                    >
                      {intl.formatMessage({ id: 'edit' }) || 'Edit'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-artifacts">
              {intl.formatMessage({ id: 'noArtifacts' }) || 'No artifacts saved yet'}
            </div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {isEditModalOpen && selectedArtifact && (
        <div className="artifact-edit-modal">
          <div className="artifact-edit-modal-content">
            <input
              type="text"
              disabled
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value)

                if (autoSaveTimeout) {
                  clearTimeout(autoSaveTimeout)
                }

                const newTimeout = setTimeout(() => {
                  if (selectedArtifact && editContent.trim() && e.target.value.trim()) {
                    window.api
                      .updateKnowledge?.(
                        editContent,
                        `note--${e.target.value.trim()}`,
                        selectedArtifact.id
                      )
                      .then(() => {
                        fetchArtifacts()
                      })
                      .catch((error) => {
                        console.error('Failed to auto-save artifact:', error)
                      })
                  }
                }, 1000)

                setAutoSaveTimeout(newTimeout)
              }}
              placeholder={intl.formatMessage({ id: 'artifactTitle' }) || 'Title'}
              className="artifact-modal-title-input"
            />
            <div className="artifact-modal-editor">
              <ReactCodeMirror
                value={editContent}
                onChange={(value) => {
                  setEditContent(value)

                  if (autoSaveTimeout) {
                    clearTimeout(autoSaveTimeout)
                  }

                  const newTimeout = setTimeout(() => {
                    if (selectedArtifact && value.trim() && editTitle.trim()) {
                      window.api
                        .updateKnowledge?.(value, `note--${editTitle.trim()}`, selectedArtifact.id)
                        .then(() => {
                          fetchArtifacts()
                        })
                        .catch((error) => {
                          console.error('Failed to auto-save artifact:', error)
                        })
                    }
                  }, 1000)

                  setAutoSaveTimeout(newTimeout)
                }}
                extensions={[
                  markdown({ base: markdownLanguage, codeLanguages: languages }),
                  EditorView.lineWrapping
                ]}
                className="artifact-modal-codemirror"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ArtifactSidebar }
