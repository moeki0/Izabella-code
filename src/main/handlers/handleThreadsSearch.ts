import { searchThread, ThreadsWithPagination } from '../lib/thread'

export interface SearchThreadsParams {
  query: string
  page?: number
  itemsPerPage?: number
}

export const handleThreadsSearch = async (
  _,
  params: SearchThreadsParams
): Promise<ThreadsWithPagination> => {
  const { query, page = 1, itemsPerPage = 12 } = params
  return await searchThread(query, page, itemsPerPage)
}
