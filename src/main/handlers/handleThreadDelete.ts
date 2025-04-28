import { deleteThread } from '../lib/thread'

export const handleThreadDelete = async (id: string): Promise<void> => {
  deleteThread(id)
}
