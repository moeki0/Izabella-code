/**
 * LLMの応答からJSONブロックや余分なメタデータを除去する関数
 *
 * 注意: この関数はサーバー側でテーマ抽出のためにJSONブロックを削除するために使用されます。
 * フロントエンド側でのコンテンツ表示処理はUIコンポーネントで行います。
 */

// JSONブロックを検出して削除するための正規表現パターン
const JSON_BLOCK_PATTERNS = [
  // ```json～```形式
  /```json[\s\S]*?```/g,

  // <conversation_metadata>～</conversation_metadata>形式
  /<conversation_metadata>[\s\S]*?<\/conversation_metadata>/g,

  // JSONブロックっぽいパターン（{で始まりthemeを含むもの）
  /\{[\s\S]*?"theme"[\s\S]*?\}/g,

  // JSONブロックっぽいパターン（{で始まりmetadataを含むもの）
  /\{[\s\S]*?"metadata"[\s\S]*?\}/g
]

/**
 * LLMの応答からJSONブロックや余分な構造を削除する
 * @param content LLMの応答テキスト
 * @returns クリーンアップされたテキスト
 */
export function cleanContentForDisplay(content: string): string {
  if (!content) return ''

  // まず、コンテンツ全体がJSONオブジェクトかどうかチェック
  if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
    try {
      const jsonObj = JSON.parse(content.trim())

      // {"content": "...", "metadata": {...}} 形式の場合
      if (jsonObj.content) {
        console.log(
          'コンテンツ全体がJSON形式で、contentプロパティが存在します。contentのみを抽出します。'
        )
        return jsonObj.content
      }
    } catch {
      // JSONパースに失敗した場合は通常の処理を続行
    }
  }

  let cleanedContent = content

  // 各種JSONブロックパターンを削除
  JSON_BLOCK_PATTERNS.forEach((pattern) => {
    cleanedContent = cleanedContent.replace(pattern, '')
  })

  // 余分な空行を削除
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n')

  // 末尾の空行を削除
  cleanedContent = cleanedContent.trim()

  // メッセージが空になった場合は元のコンテンツを返す
  if (cleanedContent.length === 0) {
    console.warn('クリーンアップ後のコンテンツが空になりました。元のコンテンツを使用します。')
    return content
  }

  return cleanedContent
}

/**
 * LLMの応答がJSON構造かどうかをチェック
 * @param content LLMの応答テキスト
 * @returns JSON構造の場合はtrue
 */
export function isJsonContent(content: string): boolean {
  if (!content) return false

  const trimmedContent = content.trim()

  // '{' で始まり '}' で終わる場合はJSONと判断
  if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
    try {
      JSON.parse(trimmedContent)
      return true
    } catch {
      return false
    }
  }

  return false
}
