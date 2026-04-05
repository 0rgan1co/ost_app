import { useState } from 'react'
import { GitBranch, Users, Clock, ChevronRight, Trash2, Globe, Lock } from 'lucide-react'
import type { Project, ProjectRole } from '../../../types'

interface ProjectCardProps {
  project: Project
  onSelect: () => void
  onOpenMembers: () => void
  onDelete: () => void
  onToggleVisibility: (isPublic: boolean) => void
}

const roleConfig: Record<ProjectRole, { label: string; className: string; borderClass: string }> = {
  admin:   { label: 'Admin',   className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',     borderClass: 'border-red-400 dark:border-red-500' },
  usuario: { label: 'Usuario', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', borderClass: 'border-slate-400 dark:border-slate-500' },
  viewer:  { label: 'Viewer',  className: 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-400',  borderClass: 'border-slate-300 dark:border-slate-700' },
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

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'xs' }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const sizeClass = size === 'xs' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'
  const colors = ['bg-red-500', 'bg-slate-500', 'bg-rose-500', 'bg-slate-600', 'bg-red-600']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className={`${sizeClass} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold font-sans ring-2 ring-white dark:ring-slate-900 flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function ProjectCard({ project, onSelect, onOpenMembers, onDelete, onToggleVisibility }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const role = roleConfig[project.currentUserRole]
  const isAdmin = project.currentUserRole === 'admin'
  const visibleMembers = project.members.slice(0, 4)
  const extraCount = project.members.length - visibleMembers.length

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
        className="w-full text-left p-5 pb-4 focus:outline-none"
        onClick={onSelect}
      >
        {/* Top row: name + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-50 text-[15px] leading-snug font-sans group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors pr-2">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Visibility badge */}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${
              project.isPublic
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {project.isPublic ? <Globe size={10} className="inline mr-1" /> : <Lock size={10} className="inline mr-1" />}
              {project.isPublic ? 'Público' : 'Privado'}
            </span>
            {/* Role badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${role.className}`}>
              {role.label}
            </span>
          </div>
        </div>

        {/* Description */}
        {project.description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4 font-sans">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-4 font-sans">
            Sin descripción
          </p>
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
      <div className="px-5 pb-4 flex items-center justify-between">
        {/* Stacked avatars */}
        <button
          className="flex items-center gap-2 group/members hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onOpenMembers() }}
          title="Gestionar miembros"
        >
          <div className="flex -space-x-1.5">
            {visibleMembers.map(member => (
              <Avatar key={member.id} name={member.name} size="xs" />
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
