import { getThreads, Thread } from '../lib/thread'

export const handleThreadGet = async (): Promise<Array<Thread>> => {
  return await getThreads()
}
