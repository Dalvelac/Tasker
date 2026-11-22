import { viewUrl } from '../app/routes'
import { useState } from 'react'
import { navigationGroups, type ViewId } from '../app/navigation'

type SidebarProps = {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [menu, setMenu] = useState(false)
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

      <button
        className="button mobile-menu"
        aria-expanded={menu}
        aria-controls="main-nav"
        onClick={() => setMenu(!menu)}
      >
        Menu
      </button>
      <nav id="main-nav" className={'sidebar__nav' + (menu ? ' is-open' : '')} aria-label="Main navigation">
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
                    <a
                      className={`sidebar__button ${activeView === item.id ? 'is-active' : ''}`}
                      key={item.id}
                      href={viewUrl(item.id)}
                      aria-current={activeView === item.id ? 'page' : undefined}
                      onClick={(event) => {
                        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
                          event.preventDefault()
                          setMenu(false)
                          onNavigate(item.id)
                        }
                      }}
                    >
                      <span className="sidebar__icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
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
