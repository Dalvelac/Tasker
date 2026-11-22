import type { ReactNode } from 'react'
import type { ViewId } from '../app/navigation'
import { Sidebar } from './Sidebar'

type AppShellProps = {
  activeView: ViewId
  children: ReactNode
  onNavigate: (view: ViewId) => void
}

export function AppShell({ activeView, children, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to content
      </a>
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
