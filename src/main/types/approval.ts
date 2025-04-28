export interface ToolApprovalResolver {
  (approved: boolean): void
}

export interface ToolApprovalResult {
  approved: boolean
}
