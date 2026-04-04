import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AppShell } from '../shell/components'
import type { NavigationItem } from '../shell/components'

const NAV_ITEMS: Omit<NavigationItem, 'isActive'>[] = [
  { label: 'OST Tree', href: '/ost-tree' },
  { label: 'Experimentos', href: '/experiments' },
  { label: 'Revisiones', href: '/reviews' },
  { label: 'Evaluar con IA', href: '/ai-evaluation' },
  { label: 'Business Context', href: '/business-context' },
  { label: 'Settings', href: '/settings' },
  { label: 'Help', href: '/help' },
]

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

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
      onNavigate={navigate}
      onLogout={handleLogout}
      onNavigateToProjects={() => navigate('/projects')}
    >
      {children}
    </AppShell>
  )
}
