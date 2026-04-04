import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AppShell } from '../shell/components'
import type { NavigationItem } from '../shell/components'

// Project-scoped navigation items (relative paths within /projects/:projectId)
const PROJECT_NAV_ITEMS: { label: string; path: string }[] = [
  { label: 'OST Tree', path: 'ost-tree' },
  { label: 'Business Context', path: 'business-context' },
  { label: 'Settings', path: 'settings' },
]

// Top-level navigation items (always visible)
const GLOBAL_NAV_ITEMS: { label: string; href: string }[] = [
  { label: 'Help', href: '/help' },
]

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Build navigation items based on whether we're inside a project
  const navigationItems: NavigationItem[] = []

  if (projectId) {
    for (const item of PROJECT_NAV_ITEMS) {
      const href = `/projects/${projectId}/${item.path}`
      navigationItems.push({
        label: item.label,
        href,
        isActive: location.pathname.startsWith(href),
      })
    }
  }

  for (const item of GLOBAL_NAV_ITEMS) {
    navigationItems.push({
      ...item,
      isActive: location.pathname.startsWith(item.href),
    })
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={{
        name: user?.user_metadata?.full_name ?? user?.email ?? 'Usuario',
        avatarUrl: user?.user_metadata?.avatar_url,
      }}
      onNavigate={navigate}
      onLogout={handleLogout}
      onNavigateToProjects={() => navigate('/projects')}
    >
      {children}
    </AppShell>
  )
}
