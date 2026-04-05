import { FolderOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useProjects } from '../hooks/use-projects'
import type { Project } from '../types'

interface ProjectSelectorProps {
  /** Label shown above the selector */
  sectionLabel: string
}

export function ProjectSelector({ sectionLabel }: ProjectSelectorProps) {
  const { user } = useAuth()
  const { setCurrentProject } = useProject()
  const { projects, loading } = useProjects(user?.id ?? '')

  const handleSelect = (project: Project) => {
    setCurrentProject(project)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <div className="text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando proyectos...</div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
          <FolderOpen size={20} className="text-slate-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-300 font-[Nunito_Sans] font-semibold text-sm mb-1">
          No tenés proyectos
        </p>
        <p className="text-slate-500 font-[Nunito_Sans] text-xs">
          Creá un proyecto desde la sección Proyectos para acceder a {sectionLabel}.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <FolderOpen size={20} className="text-red-400" />
      </div>
      <p className="text-slate-800 dark:text-slate-100 font-[Nunito_Sans] font-bold text-base mb-1">
        Selecciona un proyecto
      </p>
      <p className="text-slate-500 font-[Nunito_Sans] text-xs mb-6">
        para acceder a {sectionLabel}
      </p>

      <div className="w-full max-w-sm space-y-2">
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => handleSelect(project)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all group text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <FolderOpen size={14} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-[Nunito_Sans] truncate group-hover:text-red-400 transition-colors">
                {project.name}
              </p>
              {project.description && (
                <p className="text-xs text-slate-500 font-[Nunito_Sans] truncate">
                  {project.description}
                </p>
              )}
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:text-red-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
