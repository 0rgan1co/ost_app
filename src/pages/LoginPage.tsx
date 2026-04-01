import { GitBranch } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/projects` },
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <GitBranch size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">OST App</h1>
            <p className="text-xs text-slate-400">Product discovery</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Gestiona tu Opportunity Solution Tree con evaluación IA y colaboración en tiempo real.
        </p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            className="w-5 h-5"
          />
          Continuar con Google
        </button>
      </div>
    </div>
  )
}
