import { createIntl, createIntlCache } from '@formatjs/intl'
import { app } from 'electron'
import { locale } from './locale'

const getSupportedLocale = (requestedLocale: string): keyof typeof locale => {
  const supportedLocales = Object.keys(locale) as Array<keyof typeof locale>

  // Check for exact match
  if (supportedLocales.includes(requestedLocale as keyof typeof locale)) {
    return requestedLocale as keyof typeof locale
  }

  // Check for language match (first 2 characters)
  const requestedLanguage = requestedLocale.substring(0, 2)
  const matchingLocale = supportedLocales.find(
    (loc) => loc.substring(0, 2) === requestedLanguage
  )

  return matchingLocale || 'en'
}

const getSystemLocale = (): keyof typeof locale => {
  try {
    // Get system locale from Electron
    const systemLocale = app.getLocale()
    return getSupportedLocale(systemLocale)
  } catch (error) {
    console.error('Failed to detect system locale:', error)
    return 'en'
  }
}

// Initialize with system locale first for safety
const initialLocale = getSystemLocale()

const cache = createIntlCache()
export const intl = createIntl(
  {
    locale: initialLocale,
    messages: locale[initialLocale]
  },
  cache
)

// Helper to get stored locale preference or use system locale
export const getPreferredLocale = (): keyof typeof locale => {
  try {
    const fs = require('fs')
    const path = require('path')
    
    const userDataPath = app.getPath('userData')
    const localeFilePath = path.join(userDataPath, 'locale-preference.json')
    
    if (fs.existsSync(localeFilePath)) {
      const data = JSON.parse(fs.readFileSync(localeFilePath, 'utf8'))
      if (data && data.locale && locale[data.locale as keyof typeof locale]) {
        return data.locale as keyof typeof locale
      }
    }
  } catch (error) {
    console.error('Failed to get locale preference:', error)
  }
  
  // Fall back to system locale if no preference found
  return getSystemLocale()
}

// After initialization, try to update with user preference if available
setTimeout(() => {
  try {
    const preferredLocale = getPreferredLocale()
    if (preferredLocale && preferredLocale !== intl.locale) {
      setLocale(preferredLocale)
    }
  } catch (error) {
    console.error('Error loading preferred locale:', error)
  }
}, 0)

export const setLocale = (localeKey: keyof typeof locale): void => {
  const messages = locale[localeKey]
  Object.assign(intl, { locale: localeKey, messages })

  // Store the selected locale in user preferences
  try {
    const fs = require('fs')
    const path = require('path')
    
    const userDataPath = app.getPath('userData')
    const localeFilePath = path.join(userDataPath, 'locale-preference.json')
    fs.writeFileSync(localeFilePath, JSON.stringify({ locale: localeKey }), 'utf8')
  } catch (error) {
    console.error('Failed to save locale preference:', error)
  }
}

export const getLocale = (): keyof typeof locale => {
  return intl.locale as keyof typeof locale
}