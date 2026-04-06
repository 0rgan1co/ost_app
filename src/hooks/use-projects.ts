import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { sendProjectInvite } from '../lib/email'
import type { Project, ProjectRole, ProjectTag, InviteState, User } from '../types'

export function useProjects(currentUserId: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [inviteState, setInviteState] = useState<InviteState>({
    email: '',
    role: 'usuario',
    status: 'idle',
  })

  async function fetchProjects() {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id, role, joined_at')
      .eq('user_id', currentUserId)

    // Also fetch public projects the user is NOT a member of
    const memberProjectIds = (memberships ?? []).map(m => m.project_id)

    // Fetch member projects
    let memberProjects: any[] = []
    if (memberProjectIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('id', memberProjectIds)
        .order('updated_at', { ascending: false })
      memberProjects = data ?? []
    }

    // Fetch public projects not already in membership
    let publicQuery = supabase
      .from('projects')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })

    if (memberProjectIds.length > 0) {
      publicQuery = publicQuery.not('id', 'in', `(${memberProjectIds.join(',')})`)
    }

    const { data: publicProjects } = await publicQuery

    const allProjects = [...memberProjects, ...(publicProjects ?? [])]
    const allProjectIds = allProjects.map(p => p.id)

    if (allProjectIds.length === 0) {
      setProjects([])
      setLoading(false)
      return
    }

    const [{ data: allMembers }, { data: oppCounts }] = await Promise.all([
      supabase
        .from('project_members')
        .select('id, project_id, user_id, role, profiles!project_members_user_id_profiles_fkey(id, full_name, avatar_url, email)')
        .in('project_id', allProjectIds),
      supabase
        .from('opportunities')
        .select('project_id')
        .in('project_id', allProjectIds),
    ])

    const assembled = allProjects.map(p => {
      const myMembership = (memberships ?? []).find(m => m.project_id === p.id)
      const members = (allMembers ?? [])
        .filter(m => m.project_id === p.id)
        .map(m => {
          const profile = (m.profiles as unknown) as { id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null
          return {
            id: profile?.id ?? m.user_id,
            name: profile?.full_name ?? profile?.email ?? 'Usuario',
            email: profile?.email ?? '',
            avatarUrl: profile?.avatar_url ?? null,
            role: m.role as ProjectRole,
          }
        })
      const opportunityCount = (oppCounts ?? []).filter(o => o.project_id === p.id).length

      return {
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        isPublic: p.is_public ?? false,
        currentUserRole: (myMembership?.role ?? 'viewer') as ProjectRole,
        members,
        opportunityCount,
        lastActivityAt: p.updated_at,
        tags: Array.isArray(p.tags) ? p.tags : [],
      } satisfies Project
    })

    setProjects(assembled)
    setLoading(false)
  }

  async function fetchAvailableUsers() {
    // Get all profiles that have an email in allowed_users
    const { data: allowed } = await supabase
      .from('allowed_users')
      .select('email')

    if (!allowed?.length) {
      setAvailableUsers([])
      return
    }

    const emails = allowed.map(a => a.email)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('email', emails)

    const users: User[] = (profiles ?? [])
      .filter(p => p.id !== currentUserId)
      .map(p => ({
        id: p.id,
        name: p.full_name ?? p.email ?? 'Usuario',
        email: p.email ?? '',
        avatarUrl: p.avatar_url ?? null,
      }))

    setAvailableUsers(users)
  }

  useEffect(() => {
    fetchProjects()
    fetchAvailableUsers()
  }, [currentUserId])

  // Realtime subscription for project_members changes
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`projects-members-${currentUserId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => fetchProjects()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => fetchProjects()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  async function createProject(data: { name: string; description: string }): Promise<string | false> {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name: data.name, description: data.description, created_by: currentUserId })
      .select()
      .single()

    if (projectError || !project) {
      console.error('Error creating project:', projectError)
      return false
    }

    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: currentUserId,
      role: 'admin',
    })

    if (memberError) {
      console.error('Error adding member:', memberError)
    }

    await fetchProjects()
    return project.id
  }

  async function renameProject(projectId: string, name: string) {
    const { error } = await supabase.from('projects').update({ name }).eq('id', projectId)
    if (error) {
      console.error('Error renaming project:', error)
      return
    }
    await fetchProjects()
  }

  async function deleteProject(projectId: string) {
    // Delete members first, then project
    await supabase.from('project_members').delete().eq('project_id', projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      console.error('Error deleting project:', error)
      return
    }
    await fetchProjects()
  }

  async function toggleVisibility(projectId: string, isPublic: boolean) {
    const { error } = await supabase
      .from('projects')
      .update({ is_public: isPublic })
      .eq('id', projectId)
    if (error) {
      console.error('Error updating visibility:', error)
      return
    }
    await fetchProjects()
  }

  async function inviteViewer(projectId: string, email: string): Promise<boolean> {
    // Email-only viewers don't need a user account
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      email,
      role: 'viewer',
    })

    if (error) {
      console.error('Error inviting viewer:', error)
      return false
    }

    // Send email invite
    const project = projects.find(p => p.id === projectId)
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single()
    if (project) {
      sendProjectInvite({
        to: email,
        projectName: project.name,
        projectId,
        inviterName: inviterProfile?.full_name ?? 'Un miembro del equipo',
        role: 'viewer',
      }).catch(() => {})
    }

    await fetchProjects()
    return true
  }

  async function addMember(projectId: string, userId: string, role: ProjectRole) {
    // Optimistic update
    const addedUser = availableUsers.find(u => u.id === userId)
    if (addedUser) {
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, members: [...p.members, { id: addedUser.id, name: addedUser.name, email: addedUser.email, avatarUrl: addedUser.avatarUrl, role }] }
          : p
      ))
    }

    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role,
    })

    if (error) {
      console.error('Error adding member:', error)
      await fetchProjects() // Revert on error
      return
    }

    // Send email invite (fire and forget)
    const project = projects.find(p => p.id === projectId)
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single()
    if (project && addedUser?.email) {
      sendProjectInvite({
        to: addedUser.email,
        toName: addedUser.name,
        projectName: project.name,
        projectId,
        inviterName: inviterProfile?.full_name ?? 'Un miembro del equipo',
        role,
      }).catch(() => {})
    }
  }

  async function inviteMember(projectId: string, email: string, role: ProjectRole) {
    setInviteState(s => ({ ...s, status: 'loading' }))
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!profile) throw new Error('Usuario no encontrado')

      await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: profile.id,
        role,
      })

      setInviteState(s => ({ ...s, status: 'success' }))
      await fetchProjects()
      setTimeout(() => setInviteState({ email: '', role: 'usuario', status: 'idle' }), 2000)
    } catch {
      setInviteState(s => ({ ...s, status: 'error' }))
      setTimeout(() => setInviteState(s => ({ ...s, status: 'idle' })), 3000)
    }
  }

  async function updateMemberRole(projectId: string, memberId: string, role: ProjectRole) {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, members: p.members.map(m => m.id === memberId ? { ...m, role } : m) }
        : p
    ))

    const { error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('project_id', projectId)
      .eq('user_id', memberId)

    if (error) {
      console.error('Error updating member role:', error)
      await fetchProjects() // Revert on error
    }
  }

  async function removeMember(projectId: string, memberId: string) {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, members: p.members.filter(m => m.id !== memberId) }
        : p
    ))

    const { data, error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .select()

    if (error || !data?.length) {
      console.error('Error removing member:', error ?? 'No rows deleted (RLS may have blocked)')
      await fetchProjects()
    }
  }

  async function updateTags(projectId: string, tags: ProjectTag[]) {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, tags } : p
    ))

    const { error } = await supabase
      .from('projects')
      .update({ tags })
      .eq('id', projectId)

    if (error) {
      console.error('Error updating tags:', error)
      await fetchProjects()
    }
  }

  return {
    projects,
    loading,
    availableUsers,
    inviteState,
    createProject,
    renameProject,
    deleteProject,
    toggleVisibility,
    addMember,
    inviteViewer,
    inviteMember,
    updateMemberRole,
    removeMember,
    updateTags,
    refetch: fetchProjects,
  }
}
