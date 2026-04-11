import { useState, useRef, useEffect } from 'react'
import { GitBranch, Users, Clock, ChevronRight, Trash2, Globe, Lock, Pencil, Check, X, Plus, Tag, Share2, Copy, Mail } from 'lucide-react'
import type { Project, ProjectRole, ProjectTag } from '../../../types'

interface ProjectCardProps {
  project: Project
  onSelect: () => void
  onOpenMembers: () => void
  onDelete: () => void
  onToggleVisibility: (isPublic: boolean) => void
  onRename?: (name: string) => void
  onUpdateTags: (tags: ProjectTag[]) => void
  onGenerateInviteLink?: (role: ProjectRole) => Promise<string | null>
}

const roleConfig: Record<ProjectRole, { label: string; className: string; borderClass: string }> = {
  admin:   { label: 'Admin',   className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',     borderClass: 'border-red-400 dark:border-red-500' },
  usuario: { label: 'Usuario', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', borderClass: 'border-slate-400 dark:border-slate-500' },
  viewer:  { label: 'Viewer',  className: 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-400',  borderClass: 'border-slate-300 dark:border-slate-700' },
}

const TAG_COLORS = [
  { key: 'red',    bg: 'bg-red-100 dark:bg-red-500/15',    text: 'text-red-700 dark:text-red-300',    dot: 'bg-red-500' },
  { key: 'blue',   bg: 'bg-blue-100 dark:bg-blue-500/15',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  { key: 'green',  bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { key: 'amber',  bg: 'bg-amber-100 dark:bg-amber-500/15',  text: 'text-amber-700 dark:text-amber-300',  dot: 'bg-amber-500' },
  { key: 'purple', bg: 'bg-purple-100 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { key: 'pink',   bg: 'bg-pink-100 dark:bg-pink-500/15',   text: 'text-pink-700 dark:text-pink-300',   dot: 'bg-pink-500' },
  { key: 'cyan',   bg: 'bg-cyan-100 dark:bg-cyan-500/15',   text: 'text-cyan-700 dark:text-cyan-300',   dot: 'bg-cyan-500' },
  { key: 'slate',  bg: 'bg-slate-100 dark:bg-slate-700',    text: 'text-slate-700 dark:text-slate-300',  dot: 'bg-slate-500' },
]

function getTagStyle(colorKey: string) {
  return TAG_COLORS.find(c => c.key === colorKey) ?? TAG_COLORS[TAG_COLORS.length - 1]
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

function Avatar({ name, avatarUrl, size = 'sm' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'xs' }) {
  const sizeClass = size === 'xs' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-slate-900 flex-shrink-0`} />
  }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-red-500', 'bg-slate-500', 'bg-rose-500', 'bg-slate-600', 'bg-red-600']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={`${sizeClass} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold font-sans ring-2 ring-white dark:ring-slate-900 flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function ProjectCard({ project, onSelect, onOpenMembers, onDelete, onToggleVisibility, onRename, onUpdateTags, onGenerateInviteLink }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareRole, setShareRole] = useState<ProjectRole>('usuario')
  const [shareEmail, setShareEmail] = useState('')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const tagMenuRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const role = roleConfig[project.currentUserRole]
  const isAdmin = project.currentUserRole === 'admin'
  const visibleMembers = project.members.slice(0, 4)
  const extraCount = project.members.length - visibleMembers.length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setShowTagMenu(false)
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showTagMenu || showShareMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTagMenu, showShareMenu])

  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== project.name) {
      onRename?.(editName.trim())
    }
    setEditing(false)
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    const exists = project.tags.some(t => t.name.toLowerCase() === newTagName.trim().toLowerCase())
    if (exists) return
    onUpdateTags([...project.tags, { name: newTagName.trim(), color: newTagColor }])
    setNewTagName('')
  }

  const handleRemoveTag = (tagName: string) => {
    onUpdateTags(project.tags.filter(t => t.name !== tagName))
  }

  return (
    <div
      className={`
        group relative bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-800
        border-l-2 ${role.borderClass}
        rounded-xl overflow-hidden
        transition-all duration-200
        ${hovered ? 'shadow-lg shadow-slate-200/60 dark:shadow-slate-950/60 -translate-y-0.5' : 'shadow-sm'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-10 flex flex-col items-center justify-center gap-3 p-5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-center font-sans">
            Eliminar "{project.name}"?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-sans">
            Se eliminarán todos los datos del proyecto.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-sans"
            >
              Cancelar
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors font-sans"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Clickable main area */}
      <button
        className="w-full text-left p-5 pb-3 focus:outline-none"
        onClick={onSelect}
      >
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {editing ? (
            <div className="flex items-center gap-1 flex-1 pr-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditing(false) }}
                autoFocus
                className="flex-1 px-2 py-0.5 text-[15px] font-bold bg-slate-50 dark:bg-slate-800 border border-red-400 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
              />
              <button onClick={handleSaveRename} className="text-green-500 hover:text-green-400"><Check size={14} /></button>
              <button onClick={() => { setEditing(false); setEditName(project.name) }} className="text-slate-400 hover:text-slate-300"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pr-2 group/name">
              <h3 className="font-bold text-slate-900 dark:text-slate-50 text-[15px] leading-snug font-sans group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {project.name}
              </h3>
              {isAdmin && onRename && (
                <button
                  onClick={e => { e.stopPropagation(); setEditing(true); setEditName(project.name) }}
                  className="opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-red-400 transition-all"
                  title="Renombrar proyecto"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${
              project.isPublic
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {project.isPublic ? <Globe size={10} className="inline mr-1" /> : <Lock size={10} className="inline mr-1" />}
              {project.isPublic ? 'Público' : 'Privado'}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${role.className}`}>
              {role.label}
            </span>
          </div>
        </div>

        {/* Description */}
        {project.description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3 font-sans">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-3 font-sans">
            Sin descripción
          </p>
        )}

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3" onClick={e => e.stopPropagation()}>
            {project.tags.map(tag => {
              const style = getTagStyle(tag.color)
              return (
                <span
                  key={tag.name}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${style.bg} ${style.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {tag.name}
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveTag(tag.name)}
                      className="ml-0.5 hover:opacity-60 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-400 font-['IBM_Plex_Mono']">
          <span className="flex items-center gap-1.5">
            <GitBranch size={12} />
            {project.opportunityCount} oportunidades
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            {formatRelativeTime(project.lastActivityAt)}
          </span>
        </div>
      </button>

      {/* Bottom row: members + actions */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        {/* Stacked avatars */}
        <button
          className="flex items-center gap-2 group/members hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onOpenMembers() }}
          title="Gestionar miembros"
        >
          <div className="flex -space-x-1.5">
            {visibleMembers.map(member => (
              <Avatar key={member.id} name={member.name} avatarUrl={member.avatarUrl} size="xs" />
            ))}
          </div>
          {extraCount > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-400 font-['IBM_Plex_Mono']">
              +{extraCount}
            </span>
          )}
          <span className="text-[11px] text-slate-400 dark:text-slate-400 ml-1 group-hover/members:text-slate-600 dark:group-hover/members:text-slate-300 transition-colors font-sans">
            <Users size={12} className="inline" />
          </span>
        </button>

        <div className="flex items-center gap-1">
          {/* Tag button (admin only) */}
          {isAdmin && (
            <div className="relative" ref={tagMenuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTagMenu(!showTagMenu) }}
                title="Agregar tag"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <Tag size={13} />
              </button>

              {/* Tag popover */}
              {showTagMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-2">
                    Agregar tag
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="Nombre..."
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTag() }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!newTagName.trim()}
                      className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white rounded-md transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c.key}
                        onClick={() => setNewTagColor(c.key)}
                        className={`w-5 h-5 rounded-full ${c.dot} transition-all ${
                          newTagColor === c.key ? 'ring-2 ring-offset-1 ring-red-400 dark:ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Share invite link (admin only) */}
          {isAdmin && onGenerateInviteLink && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowShareMenu(true); setGeneratedLink(null); setShareCopied(false); setShareEmail('') }}
                title="Invitar al proyecto"
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-slate-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Share2 size={13} />
              </button>

              {showShareMenu && (
                <>
                  <div className="fixed inset-0 bg-black/50 z-50" onClick={(e) => { e.stopPropagation(); setShowShareMenu(false) }} />
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-5 space-y-4" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono']">
                    Invitar al proyecto
                  </p>

                  {/* Role selector */}
                  <div>
                    <label className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Rol</label>
                    <div className="flex gap-1.5">
                      {(['viewer', 'usuario', 'admin'] as ProjectRole[]).map(r => (
                        <button
                          key={r}
                          onClick={() => { setShareRole(r); setGeneratedLink(null) }}
                          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors font-['IBM_Plex_Mono'] ${
                            shareRole === r
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {roleConfig[r].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional email */}
                  <div>
                    <label className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                      Email del invitado <span className="text-slate-600 dark:text-slate-500">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={e => setShareEmail(e.target.value)}
                      placeholder="nombre@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                    />
                  </div>

                  {/* Generate button */}
                  {!generatedLink ? (
                    <button
                      onClick={async () => {
                        setShareLoading(true)
                        const link = await onGenerateInviteLink(shareRole)
                        setShareLoading(false)
                        if (link) setGeneratedLink(link)
                      }}
                      disabled={shareLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors font-sans"
                    >
                      {shareLoading ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Share2 size={12} />
                      )}
                      Generar link de invitación
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Generated link */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-2 py-1.5 text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-['IBM_Plex_Mono'] truncate"
                        />
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(generatedLink)
                            setShareCopied(true)
                            setTimeout(() => setShareCopied(false), 2000)
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                            shareCopied
                              ? 'bg-green-50 dark:bg-green-500/10 text-green-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          {shareCopied ? <Check size={11} /> : <Copy size={11} />}
                          {shareCopied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>

                      {/* Send by email if provided */}
                      {shareEmail && shareEmail.includes('@') && (
                        <button
                          onClick={() => {
                            const subject = encodeURIComponent(`Te invité a ${project.name} en OST App`)
                            const body = encodeURIComponent(`Hola!\n\nTe invité a colaborar en el proyecto "${project.name}" en OST App.\n\nUsá este link para aceptar:\n${generatedLink}\n\nEl link vence en 7 días.`)
                            window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`, '_blank')
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold rounded-lg transition-colors font-sans"
                        >
                          <Mail size={12} />
                          Enviar por email a {shareEmail.split('@')[0]}
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); setShowShareMenu(false) }}
                    className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors font-sans pt-1"
                  >
                    Cerrar
                  </button>
                </div>
              </>
              )}
            </>
          )}

          {/* Visibility toggle (admin only) */}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(!project.isPublic) }}
              title={project.isPublic ? 'Hacer privado' : 'Hacer público'}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              {project.isPublic ? <Globe size={13} /> : <Lock size={13} />}
            </button>
          )}

          {/* Delete button (admin only) */}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Eliminar proyecto"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
          )}

          {/* Navigate arrow */}
          <button
            onClick={onSelect}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors font-sans"
          >
            <span className="hidden sm:inline">Abrir</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
