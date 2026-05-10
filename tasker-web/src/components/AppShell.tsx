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
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="app-main">{children}</main>
    </div>
  )
}
