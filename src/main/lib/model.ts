import { google } from '@ai-sdk/google'
import { LanguageModel } from 'ai'

export const model = async (useSearchGrounding: boolean): Promise<LanguageModel> => {
  if (useSearchGrounding) {
    return google('gemini-2.5-flash', {
      useSearchGrounding: true
    })
  } else {
    return google('gemini-2.5-flash')
  }
}
