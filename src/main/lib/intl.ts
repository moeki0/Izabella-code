import { createIntl, createIntlCache } from '@formatjs/intl'
import { locale } from './locale'

const cache = createIntlCache()
export const intl = createIntl(
  {
    locale: 'ja',
    messages: locale.ja
  },
  cache
)
