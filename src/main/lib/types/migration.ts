export interface Migration {
  version: number
  description: string
  sql: string
}
