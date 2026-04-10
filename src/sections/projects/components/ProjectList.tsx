import { useState, useMemo } from 'react'
import { Plus, GitBranch, X, Check, Search, Filter, ChevronDown } from 'lucide-react'
import type { ProjectsProps, Project, ProjectRole } from '../../../types'
import { ProjectCard } from './ProjectCard'
import { MembersDrawer } from './MembersDrawer'
import { OSTWizardModal } from './OSTWizardModal'
import { supabase } from '../../../lib/supabase'

type VisibilityFilter = 'all' | 'public' | 'private'
type RoleFilter = 'all' | ProjectRole

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
  onUpdateTags,
}: ProjectsProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [wizardProject, setWizardProject] = useState<{ id: string; name: string } | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Collect all unique tags across projects
  const allTags = useMemo(() => {
    const tagMap = new Map<string, string>() // name → color
    for (const p of projects) {
      for (const t of p.tags) tagMap.set(t.name, t.color)
    }
    return Array.from(tagMap.entries()).map(([name, color]) => ({ name, color }))
  }, [projects])

  const hasActiveFilters = search || roleFilter !== 'all' || visibilityFilter !== 'all' || tagFilter !== 'all'

  // Apply filters
  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false
      if (roleFilter !== 'all' && p.currentUserRole !== roleFilter) return false
      if (visibilityFilter === 'public' && !p.isPublic) return false
      if (visibilityFilter === 'private' && p.isPublic) return false
      if (tagFilter !== 'all' && !p.tags.some(t => t.name === tagFilter)) return false
      return true
    })
  }, [projects, search, roleFilter, visibilityFilter, tagFilter])

  const myProjects = filtered.filter(p => p.currentUserRole === 'admin')
  const sharedProjects = filtered.filter(p => p.currentUserRole !== 'admin')

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

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setVisibilityFilter('all')
    setTagFilter('all')
  }

  const generateInviteLink = async (projectId: string, projectName: string, role: ProjectRole): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('project_invites')
      .insert({ project_id: projectId, role, created_by: user.id, project_name: projectName })
      .select('token')
      .single()
    if (error || !data) return null
    return `${window.location.origin}/ost_app/invite/${data.token}`
  }

  const renderProjectCard = (project: Project) => (
    <ProjectCard
      key={project.id}
      project={project}
      onSelect={() => onSelectProject(project.id)}
      onOpenMembers={() => setActiveProject(project)}
      onDelete={() => onDeleteProject(project.id)}
      onToggleVisibility={(isPublic) => onToggleVisibility(project.id, isPublic)}
      onRename={(name) => onRenameProject?.(project.id, name)}
      onUpdateTags={(tags) => onUpdateTags(project.id, tags)}
      onGenerateInviteLink={(role) => generateInviteLink(project.id, project.name, role)}
    />
  )

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
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
                {filtered.length === projects.length
                  ? `${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'} activos`
                  : `${filtered.length} de ${projects.length} proyectos`
                }
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

        {/* Filter bar */}
        {projects.length > 0 && (
          <div className="mb-6 space-y-3">
            {/* Search + filter toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar proyectos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors font-sans ${
                  showFilters || hasActiveFilters
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Filter size={14} />
                Filtros
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                {/* Role filter */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as RoleFilter)}
                    className="appearance-none text-xs font-medium pl-2.5 pr-6 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="admin">Admin</option>
                    <option value="usuario">Usuario</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>

                {/* Visibility filter */}
                <div className="relative">
                  <select
                    value={visibilityFilter}
                    onChange={e => setVisibilityFilter(e.target.value as VisibilityFilter)}
                    className="appearance-none text-xs font-medium pl-2.5 pr-6 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                  >
                    <option value="all">Visibilidad</option>
                    <option value="public">Público</option>
                    <option value="private">Privado</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>

                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div className="relative">
                    <select
                      value={tagFilter}
                      onChange={e => setTagFilter(e.target.value)}
                      className="appearance-none text-xs font-medium pl-2.5 pr-6 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400 font-sans"
                    >
                      <option value="all">Tags</option>
                      {allTags.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                )}

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium ml-1 font-sans"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* No results after filter */}
        {projects.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={24} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              No se encontraron proyectos con esos filtros.
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-red-500 hover:text-red-600 font-medium font-sans"
            >
              Limpiar filtros
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
              {myProjects.map(renderProjectCard)}
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
              {sharedProjects.map(renderProjectCard)}
            </div>
          </section>
        )}
      </div>

      {/* Members drawer */}
      <MembersDrawer
        project={activeProject ? (projects.find(p => p.id === activeProject.id) ?? activeProject) : null}
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
