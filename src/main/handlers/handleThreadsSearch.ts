import { searchThread, Thread } from '../lib/thread'

export const handleThreadsSearch = async (_, query): Promise<Array<Thread>> => {
  return await searchThread(query)
}
