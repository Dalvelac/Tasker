import { useState } from 'react'
import { navigationGroups, type ViewId } from '../app/navigation'

type SidebarProps = {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigationGroups.map((group) => [group.id, true])),
  )

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }))
  }

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
        {navigationGroups.map((group) => {
          const isOpen = openGroups[group.id]
          const hasActiveItem = group.items.some((item) => item.id === activeView)

          return (
            <section className="sidebar__group" key={group.id}>
              <button
                aria-expanded={isOpen}
                className={`sidebar__group-toggle ${hasActiveItem ? 'has-active' : ''}`}
                onClick={() => toggleGroup(group.id)}
                type="button"
              >
                <span>{group.label}</span>
                <span className="sidebar__chevron">{isOpen ? 'v' : '>'}</span>
              </button>

              {isOpen && (
                <div className="sidebar__group-items">
                  {group.items.map((item) => (
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
                </div>
              )}
            </section>
          )
        })}
      </nav>
    </aside>
  )
}
