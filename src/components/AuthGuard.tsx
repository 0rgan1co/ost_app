import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-slate-950" />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
