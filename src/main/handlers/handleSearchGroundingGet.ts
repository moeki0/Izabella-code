import { store } from '../lib/store'

export const handleSearchGroundingGet = (): { enabled: boolean } => {
  const useSearchGrounding = store.get('useSearchGrounding') as boolean | undefined

  if (useSearchGrounding === undefined) {
    store.set('useSearchGrounding', true)
    return { enabled: true }
  }

  return { enabled: useSearchGrounding }
}
