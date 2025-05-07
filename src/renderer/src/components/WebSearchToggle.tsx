import { useEffect, useState } from 'react'

export function HugeiconsInternet(): React.JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
      {/* Icon from Huge Icons by Hugeicons - undefined */}
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        color="currentColor"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <ellipse cx="12" cy="12" rx="4" ry="10"></ellipse>
        <path d="M2 12h20"></path>
      </g>
    </svg>
  )
}

export function WebSearchToggle(): React.JSX.Element {
  const [useSearchGrounding, setUseSearchGrounding] = useState(true)

  useEffect(() => {
    window.api.getConfig('useSearchGrounding').then((value) => {
      setUseSearchGrounding(value !== false)
    })
  }, [])

  const toggleWebSearch = (): void => {
    setUseSearchGrounding(!useSearchGrounding)
    window.api.setConfig('useSearchGrounding', !useSearchGrounding)
  }

  return (
    <div
      className={`web-search-control ${useSearchGrounding ? 'web-search-control-on' : ''}`}
      onClick={toggleWebSearch}
    >
      <HugeiconsInternet />
    </div>
  )
}
