import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { supabase } from '../lib/supabase'
import { AppShell } from '../shell/components'
import type { NavigationItem } from '../shell/components'
import { useTopExperiments } from '../hooks/use-top-experiments'

const NAV_ITEMS: Omit<NavigationItem, 'isActive'>[] = [
  { label: 'OST Tree', href: '/ost-tree' },
  { label: 'Business Context', href: '/business-context' },
  { label: 'Settings', href: '/settings' },
  { label: 'Help', href: '/help' },
]

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { currentProject } = useProject()
  const { experiments } = useTopExperiments(currentProject?.id)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navigationItems: NavigationItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    isActive: location.pathname.startsWith(item.href),
  }))

  return (
    <AppShell
      navigationItems={navigationItems}
      user={{
        name: user?.user_metadata?.full_name ?? user?.email ?? 'Usuario',
        avatarUrl: user?.user_metadata?.avatar_url,
      }}
      topExperiments={experiments}
      onNavigate={navigate}
      onLogout={handleLogout}
      onNavigateToProjects={() => navigate('/projects')}
    >
      {children}
    </AppShell>
  )
}
