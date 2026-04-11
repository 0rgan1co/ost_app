import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { GitBranch, Clock, Shield, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { sendClaimNotification } from '../lib/email'

interface InviteData {
  id: string
  project_id: string
  token: string
  role: string
  expires_at: string | null
  claimed_email: string | null
  claimed_at: string | null
  approved_at: string | null
  rejected_at: string | null
  project_name: string | null
  created_by: string | null
}

type PageState =
  | 'loading'
  | 'not_found'
  | 'expired'
  | 'rejected'
  | 'already_claimed'
  | 'form'
  | 'success'

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrador',
    usuario: 'Usuario',
    viewer: 'Solo lectura',
  }
  return map[role] ?? role
}

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  const date = new Date(expiresAt)
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [email, setEmail] = useState('')
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setPageState('not_found')
      return
    }

    async function fetchInvite() {
      const { data, error } = await supabase
        .from('project_invites')
        .select('id, project_id, token, role, expires_at, claimed_email, claimed_at, approved_at, rejected_at, project_name, created_by')
        .eq('token', token)
        .maybeSingle()

      if (error || !data) {
        setPageState('not_found')
        return
      }

      setInvite(data as InviteData)

      if (data.rejected_at) {
        setPageState('rejected')
      } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPageState('expired')
      } else if (data.approved_at) {
        setPageState('already_claimed') // reuse for "approved" message
      } else if (data.claimed_email) {
        setPageState('already_claimed')
      } else {
        setPageState('form')
      }
    }

    fetchInvite()
  }, [token])

  async function handleClaim() {
    if (!invite || !email.includes('@')) return
    setIsClaiming(true)
    setClaimError(null)

    const { error } = await supabase
      .from('project_invites')
      .update({
        claimed_email: email,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (error) {
      setClaimError('Hubo un error al enviar tu solicitud. Intentá de nuevo.')
      setIsClaiming(false)
      return
    }

    // Fire-and-forget: notify the admin
    if (invite.created_by) {
      Promise.resolve(
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', invite.created_by)
          .maybeSingle()
      ).then(({ data: adminProfile }) => {
        if (adminProfile?.email) {
          sendClaimNotification({
            adminEmail: adminProfile.email,
            adminName: adminProfile.full_name ?? adminProfile.email,
            claimantEmail: email,
            claimantName: email.split('@')[0],
            projectName: invite.project_name ?? 'Proyecto',
            role: invite.role,
            inviteId: invite.id,
            token: invite.token,
          }).catch((err: unknown) => console.error('Failed to send claim notification:', err))
        }
      }).catch((err: unknown) => console.error('Failed to fetch admin profile:', err))
    }

    setPageState('success')
    setIsClaiming(false)
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={32} className="text-red-500 animate-spin" />
      </div>
    )
  }

  const projectName = invite?.project_name ?? 'Proyecto'
  const expiryLabel = invite ? formatExpiry(invite.expires_at) : null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo header */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <GitBranch size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-sans">OST App</h1>
            <p className="text-xs text-slate-400 font-mono">Product discovery</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          {/* NOT FOUND */}
          {pageState === 'not_found' && (
            <ErrorState
              icon={<XCircle size={32} className="text-red-500" />}
              title="Invitacion no encontrada"
              message="Este enlace de invitacion no es valido o ya no existe."
            />
          )}

          {/* EXPIRED */}
          {pageState === 'expired' && (
            <ErrorState
              icon={<Clock size={32} className="text-amber-500" />}
              title="Invitacion vencida"
              message={`Este enlace expiro${expiryLabel ? ` el ${expiryLabel}` : ''}. Pedile al administrador que genere uno nuevo.`}
            />
          )}

          {/* REJECTED */}
          {pageState === 'rejected' && (
            <ErrorState
              icon={<XCircle size={32} className="text-red-500" />}
              title="Invitacion rechazada"
              message="Esta invitacion fue rechazada por el administrador del proyecto."
            />
          )}

          {/* ALREADY CLAIMED */}
          {pageState === 'already_claimed' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center">
                  {invite?.approved_at
                    ? <CheckCircle size={28} className="text-green-400" />
                    : <Clock size={28} className="text-amber-400" />
                  }
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-sans">
                  {invite?.approved_at ? 'Acceso aprobado' : 'Solicitud pendiente'}
                </h2>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {invite?.approved_at
                    ? `Tu acceso a ${projectName} fue aprobado. Ingresa con tu cuenta de Google desde OST App.`
                    : `Ya se envio una solicitud para ${invite?.claimed_email ?? 'este email'}. El administrador la esta revisando.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* FORM — email input + submit */}
          {pageState === 'form' && (
            <>
              <InviteHeader
                projectName={projectName}
                role={invite?.role ?? ''}
                expiryLabel={expiryLabel}
              />
              <p className="text-sm text-slate-400 leading-relaxed">
                Te invitaron a colaborar en este proyecto. Ingresa tu email para solicitar acceso.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 block">
                    Tu email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && email.includes('@')) handleClaim()
                    }}
                    placeholder="nombre@gmail.com"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-sans"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 font-sans leading-relaxed">
                    Funciona con Gmail y cualquier dominio gestionado por Google Workspace (ej. tu@empresa.com).
                  </p>
                </div>
                {claimError && (
                  <p className="text-xs text-red-400">{claimError}</p>
                )}
                <button
                  onClick={handleClaim}
                  disabled={!email.includes('@') || isClaiming}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors font-sans"
                >
                  {isClaiming ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Solicitar acceso
                </button>
              </div>
            </>
          )}

          {/* SUCCESS */}
          {pageState === 'success' && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-400" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-sans">Solicitud enviada</h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Tu solicitud para unirte a{' '}
                  <span className="text-white font-semibold">{projectName}</span>{' '}
                  fue enviada al administrador del proyecto.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl px-4 py-4 space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Tu acceso requiere <span className="text-slate-300 font-medium">aprobacion del administrador</span>.
                    Cuando sea aprobado, vas a poder ingresar con tu cuenta de Google.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    Email registrado: <span className="text-slate-400 font-medium">{email}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Sub-components ---

function InviteHeader({
  projectName,
  role,
  expiryLabel,
}: {
  projectName: string
  role: string
  expiryLabel: string | null
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-white font-sans">
        Invitacion a <span className="text-red-400">{projectName}</span>
      </h2>
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Proyecto</span>
          <span className="text-sm font-semibold text-white font-sans">{projectName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Rol</span>
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
            {roleLabel(role)}
          </span>
        </div>
        {expiryLabel && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-wide">Vence</span>
            <span className="text-xs text-slate-400 font-mono">{expiryLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-white font-sans">{title}</h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
