import { createIntl, createIntlCache, IntlShape } from '@formatjs/intl'

export type LocaleMessages = {
  [key: string]: string
}

export type SupportedLocales = 'en' | 'ja'

export const locale: Record<SupportedLocales, LocaleMessages> = {
  en: {
    app: 'Izabella',
    about: 'About Izabella',
    setting: 'Settings (JSON)',
    openKnowledgeFolder: 'Open Knowledge Folder',
    openMemoryFile: 'Open Memory File',
    services: 'Services',
    knowledge: "Izabela's Knowledge",
    memoryCompressed: 'Memory compressed',
    hide: 'Hide Izabella',
    memory: "Izabela's Memory",
    searchKnowledge: 'Search Knowledge',
    settings: 'Settings',
    hideOthers: 'Hide Others',
    quit: 'Quit Izabella',
    file: 'File',
    openDir: 'Open Folder...',
    new: 'New',
    duplicate: 'Duplicate',
    search: 'Message Search',
    searchFullText: 'Full Text Search',
    close: 'Close',
    searchResults: 'Knowledge Found',
    abstractKnowledge: 'Abstract Knowledge',
    abstractConceptsExtraction: 'Abstract Concepts Extraction',
    abstractConceptsSearch: 'Abstract Concepts Search',
    abstractKnowledgeGeneration: 'Abstract Knowledge Generation',
    knowledgeId: 'Knowledge ID',
    edit: 'Edit',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    pasteAndMatchStyle: 'Paste and Match Style',
    delete: 'Delete',
    selectAll: 'Select All',
    speak: 'Speech',
    startSpeaking: 'Start Speaking',
    stopSpeaking: 'Stop Speaking',
    view: 'View',
    sidebar: 'Sidebar',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleDevTools: 'Toggle Developer Tools',
    tools: 'Tools',
    resetZoom: 'Actual Size',
    togglefullscreen: 'Toggle Full Screen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front',
    help: 'Help',
    github: 'GitHub',
    openInDefaultApp: 'Open in Default App',
    revealInFinder: 'Reveal in Finder',
    copyPath: 'Copy Path',
    copyPrompt: 'Copy as Prompt',
    backLink: 'Back Links',
    copyAll: 'Copy All',
    stopAssistant: 'Stop Assistant',
    deleteMessage: 'Delete Message',
    askMeAnything: 'Ask me anything',
    knowledgeIndexUpdated: 'Knowledge index updated',
    updatingKnowledgeIndex: 'Updating knowledge index',
    knowledgeSaved: 'Knowledge saved',
    savingKnowledge: 'Saving knowledge',
    knowledgeFound: 'Knowledge found',
    searchingKnowledge: 'Searching knowledge base...',
    memorySaved: 'Memory saved',
    updatingMemory: 'Updating memory',
    toolConfirmation: 'Do you want to execute {toolName}?',
    yes: 'Yes',
    no: 'No',
    request: 'Request',
    response: 'Response',
    language: 'Language',
    languageSelector: 'Language',
    searchMessages: 'Search messages',
    searchResultsCount: '{count} results found',
    moreResults: '{count} more results',
    noSearchResults: 'No messages found',
    messageContext: 'Message Context',
    loadingMessages: 'Loading messages...',
    noMessagesFound: 'No messages found',
    user: 'User',
    assistant: 'Assistant',
    tool: 'Tool',
    knowledgeRecorded: 'Knowledge recorded',
    memoryUpdated: 'Memory updated',
    otherKnowledge: 'Related Knowledges',
    deepResearchMode: 'Deep Research Mode',
    deepResearchActive: 'Deep Research Active',
    cmdEnterToSend: 'Press ⌘ + Enter to send'
  },
  ja: {
    app: 'Izabella',
    about: 'Izabellaについて',
    setting: '設定 (JSON)',
    settings: '設定',
    openKnowledgeFolder: 'ナレッジフォルダを開く',
    openMemoryFile: 'メモリーファイルを開く',
    services: 'サービス',
    hide: 'Izabellaを非表示',
    hideOthers: 'ほかを非表示',
    quit: 'Izabellaを終了',
    knowledge: 'Izabelaのナレッジ',
    memory: 'Izabelaのメモリ',
    file: 'ファイル',
    searchKnowledge: 'ナレッジを検索',
    searchingKnowledge: 'ナレッジベースを検索中...',
    tools: 'ツール',
    openDir: 'フォルダを開く...',
    memoryCompressed: 'メモリが圧縮されました',
    new: '新規作成',
    duplicate: '複製',
    search: 'メッセージ検索',
    searchFullText: '全文検索',
    close: '閉じる',
    abstractKnowledge: '抽象ナレッジ',
    abstractConceptsExtraction: '抽象概念の抽出',
    abstractConceptsSearch: '抽象ナレッジが見つかりました',
    abstractKnowledgeGeneration: '抽象ナレッジを生成',
    knowledgeId: 'ナレッジID',
    edit: '編集',
    cut: 'カット',
    copy: 'コピー',
    paste: 'ペースト',
    pasteAndMatchStyle: 'リッチテキストとしてペースト',
    delete: '削除',
    selectAll: '全て選択',
    speak: 'スピーチ',
    startSpeaking: '読み上げを開始',
    stopSpeaking: '読み上げを停止',
    view: '表示',
    sidebar: 'サイドバー',
    zoomIn: '拡大',
    zoomOut: '縮小',
    toggleDevTools: '開発者ツール',
    resetZoom: '実際のサイズ',
    togglefullscreen: 'フルスクリーンにする',
    window: 'ウィンドウ',
    minimize: 'しまう',
    zoom: '拡大/縮小',
    front: 'すべてを手前に移動',
    help: 'ヘルプ',
    github: 'GitHub',
    openInDefaultApp: 'アプリで開く',
    revealInFinder: 'Finderに表示',
    copyPath: 'パスをコピー',
    copyPrompt: 'プロンプトをコピー',
    backLink: 'バックリンク',
    copyAll: '全てコピー',
    stopAssistant: 'アシスタントを停止',
    deleteMessage: 'メッセージを削除',
    askMeAnything: 'なんでも聞いてください',
    knowledgeIndexUpdated: 'ナレッジのインデックスを更新しました',
    updatingKnowledgeIndex: 'ナレッジのインデックスを更新します',
    knowledgeSaved: 'ナレッジを保存しました',
    savingKnowledge: 'ナレッジを保存します',
    knowledgeFound: 'ナレッジが見つかりました',
    otherKnowledge: '関連ナレッジ',
    relatedKnowledge: '関連ナレッジ',
    unrelatedKnowledge: '無関係ナレッジ',
    chronologicalKnowledge: '時間的近似ナレッジ',
    memorySaved: 'メモリを保存しました',
    updatingMemory: 'メモリを更新します',
    toolConfirmation: '{toolName}を実行しますか？',
    yes: 'はい',
    no: 'いいえ',
    request: 'リクエスト',
    response: 'レスポンス',
    language: '言語',
    languageSelector: '言語',
    searchMessages: 'メッセージを検索',
    searchResultsCount: '{count}件の結果が見つかりました',
    searchResults: 'ナレッジが見つかりました',
    moreResults: 'さらに{count}件の結果',
    noSearchResults: '一致するメッセージが見つかりません',
    messageContext: 'メッセージコンテキスト',
    loadingMessages: 'メッセージを読み込み中...',
    noMessagesFound: 'メッセージが見つかりません',
    user: 'ユーザー',
    assistant: 'アシスタント',
    tool: 'ツール',
    knowledgeRecorded: 'ナレッジが記録されました',
    memoryUpdated: 'メモリが更新されました',
    deepResearchMode: '徹底検索モード',
    deepResearchActive: '徹底検索中',
    cmdEnterToSend: '⌘ + Enter で送信'
  }
}

const cache = createIntlCache()

// Initialize with default locale - will be updated on component mount
let currentIntl = createIntl(
  {
    locale: 'en',
    messages: locale.en
  },
  cache
)

// Function to update the intl instance with a new locale
export function setRendererLocale(localeKey: SupportedLocales): IntlShape {
  const messages = locale[localeKey]
  currentIntl = createIntl(
    {
      locale: localeKey,
      messages
    },
    cache
  )
  return currentIntl
}

// Function to get the current intl instance
export function getIntl(): IntlShape {
  return currentIntl
}

// Hook to use intl in React components
export function useIntl(): IntlShape {
  // In a real implementation, this would be part of a React context
  // For now, we'll just return the current intl instance
  return getIntl()
}

// Initialize intl with system locale from IPC
export async function initializeLocale(): Promise<void> {
  try {
    // Ask main process for current locale
    const systemLocale = await window.api.getLocale()
    if (systemLocale && locale[systemLocale as SupportedLocales]) {
      setRendererLocale(systemLocale as SupportedLocales)
      console.log('Locale initialized to:', systemLocale)
    } else {
      // If backend locale is not enabled or not valid, use default locale
      console.warn('Backend locale not enabled or invalid, using default')
      const defaultLocale: SupportedLocales = 'en'
      await window.api.setLocale(defaultLocale)
      setRendererLocale(defaultLocale)
    }
  } catch (error) {
    console.error('Failed to initialize locale:', error)
    // Fallback to default locale on error
    setRendererLocale('en')
  }
}

// Switch locale and persist the change via IPC
export async function switchLocale(localeKey: SupportedLocales): Promise<void> {
  try {
    // Set locale in main process
    await window.api.setLocale(localeKey)

    // Update renderer locale
    setRendererLocale(localeKey)

    // Force refresh UI components
    document.dispatchEvent(new Event('localeChanged'))
  } catch (error) {
    console.error('Failed to switch locale:', error)
  }
}

export const localizeDate = (date: Date): string => {
  const currentLocale = currentIntl.locale
  return date?.toLocaleDateString(currentLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const localizeDateTime = (date: Date): string => {
  const currentLocale = currentIntl.locale

  // より洗練されたフォーマットオプション
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }

  // ロケールに応じたフォーマット
  try {
    // できるだけシステムのロケールに合わせたフォーマットを使用
    return new Intl.DateTimeFormat(currentLocale, options).format(date)
  } catch {
    // フォールバック：個別にフォーマットして結合
    const dateStr = date.toLocaleDateString(currentLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

    const timeStr = date.toLocaleTimeString(currentLocale, {
      hour: '2-digit',
      minute: '2-digit'
    })

    return `${dateStr} ${timeStr}`
  }
}
