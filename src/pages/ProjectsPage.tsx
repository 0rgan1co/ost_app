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
    inviteState,
    createProject,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useProjects(user!.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando proyectos...</div>
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
      inviteState={inviteState}
      onSelectProject={(id) => {
        navigate(`/projects/${id}/ost-tree`)
      }}
      onCreateProject={createProject}
      onInviteMember={inviteMember}
      onChangeMemberRole={updateMemberRole}
      onRemoveMember={removeMember}
    />
  )
}
