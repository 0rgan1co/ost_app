import { useState } from 'react'
import { GitBranch, Users, Clock, ChevronRight } from 'lucide-react'
import type { Project, ProjectRole } from '../../../types'

interface ProjectCardProps {
  project: Project
  onSelect: () => void
  onOpenMembers: () => void
}

const roleConfig: Record<ProjectRole, { label: string; className: string; borderClass: string }> = {
  admin:   { label: 'Admin',   className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',     borderClass: 'border-red-400 dark:border-red-500' },
  usuario: { label: 'Usuario', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', borderClass: 'border-slate-400 dark:border-slate-500' },
  viewer:  { label: 'Viewer',  className: 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500',  borderClass: 'border-slate-300 dark:border-slate-700' },
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

export function ProjectCard({ project, onSelect, onOpenMembers }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const role = roleConfig[project.currentUserRole]
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
      onMouseLeave={() => setHovered(false)}
    >
      {/* Clickable main area */}
      <button
        className="w-full text-left p-5 pb-4 focus:outline-none"
        onClick={onSelect}
      >
        {/* Top row: name + role badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-50 text-[15px] leading-snug font-sans group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors pr-2">
            {project.name}
          </h3>
          <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full font-['IBM_Plex_Mono'] ${role.className}`}>
            {role.label}
          </span>
        </div>

        {/* Description */}
        {project.description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-4 font-sans">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-slate-300 dark:text-slate-600 italic mb-4 font-sans">
            Sin descripción
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 font-['IBM_Plex_Mono']">
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

      {/* Bottom row: members + open arrow */}
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
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-['IBM_Plex_Mono']">
              +{extraCount}
            </span>
          )}
          <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1 group-hover/members:text-slate-600 dark:group-hover/members:text-slate-300 transition-colors font-sans">
            <Users size={12} className="inline" />
          </span>
        </button>

        {/* Navigate arrow */}
        <button
          onClick={onSelect}
          className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors font-sans"
        >
          <span className="hidden sm:inline">Abrir</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
