import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('allowed_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => setAllowed(!!data))
  }, [user])

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  if (!user) return <Navigate to="/login" replace />
  if (allowed === null) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  if (!allowed) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-slate-900 dark:text-white font-semibold">Acceso restringido</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Tu cuenta no tiene acceso a esta aplicación.</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return <>{children}</>
}
