import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronUp } from 'lucide-react'

interface UserMenuProps {
  user: { name: string; avatarUrl?: string }
  onLogout?: () => void
  collapsed?: boolean
}

export function UserMenu({ user, onLogout, collapsed = false }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 font-sans">
              {user.name}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-sans"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
        title={collapsed ? user.name : undefined}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold font-sans">{initials}</span>
          </div>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 font-sans truncate">
              {user.name}
            </span>
            <ChevronUp
              size={14}
              className={`text-slate-400 transition-transform ${open ? '' : 'rotate-180'}`}
            />
          </>
        )}
      </button>
    </div>
  )
}
