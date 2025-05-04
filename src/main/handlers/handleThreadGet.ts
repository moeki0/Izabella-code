import { getThreads, ThreadsWithPagination } from '../lib/thread'

export interface GetThreadsParams {
  page?: number
  itemsPerPage?: number
}

export const handleThreadGet = async (
  params: GetThreadsParams = {}
): Promise<ThreadsWithPagination> => {
  const { page = 1, itemsPerPage = 12 } = params
  return await getThreads(page, itemsPerPage)
}
