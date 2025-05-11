import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Components } from 'react-markdown/lib/ast-to-react'

interface HighlightedMarkdownProps {
  content: string
  searchQuery?: string
}

/**
 * 検索ワードをハイライトするMarkdownコンポーネント
 *
 * @param content - マークダウンテキスト
 * @param searchQuery - ハイライトする検索クエリ
 */
const HighlightedMarkdown: React.FC<HighlightedMarkdownProps> = ({ content, searchQuery }) => {
  // 検索クエリが空の場合は通常のMarkdownを表示
  if (!searchQuery) {
    return (
      <Markdown remarkPlugins={[remarkGfm]}>
        {content ? content.replace(/```reasoning[\s\S]*?```/g, '') : ''}
      </Markdown>
    )
  }

  // このメッセージが```reasoning```ブロックを含む場合は空を返す
  if (content && content.includes('```reasoning')) {
    return <></>
  }

  // ```reasoning ブロックを削除
  const cleanContent = content ? content.replace(/```reasoning[\s\S]*?```/g, '') : ''

  // 検索クエリを分解して個別の単語にする（日本語の場合は2文字以上の単語も対象に）
  const queryWords = searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => {
      // 日本語文字が含まれている場合は2文字以上、それ以外は3文字以上をフィルタリング
      const hasJapaneseChars =
        /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
          word
        )
      return hasJapaneseChars ? word.length >= 2 : word.length >= 3
    })

  if (queryWords.length === 0) {
    return <Markdown remarkPlugins={[remarkGfm]}>{cleanContent}</Markdown>
  }

  // 特殊文字をエスケープしてRegExでエラーを防ぐ
  const escapeRegExp = (text: string): string => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 検索ワードにマッチする部分をハイライトするテキストのレンダリング
  const highlightText = (text: string): React.JSX.Element => {
    if (!text) return <>{text}</>

    // 検索ワードのパターンを作成
    const allPatterns: string[] = []

    // 完全一致のクエリを追加
    if (searchQuery.trim().length >= 2) {
      // 2文字以上に変更（日本語対応）
      const escapedQuery = escapeRegExp(searchQuery.trim())
      allPatterns.push(escapedQuery)
    }

    // 個別の単語を追加
    queryWords.forEach((word) => {
      if (word.length >= 2 && !allPatterns.includes(escapeRegExp(word))) {
        // 2文字以上に変更（日本語対応）
        const escapedWord = escapeRegExp(word)
        allPatterns.push(escapedWord)
      }
    })

    // パターンがない場合はそのまま返す
    if (allPatterns.length === 0) {
      return <>{text}</>
    }

    // 正規表現パターンを作成
    const pattern = new RegExp(`(${allPatterns.join('|')})`, 'gi')

    // テキストを分割してハイライト
    const parts = text.split(pattern)

    return (
      <>
        {parts.map((part, i) => {
          // パターンにマッチした部分をハイライト
          const matchesPattern = allPatterns.some((p) => new RegExp(p, 'i').test(part))

          return matchesPattern ? (
            <span key={i} className="message-context-highlight">
              {part}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        })}
      </>
    )
  }

  // Markdownコンポーネントの各要素をカスタムレンダリング
  const components: Components = {
    // インラインテキスト要素をカスタマイズ
    // @ts-ignore - react-markdownの型定義の問題を回避
    code({ className, children, ...props }) {
      // コードブロックはハイライトしない（そのまま表示）
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
    // @ts-ignore - react-markdownの型定義の問題を回避
    p({ children, ...props }) {
      if (typeof children === 'string') {
        return <p {...props}>{highlightText(children)}</p>
      }
      return <p {...props}>{children}</p>
    },
    // @ts-ignore - react-markdownの型定義の問題を回避
    strong({ children, ...props }) {
      if (typeof children === 'string') {
        return <strong {...props}>{highlightText(children)}</strong>
      }
      return <strong {...props}>{children}</strong>
    },
    // @ts-ignore - react-markdownの型定義の問題を回避
    em({ children, ...props }) {
      if (typeof children === 'string') {
        return <em {...props}>{highlightText(children)}</em>
      }
      return <em {...props}>{children}</em>
    },
    // @ts-ignore - react-markdownの型定義の問題を回避
    li({ children, ...props }) {
      if (typeof children === 'string') {
        return <li {...props}>{highlightText(children)}</li>
      }
      return <li {...props}>{children}</li>
    },
    // @ts-ignore - react-markdownの型定義の問題を回避
    a({ children, ...props }) {
      if (typeof children === 'string') {
        return <a {...props}>{highlightText(children)}</a>
      }
      return <a {...props}>{children}</a>
    }
  }

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {cleanContent}
    </Markdown>
  )
}

export default HighlightedMarkdown
