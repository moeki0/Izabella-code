import { createIntl, createIntlCache } from '@formatjs/intl'
import { locale } from './locale'

const cache = createIntlCache()
export const intl = createIntl(
  {
    locale: 'en',
    messages: locale.en
  },
  cache
)
