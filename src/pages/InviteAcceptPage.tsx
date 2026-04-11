import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GitBranch, Clock, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { sendClaimNotification } from '../lib/email'

interface InviteData {
  id: string
  project_id: string
  token: string
  role: string
  expires_at: string | null
  claimed_by: string | null
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
  | 'approved'
  | 'unauthenticated'
  | 'already_claimed'
  | 'ready_to_claim'

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
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!token) {
      setPageState('not_found')
      return
    }

    async function fetchInvite() {
      const { data, error } = await supabase
        .from('project_invites')
        .select('id, project_id, token, role, expires_at, claimed_by, claimed_email, claimed_at, approved_at, rejected_at, project_name, created_by')
        .eq('token', token)
        .maybeSingle()

      if (error || !data) {
        setPageState('not_found')
        return
      }

      const now = new Date()
      const isExpired = data.expires_at ? new Date(data.expires_at) < now : false

      setInvite(data as InviteData)

      if (data.rejected_at) {
        setPageState('rejected')
        return
      }

      if (isExpired) {
        setPageState('expired')
        return
      }

      if (data.approved_at) {
        // Redirect to project tree
        navigate(`/projects/${data.project_id}/ost-tree`, { replace: true })
        return
      }

      if (!user) {
        setPageState('unauthenticated')
        return
      }

      if (data.claimed_by && data.claimed_by === user.id) {
        setPageState('already_claimed')
        return
      }

      setPageState('ready_to_claim')
    }

    fetchInvite()
  }, [token, user, authLoading, navigate])

  async function handleClaim() {
    if (!invite || !user) return
    setIsClaiming(true)
    setClaimError(null)

    const { error } = await supabase
      .from('project_invites')
      .update({
        claimed_by: user.id,
        claimed_email: user.email,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (error) {
      setClaimError('Hubo un error al enviar tu solicitud. Intentá de nuevo.')
      setIsClaiming(false)
      return
    }

    // Fire-and-forget: notify the admin that someone claimed the invite
    if (invite.created_by) {
      Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', invite.created_by)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle(),
      ]).then(([adminResult, claimantResult]) => {
        const adminProfile = adminResult.data
        const claimantProfile = claimantResult.data
        if (adminProfile?.email) {
          sendClaimNotification({
            adminEmail: adminProfile.email,
            adminName: adminProfile.full_name ?? adminProfile.email,
            claimantEmail: user.email ?? '',
            claimantName: claimantProfile?.full_name ?? user.email ?? '',
            projectName: invite.project_name ?? 'Proyecto',
            role: invite.role,
            inviteId: invite.id,
            token: invite.token,
          }).catch((err) => {
            console.error('Failed to send claim notification:', err)
          })
        }
      }).catch((err) => {
        console.error('Failed to fetch profiles for claim notification:', err)
      })
    }

    setPageState('already_claimed')
    setIsClaiming(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/ost_app/invite/${token}`,
      },
    })
  }

  if (authLoading || pageState === 'loading') {
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
              title="Invitación no encontrada"
              message="Este enlace de invitación no es válido o ya no existe."
            />
          )}

          {/* EXPIRED */}
          {pageState === 'expired' && (
            <ErrorState
              icon={<Clock size={32} className="text-amber-500" />}
              title="Invitación vencida"
              message={`Este enlace expiró${expiryLabel ? ` el ${expiryLabel}` : ''}. Pedile al administrador que genere uno nuevo.`}
            />
          )}

          {/* REJECTED */}
          {pageState === 'rejected' && (
            <ErrorState
              icon={<XCircle size={32} className="text-red-500" />}
              title="Invitación rechazada"
              message="Esta invitación fue rechazada por el administrador del proyecto."
            />
          )}

          {/* UNAUTHENTICATED — step 1: email input */}
          {pageState === 'unauthenticated' && !emailSubmitted && (
            <>
              <InviteHeader
                projectName={projectName}
                role={invite?.role ?? ''}
                expiryLabel={expiryLabel}
              />
              <p className="text-sm text-slate-400 leading-relaxed">
                Te invitaron a colaborar en este proyecto. Ingresá tu email para solicitar acceso.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 block">
                    Tu email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && recipientEmail.includes('@')) setEmailSubmitted(true)
                    }}
                    placeholder="nombre@gmail.com"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-sans"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 font-sans leading-relaxed">
                    Funciona con Gmail y cualquier dominio gestionado por Google Workspace (ej. tu@empresa.com).
                  </p>
                </div>
                <button
                  onClick={() => setEmailSubmitted(true)}
                  disabled={!recipientEmail.includes('@')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors font-sans"
                >
                  Continuar
                </button>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Como funciona</p>
                <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside font-sans leading-relaxed">
                  <li>Ingresás tu email y te logueás con Google</li>
                  <li>Tu solicitud queda pendiente de aprobación</li>
                  <li>El admin del proyecto la revisa y aprueba</li>
                  <li>Recibís un email de confirmación para acceder</li>
                </ol>
              </div>
            </>
          )}

          {/* UNAUTHENTICATED — step 2: google login */}
          {pageState === 'unauthenticated' && emailSubmitted && (
            <>
              <InviteHeader
                projectName={projectName}
                role={invite?.role ?? ''}
                expiryLabel={expiryLabel}
              />
              <p className="text-sm text-slate-400 leading-relaxed">
                Ingresá con tu cuenta de Google{' '}
                <span className="text-slate-300 font-medium">{recipientEmail}</span>{' '}
                para enviar tu solicitud.
              </p>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm rounded-xl transition-colors font-sans"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt=""
                  className="w-5 h-5"
                />
                Entrar con Google
              </button>
              <button
                onClick={() => setEmailSubmitted(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors font-sans"
              >
                Usar otro email
              </button>
            </>
          )}

          {/* READY TO CLAIM */}
          {pageState === 'ready_to_claim' && (
            <>
              <InviteHeader
                projectName={projectName}
                role={invite?.role ?? ''}
                expiryLabel={expiryLabel}
              />
              {claimError && (
                <p className="text-sm text-red-400">{claimError}</p>
              )}
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors font-sans"
              >
                {isClaiming && <Loader2 size={16} className="animate-spin" />}
                Solicitar acceso
              </button>
            </>
          )}

          {/* ALREADY CLAIMED / PENDING */}
          {pageState === 'already_claimed' && (
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
                    Tu acceso requiere <span className="text-slate-300 font-medium">aprobación del administrador</span>.
                    Cuando sea aprobado, vas a recibir un email de confirmación en tu cuenta de Gmail.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    Una vez aprobado, podés ingresar con tu cuenta de Google desde{' '}
                    <span className="text-slate-400 font-medium">OST App</span>.
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
        Invitación a <span className="text-red-400">{projectName}</span>
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
