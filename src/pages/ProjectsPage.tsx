import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProjects } from '../hooks/use-projects'
import { ProjectList } from '../sections/projects/components'

const ROLE_OPTIONS = ['admin', 'usuario', 'viewer'] as const

export function ProjectsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    projects,
    loading,
    availableUsers,
    createProject,
    renameProject,
    deleteProject,
    toggleVisibility,
    addMember,
    inviteViewer,
    updateMemberRole,
    removeMember,
    updateTags,
  } = useProjects(user!.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-500 dark:text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando proyectos...</div>
      </div>
    )
  }

  const currentUser = {
    id: user!.id,
    name: user!.user_metadata?.full_name ?? user!.email ?? 'Usuario',
    email: user!.email ?? '',
    avatarUrl: user!.user_metadata?.avatar_url ?? null,
  }

  return (
    <ProjectList
      currentUser={currentUser}
      projects={projects}
      roleOptions={[...ROLE_OPTIONS]}
      availableUsers={availableUsers}
      onSelectProject={(id) => {
        navigate(`/projects/${id}/ost-tree`)
      }}
      onCreateProject={createProject}
      onRenameProject={renameProject}
      onDeleteProject={deleteProject}
      onToggleVisibility={toggleVisibility}
      onAddMember={addMember}
      onInviteViewer={inviteViewer}
      onChangeMemberRole={updateMemberRole}
      onRemoveMember={removeMember}
      onUpdateTags={updateTags}
    />
  )
}
