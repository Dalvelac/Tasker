import { useEffect, useState, type MouseEvent } from 'react'
import { navigationItems, type ViewId } from './navigation'

export function viewUrl(view: ViewId, params: Record<string, string | number | null> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) query.set(key, String(value))
  }
  return '#/' + view + (query.size ? '?' + query : '')
}
function readRoute(hash: string) {
  const [path, search] = hash.replace(/^#\/?/, '').split('?')
  return {
    view: navigationItems.find((item) => item.id === path)?.id ?? ('dashboard' as ViewId),
    params: new URLSearchParams(search),
  }
}

export type NavigationIntent = { proceed: () => void; cancel: () => void }
export function beforeNavigation(proceed: () => void, cancel = () => {}) {
  const event = new CustomEvent('tasker:before-navigation', { cancelable: true, detail: { proceed, cancel } })
  if (window.dispatchEvent(event)) proceed()
}
export function navigate(hash: string, replace = false) {
  if (hash !== location.hash) beforeNavigation(() => commitRoute(hash, replace))
}
export function commitRoute(hash: string, replace = false) {
  const index = history.state?.taskerIndex ?? 0
  if (replace) history.replaceState({ ...history.state, taskerIndex: index }, '', hash)
  else history.pushState({ taskerIndex: index + 1 }, '', hash)
  window.dispatchEvent(new Event('tasker:route'))
}
export function useRoute() {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    let index = history.state?.taskerIndex ?? 0
    let currentHash = location.hash
    history.replaceState({ ...history.state, taskerIndex: index }, '')
    function accept() {
      index = history.state.taskerIndex
      currentHash = location.hash
      setHash(currentHash)
    }
    function traverse() {
      // A manually entered hash also makes a same-document history entry.
      if (history.state?.taskerIndex == null) history.replaceState({ taskerIndex: index + 1 }, '')
      const delta = history.state.taskerIndex - index
      if (!delta && location.hash === currentHash) return
      beforeNavigation(accept, () => {
        if (delta) history.go(-delta)
      })
    }
    window.addEventListener('tasker:route', accept)
    window.addEventListener('popstate', traverse)
    return () => {
      window.removeEventListener('tasker:route', accept)
      window.removeEventListener('popstate', traverse)
    }
  }, [])
  return readRoute(hash)
}
export function followLink(event: MouseEvent<HTMLAnchorElement>, hash: string) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    navigate(hash)
  }
}
