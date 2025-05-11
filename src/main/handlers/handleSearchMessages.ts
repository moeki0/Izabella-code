import { IpcMainInvokeEvent } from 'electron'
import { searchMessages, SearchMessagesParams } from '../lib/message'

export const handleSearchMessages = async (
  _: IpcMainInvokeEvent,
  params: SearchMessagesParams
): Promise<Record<string, unknown>> => {
  try {
    // デバッグ情報の出力
    console.log('Search params:', JSON.stringify(params))

    const results = await searchMessages(params)

    // 検索結果のメタデータをログ出力
    console.log(
      `Search results: found ${results.total} messages, page ${params.page || 1} of ${results.totalPages}`
    )

    // 検索結果の最初のIDをログ出力（結果が同じかどうか確認するため）
    if (results.messages && results.messages.length > 0) {
      console.log('First result ID:', results.messages[0].id)
    }

    return {
      success: true,
      data: results,
      error: null
    }
  } catch (error) {
    console.error('Error searching messages:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
