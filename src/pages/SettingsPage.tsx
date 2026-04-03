import { Sun, Moon, Monitor, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'light', label: 'Claro', icon: <Sun size={18} />, desc: 'Fondo blanco, textos oscuros' },
  { value: 'dark', label: 'Oscuro', icon: <Moon size={18} />, desc: 'Fondo oscuro, textos claros' },
  { value: 'system', label: 'Sistema', icon: <Monitor size={18} />, desc: 'Sigue la configuración de tu dispositivo' },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-8">
          Configuración
        </h1>

        {/* Account section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-4">
            Cuenta
          </h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-4">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(user?.user_metadata?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 font-sans">
                  {user?.user_metadata?.full_name ?? 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-['IBM_Plex_Mono'] truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-sans"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </section>

        {/* Theme section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-4">
            Apariencia
          </h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {THEME_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`
                  w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 text-left transition-colors
                  ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}
                  ${theme === opt.value
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }
                `}
              >
                <span className={`flex-shrink-0 ${theme === opt.value ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                  {opt.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold font-sans ${theme === opt.value ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                    {opt.desc}
                  </p>
                </div>
                {/* Radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  theme === opt.value
                    ? 'border-red-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {theme === opt.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* About section */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-4">
            Acerca de
          </h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">Versión</span>
                <span className="text-sm text-slate-800 dark:text-slate-200 font-['IBM_Plex_Mono']">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">Metodología</span>
                <span className="text-sm text-slate-800 dark:text-slate-200 font-sans">Opportunity Solution Tree</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-sans">AI Model</span>
                <span className="text-sm text-slate-800 dark:text-slate-200 font-['IBM_Plex_Mono']">Claude Sonnet 4.6</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
