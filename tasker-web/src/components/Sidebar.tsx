import { navigationItems, type ViewId } from '../app/navigation'

type SidebarProps = {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__mark">T</div>
        <div>
          <h1 className="sidebar__title">Tasker</h1>
          <p className="sidebar__subtitle">private planner</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            className={`sidebar__button ${activeView === item.id ? 'is-active' : ''}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
