import { google } from '@ai-sdk/google'
import { LanguageModel } from 'ai'

export const model = async (useSearchGrounding: boolean): Promise<LanguageModel> => {
  if (useSearchGrounding) {
    return google('gemini-2.5-flash-preview-05-20', {
      useSearchGrounding: useSearchGrounding
    })
  } else {
    return google('gemini-2.5-flash-preview-05-20')
  }
}
