/**
 * 検索クエリのタイムスタンプ部分を除去する関数
 * 検索キャッシュ回避のために追加されるタイムスタンプを削除します
 *
 * @param query - 元の検索クエリ文字列
 * @returns タイムスタンプを除去した検索クエリ
 */
export const cleanSearchQuery = (query: string): string => {
  return query.trim().replace(/\s+\d+$/, '')
}
