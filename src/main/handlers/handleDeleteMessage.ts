import { database } from '../lib/database'

export const handleDeleteMessage = async (_, messageId: string): Promise<void> => {
  const db = await database()
  await db.prepare('DELETE FROM messages WHERE id = ?').run(messageId)
}
