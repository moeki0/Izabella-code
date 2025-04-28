import { handleToolApproval as approve } from '../lib/llm'

export const handleToolApproval = async (approved: boolean): Promise<void> => {
  await approve(approved)
}
