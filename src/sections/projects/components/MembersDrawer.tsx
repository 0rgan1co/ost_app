import { useState, useEffect } from 'react'
import { X, Trash2, ChevronDown, UserPlus, Mail, Loader2, Check } from 'lucide-react'
import type { Project, ProjectRole, User } from '../../../types'

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

function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
      />
    )
  }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-red-500', 'bg-slate-500', 'bg-rose-500', 'bg-slate-600', 'bg-red-600']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={`w-8 h-8 ${colors[colorIdx]} rounded-full flex items-center justify-center text-white text-[11px] font-bold font-sans flex-shrink-0`}>
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
  const [inviteRole, setInviteRole] = useState<ProjectRole>('usuario')
  const [visible, setVisible] = useState(false)
  const [viewerEmail, setViewerEmail] = useState('')
  const [invitingViewer, setInvitingViewer] = useState(false)
  const [viewerInvited, setViewerInvited] = useState(false)

  useEffect(() => {
    if (project) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [project])

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

  if (!project) return null

  const isAdmin = project.currentUserRole === 'admin'
  const memberIds = new Set(project.members.map(m => m.id))
  const usersToAdd = availableUsers.filter(u => !memberIds.has(u.id))

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
          shadow-2xl
          flex flex-col
          transition-transform duration-250 ease-out
          ${visible ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-['IBM_Plex_Mono'] uppercase tracking-wider mb-0.5">Miembros</p>
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

        {/* Current members */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-3">
            Equipo ({project.members.length})
          </p>
          {project.members.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-3 py-2 group"
            >
              <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-sans truncate">
                  {member.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-['IBM_Plex_Mono'] truncate">
                  {member.email}
                </p>
              </div>

              {isAdmin ? (
                <div className="relative flex-shrink-0">
                  <select
                    value={member.role}
                    onChange={e => onChangeMemberRole(project.id, member.id, e.target.value as ProjectRole)}
                    className={`
                      appearance-none text-[11px] font-semibold px-2.5 py-1 pr-6 rounded-full cursor-pointer
                      font-['IBM_Plex_Mono'] border-0 focus:ring-1 focus:ring-red-400
                      ${roleBadge[member.role]}
                    `}
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              ) : (
                <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${roleBadge[member.role]}`}>
                  {roleLabels[member.role]}
                </span>
              )}

              {isAdmin && (
                <button
                  onClick={() => onRemoveMember(project.id, member.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          {/* Picklist: available users to add */}
          {isAdmin && usersToAdd.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-3">
                Agregar miembro
              </p>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Rol:</span>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as ProjectRole)}
                    className="appearance-none py-1 pl-2.5 pr-6 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-red-400 font-['IBM_Plex_Mono']"
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                {usersToAdd.map(user => (
                  <button
                    key={user.id}
                    onClick={() => onAddMember(project.id, user.id, inviteRole)}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/add"
                  >
                    <MemberAvatar name={user.name} avatarUrl={user.avatarUrl} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 font-sans truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-['IBM_Plex_Mono'] truncate">
                        {user.email}
                      </p>
                    </div>
                    <UserPlus size={14} className="text-slate-300 dark:text-slate-400 group-hover/add:text-red-500 dark:group-hover/add:text-red-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {isAdmin && usersToAdd.length === 0 && project.members.length > 0 && (
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 italic font-sans">
              Todos los usuarios disponibles ya son miembros.
            </p>
          )}

          {/* Invite viewer by email (no account needed) */}
          {isAdmin && onInviteViewer && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-3">
                Invitar viewer por email
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mb-2">
                No necesita tener cuenta en la app
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={viewerEmail}
                    onChange={e => { setViewerEmail(e.target.value); setViewerInvited(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && viewerEmail.trim()) {
                        handleInviteViewer()
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                  />
                </div>
                <button
                  onClick={handleInviteViewer}
                  disabled={!viewerEmail.trim() || invitingViewer}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {invitingViewer ? <Loader2 size={14} className="animate-spin" /> : viewerInvited ? <Check size={14} /> : <UserPlus size={14} />}
                </button>
              </div>
              {viewerInvited && (
                <p className="text-xs text-green-500 dark:text-green-400 mt-1 font-sans">
                  Viewer agregado correctamente
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
