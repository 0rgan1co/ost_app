import { useState } from 'react'
import { Menu, X, GitBranch, FolderOpen, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import { useTheme } from '../../contexts/ThemeContext'

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
}

interface AppShellProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
  user?: { name: string; avatarUrl?: string }
  onNavigate?: (href: string) => void
  onLogout?: () => void
  onNavigateToProjects?: () => void
}

export function AppShell({
  children,
  navigationItems,
  user = { name: 'Alex Morgan' },
  onNavigate,
  onLogout,
  onNavigateToProjects,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { resolved, setTheme } = useTheme()

  const toggleTheme = () => setTheme(resolved === 'dark' ? 'light' : 'dark')

  const expanded = !collapsed

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans">

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ──
          mobile:  oculta, aparece como drawer
          md+:     static, colapsable via toggle
      ── */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${mobileOpen ? 'w-64 max-w-[80vw]' : '-translate-x-full md:translate-x-0'}
          ${expanded ? 'md:w-56' : 'md:w-16'}
          flex flex-col flex-shrink-0
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          transition-all duration-200
        `}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center h-14 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={() => { onNavigateToProjects?.(); setMobileOpen(false) }}
            title="Ver todos los proyectos"
            className={`flex items-center gap-2.5 px-4 flex-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors h-full min-w-0 ${!expanded ? 'md:justify-center md:px-0' : ''}`}
          >
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <GitBranch size={14} className="text-white" />
            </div>
            {expanded && (
              <span className="font-bold text-slate-900 dark:text-slate-50 text-sm tracking-tight whitespace-nowrap hidden md:inline">
                OST App
              </span>
            )}
          </button>
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={expanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
            className="hidden md:flex items-center justify-center w-8 h-8 mr-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex-shrink-0"
          >
            {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          {/* Mobile close */}
          <button
            className="mr-3 md:hidden text-slate-400 hover:text-slate-600 flex-shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* "Todos los proyectos" */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => { onNavigateToProjects?.(); setMobileOpen(false) }}
            title="Todos los proyectos"
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-colors ${!expanded ? 'md:justify-center md:px-0' : ''}`}
          >
            <FolderOpen size={15} className="flex-shrink-0" />
            {expanded && <span className="hidden md:inline">Todos los proyectos</span>}
          </button>
          <div className="mt-2 border-t border-slate-100 dark:border-slate-800" />
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <MainNav
            items={navigationItems}
            onNavigate={(href) => {
              onNavigate?.(href)
              setMobileOpen(false)
            }}
            collapsed={!expanded}
          />
        </div>

        {/* Theme toggle + User menu */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-1">
          <button
            onClick={toggleTheme}
            title={resolved === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold font-sans text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all ${!expanded ? 'md:justify-center' : ''}`}
          >
            {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {expanded && <span className="hidden md:inline">{resolved === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
          </button>
          <UserMenu user={user} onLogout={onLogout} collapsed={!expanded} />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header (solo en sm, oculto en md+) */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={onNavigateToProjects}
            className="flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center">
              <GitBranch size={12} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-50 text-sm">OST App</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
