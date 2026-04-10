import { useState, useEffect } from 'react'
import { X, Check, Mail, Loader2, UserPlus, ChevronDown, Link, Copy, Clock } from 'lucide-react'
import type { Project, ProjectRole, User } from '../../../types'
import { useInvites } from '../../../hooks/use-invites'

interface MembersDrawerProps {
  project: Project | null
  availableUsers: User[]
  roleOptions: ProjectRole[]
  onClose: () => void
  onAddMember: (projectId: string, userId: string, role: ProjectRole) => void
  onInviteViewer?: (projectId: string, email: string) => Promise<boolean>
  onChangeMemberRole: (projectId: string, memberId: string, role: ProjectRole) => void
  onRemoveMember: (projectId: string, memberId: string) => void
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

const roleLabels: Record<ProjectRole, string> = {
  admin: 'Admin',
  usuario: 'Usuario',
  viewer: 'Viewer',
}

const roleBadge: Record<ProjectRole, string> = {
  admin:   'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  usuario: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  viewer:  'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-400',
}

function Avatar({ name, avatarUrl, size = 'md' }: { name: string; avatarUrl?: string | null; size?: 'md' | 'sm' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-[11px]'
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full flex-shrink-0 object-cover`} />
  }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-red-500', 'bg-slate-500', 'bg-rose-500', 'bg-slate-600', 'bg-red-600']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={`${sizeClass} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold font-sans flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function MembersDrawer({
  project,
  availableUsers,
  roleOptions,
  onClose,
  onAddMember,
  onInviteViewer,
  onChangeMemberRole,
  onRemoveMember,
}: MembersDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [viewerEmail, setViewerEmail] = useState('')
  const [invitingViewer, setInvitingViewer] = useState(false)
  const [viewerInvited, setViewerInvited] = useState(false)

  // Invite link state
  const [inviteLinkRole, setInviteLinkRole] = useState<ProjectRole>('viewer')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const { pendingClaims, generateInviteLink, approveClaim, rejectClaim } = useInvites(project?.id)

  useEffect(() => {
    if (project) setVisible(true)
    else setVisible(false)
  }, [project])

  // Reset generated link when project changes
  useEffect(() => {
    setGeneratedLink(null)
    setLinkCopied(false)
  }, [project?.id])

  const handleInviteViewer = async () => {
    if (!project || !viewerEmail.trim() || !onInviteViewer || invitingViewer) return
    setInvitingViewer(true)
    const ok = await onInviteViewer(project.id, viewerEmail.trim())
    setInvitingViewer(false)
    if (ok) {
      setViewerInvited(true)
      setViewerEmail('')
    }
  }

  const handleGenerateLink = async () => {
    if (generatingLink) return
    setGeneratingLink(true)
    setGeneratedLink(null)
    const url = await generateInviteLink(inviteLinkRole)
    setGeneratingLink(false)
    if (url) setGeneratedLink(url)
  }

  const handleCopyLink = async () => {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (!project) return null

  const isAdmin = project.currentUserRole === 'admin'
  const memberIds = new Set(project.members.map(m => m.id))

  // Unified list: all known users, with "isMember" flag
  const allUsers = [
    ...project.members.map(m => ({ ...m, isMember: true })),
    ...availableUsers
      .filter(u => !memberIds.has(u.id))
      .map(u => ({ ...u, role: 'usuario' as ProjectRole, isMember: false })),
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full w-full sm:w-96 z-50
          bg-white dark:bg-slate-900
          border-l border-slate-200 dark:border-slate-800
          shadow-2xl flex flex-col
          transition-transform duration-250 ease-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-['IBM_Plex_Mono'] uppercase tracking-wider mb-0.5">Miembros</p>
            <h3 className="font-bold text-slate-900 dark:text-slate-50 text-sm font-sans truncate max-w-[220px]">
              {project.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Unified user list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-0.5">
            {allUsers.map(user => {
              const isMember = user.isMember

              return (
                <div
                  key={user.id}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
                    ${isMember
                      ? 'bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10'
                      : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }
                  `}
                >
                  {/* Toggle checkbox — click to add/remove */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (isMember) {
                          onRemoveMember(project.id, user.id)
                        } else {
                          onAddMember(project.id, user.id, 'usuario')
                        }
                      }}
                      className={`
                        w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all
                        ${isMember
                          ? 'bg-red-500 text-white'
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-500'
                        }
                      `}
                    >
                      {isMember && <Check size={12} strokeWidth={3} />}
                    </button>
                  )}

                  {/* Avatar */}
                  <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />

                  {/* Name & email */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold font-sans truncate ${isMember ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}`}>
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-['IBM_Plex_Mono'] truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Role selector (only for current members, admin only) */}
                  {isMember && isAdmin && (
                    <div className="relative flex-shrink-0">
                      <select
                        value={user.role}
                        onChange={e => onChangeMemberRole(project.id, user.id, e.target.value as ProjectRole)}
                        className={`
                          appearance-none text-[10px] font-semibold px-2 py-0.5 pr-5 rounded-full cursor-pointer
                          font-['IBM_Plex_Mono'] border-0 focus:ring-1 focus:ring-red-400
                          ${roleBadge[user.role]}
                        `}
                      >
                        {roleOptions.map(r => (
                          <option key={r} value={r}>{roleLabels[r]}</option>
                        ))}
                      </select>
                      <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                  )}

                  {/* Role badge (non-admin view) */}
                  {isMember && !isAdmin && (
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${roleBadge[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Invite viewer by email */}
          {isAdmin && onInviteViewer && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 font-sans mb-2 px-1">
                Invitar por email (viewer, sin cuenta)
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={viewerEmail}
                    onChange={e => { setViewerEmail(e.target.value); setViewerInvited(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleInviteViewer() }}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                  />
                </div>
                <button
                  onClick={handleInviteViewer}
                  disabled={!viewerEmail.trim() || invitingViewer}
                  className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  {invitingViewer ? <Loader2 size={14} className="animate-spin" /> : viewerInvited ? <Check size={14} /> : <UserPlus size={14} />}
                </button>
              </div>
              {viewerInvited && (
                <p className="text-xs text-green-500 mt-1 px-1 font-sans">Agregado</p>
              )}
            </div>
          )}

          {/* Generate invite link */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Link size={13} className="text-slate-400 flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans font-medium">
                    Generar link de invitación
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* Role select */}
                  <div className="relative flex-shrink-0">
                    <select
                      value={inviteLinkRole}
                      onChange={e => {
                        setInviteLinkRole(e.target.value as ProjectRole)
                        setGeneratedLink(null)
                      }}
                      className="appearance-none text-[10px] font-semibold pl-2 pr-6 py-1.5 rounded-lg cursor-pointer font-['IBM_Plex_Mono'] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-400"
                    >
                      {roleOptions.map(r => (
                        <option key={r} value={r}>{roleLabels[r]}</option>
                      ))}
                    </select>
                    <ChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateLink}
                    disabled={generatingLink}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-sans bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    {generatingLink
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Link size={12} />
                    }
                    Generar link
                  </button>
                </div>

                {/* Generated link display */}
                {generatedLink && (
                  <div className="mt-2.5 flex gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-['IBM_Plex_Mono'] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none truncate"
                      onFocus={e => e.target.select()}
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                        linkCopied
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:border-red-400 hover:text-red-500'
                      }`}
                      title={linkCopied ? 'Copiado!' : 'Copiar link'}
                    >
                      {linkCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
                {linkCopied && (
                  <p className="text-[10px] text-green-500 mt-1 font-sans">Copiado!</p>
                )}
              </div>
            </div>
          )}

          {/* Pending claims */}
          {isAdmin && pendingClaims.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2 px-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans font-medium">
                  Solicitudes pendientes
                </p>
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold font-['IBM_Plex_Mono'] bg-red-500 text-white rounded-full">
                  {pendingClaims.length}
                </span>
              </div>

              <div className="space-y-2">
                {pendingClaims.map(claim => (
                  <div
                    key={claim.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/15"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold font-sans text-slate-800 dark:text-slate-100 truncate">
                        {claim.claimedEmail}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${roleBadge[claim.role]}`}>
                          {roleLabels[claim.role]}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-['IBM_Plex_Mono']">
                          <Clock size={9} />
                          {formatRelativeTime(claim.claimedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Approve */}
                    <button
                      onClick={() => approveClaim(claim.id)}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
                      title="Aprobar"
                    >
                      <Check size={13} strokeWidth={2.5} />
                    </button>

                    {/* Reject */}
                    <button
                      onClick={() => rejectClaim(claim.id)}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Rechazar"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
