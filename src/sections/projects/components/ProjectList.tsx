import { useState } from 'react'
import { Plus, GitBranch, X, Check } from 'lucide-react'
import type { ProjectsProps, Project } from '../../../types'
import { ProjectCard } from './ProjectCard'
import { MembersDrawer } from './MembersDrawer'
import { OSTWizardModal } from './OSTWizardModal'

export function ProjectList({
  currentUser,
  projects,
  roleOptions,
  availableUsers,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onToggleVisibility,
  onAddMember,
  onInviteViewer,
  onChangeMemberRole,
  onRemoveMember,
}: ProjectsProps) {
  const myProjects = projects.filter(p => p.currentUserRole === 'admin')
  const sharedProjects = projects.filter(p => p.currentUserRole !== 'admin')
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [wizardProject, setWizardProject] = useState<{ id: string; name: string } | null>(null)

  const handleSaveNew = async () => {
    if (!newName.trim() || saving) return
    setSaving(true)
    const result = await onCreateProject({ name: newName.trim(), description: newDesc.trim() })
    setSaving(false)
    if (typeof result === 'string') {
      const name = newName.trim()
      setCreating(false)
      setNewName('')
      setNewDesc('')
      setWizardProject({ id: result, name })
    }
  }

  const handleCancelNew = () => {
    setCreating(false)
    setNewName('')
    setNewDesc('')
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-slate-200 dark:ring-slate-700">
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                Proyectos
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} activos
              </p>
            </div>
          </div>
          <button
            onClick={() => { setCreating(true); setNewName('') }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-red-200 dark:shadow-none"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo proyecto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-5">
              <GitBranch size={28} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              Sin proyectos todavía
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
              Crea tu primer proyecto OST para empezar a mapear oportunidades y priorizar con evidencia.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} />
              Crear proyecto
            </button>
          </div>
        )}

        {/* Inline new project card */}
        {creating && (
          <div className="mb-6">
            <div className="max-w-md bg-white dark:bg-slate-900 border-2 border-dashed border-red-300 dark:border-red-800 rounded-xl p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider font-['IBM_Plex_Mono']">
                Nuevo proyecto
              </p>
              <input
                type="text"
                placeholder="Nombre del proyecto *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveNew(); if (e.key === 'Escape') handleCancelNew() }}
                autoFocus
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelNew}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNew}
                  disabled={!newName.trim() || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  <Check size={14} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mis proyectos ─────────────────────────────────────────────── */}
        {myProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-4">
              Mis proyectos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={() => onSelectProject(project.id)}
                  onOpenMembers={() => setActiveProject(project)}
                  onDelete={() => onDeleteProject(project.id)}
                  onToggleVisibility={(isPublic) => onToggleVisibility(project.id, isPublic)}
                  onRename={(name) => onRenameProject?.(project.id, name)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Compartidos conmigo ────────────────────────────────────────── */}
        {sharedProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-4">
              Compartidos conmigo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={() => onSelectProject(project.id)}
                  onOpenMembers={() => setActiveProject(project)}
                  onDelete={() => onDeleteProject(project.id)}
                  onToggleVisibility={(isPublic) => onToggleVisibility(project.id, isPublic)}
                  onRename={(name) => onRenameProject?.(project.id, name)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Members drawer */}
      <MembersDrawer
        project={activeProject}
        availableUsers={availableUsers}
        roleOptions={roleOptions}
        onClose={() => setActiveProject(null)}
        onAddMember={onAddMember}
        onInviteViewer={onInviteViewer}
        onChangeMemberRole={onChangeMemberRole}
        onRemoveMember={onRemoveMember}
      />

      {/* OST Wizard */}
      {wizardProject && (
        <OSTWizardModal
          isOpen={true}
          projectId={wizardProject.id}
          projectName={wizardProject.name}
          onClose={() => setWizardProject(null)}
        />
      )}
    </div>
  )
}
