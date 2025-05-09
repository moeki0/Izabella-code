import { DEFAULT_WORKING_MEMORY_TEMPLATE } from '../lib/workingMemory'

export const workingMemoryInstructions = `
# ワーキングメモリ

* 'update_working_memory' ツールを使用してコンテンツを更新してください
* 積極的に新しい概念やトピックが最初に出現したときに保存してください
* ユーザーの許可なしで保存できます
* 更新の際には必ず "update_working_memory" ツールを使ってください
* ワーキングメモリを保存する際にはそれまでの形を破壊せずにテンプレートに従ってください

テンプレート:
*****ワーキングメモリのフォーマットは必ず以下のテンプレートに従ってください！！！！！******
${DEFAULT_WORKING_MEMORY_TEMPLATE}
`
