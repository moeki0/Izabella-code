import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/core/storage/libsql'
import { LibSQLVector } from '@mastra/core/vector/libsql'
import { join } from 'node:path'
import { app } from 'electron'
import { TokenLimiter } from '@mastra/memory/processors'
import { store } from './store'

export const memory = new Memory({
  storage: new LibSQLStore({
    config: {
      url: `file:${join(app.getPath('userData'), 'memory.db')}`
    }
  }),
  vector: new LibSQLVector({
    connectionUrl: `file:${join(app.getPath('userData'), 'memory.db')}`
  }),
  processors: [new TokenLimiter((store.get('tokenLimit') as number) || 127000)],
  options: {
    workingMemory: {
      enabled: true,
      use: 'tool-call',
      template: `
# User Information
- **Environment**: Local ChatZen instance
- **Working Memory Status**: ON
- **Name**: Moekiさん
- [その他のユーザー情報]

# Active Project Context: [現在アクティブなプロジェクト名]
- **目的**: [プロジェクトの目的のサマリー]
- **現在の状況**: [現在のフェーズや主要な進捗]
- **重要な決定事項**: [直近の重要な決定事項]
- **主要な参照先**: [関連するファイルパスやURLのリスト]
- [その他、アクティブなプロジェクトに関する重要なサマリー]

# Other Project Contexts:
- **[他のプロジェクト名]**: [簡単な概要や、関連性が生まれそうな情報のサマリー]
- **[別のプロジェクト名]**: [簡単な概要や、関連性が生まれそうな情報のサマリー]
- ...

# Tasks:
- [現在取り組んでいる主要なタスクのリスト - 短期的なものはナレッジ等で管理し、ここにサマリーを記載]

# Decisions:
- [プロジェクト横断的な重要な決定事項や、Working Memoryの他のセクションに含めにくい決定事項]

# Locations:
- [会話で頻繁に参照されるファイルパスやURLのリスト]

# Concepts:
- [会話で頻繁に出てくる、あるいは重要な概念や用語の定義]

# People:
- [会話に関連する人物とその役割など]

# Events:
- [重要なMTGやイベントなど]

# Other:
- [上記に分類されない、その他の重要な情報]

Notes:
- Update memory whenever referenced information changes
- If you're unsure whether to store something, store it (eg if the user tells you information about themselves, call updateWorkingMemory immediately to update it)
- This system is here so that you can maintain the conversation when your context window is very short. Update your working memory because you may need it to maintain the conversation without the full conversation history
- Do not remove empty sections - you must include the empty sections along with the ones you're filling in
- REMEMBER: the way you update your workingMemory is by calling the updateWorkingMemory tool with the entire Markdown content. The system will store it for you. The user will not see it.
- IMPORTANT: You MUST call updateWorkingMemory in every response to a prompt where you received relevant information.
- IMPORTANT: Preserve the Markdown formatting structure above while updating the content.
`
    }
  }
})
