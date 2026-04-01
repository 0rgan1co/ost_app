import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Project, ProjectRole, InviteState } from '../types'

export function useProjects(currentUserId: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
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

    if (!memberships?.length) {
      setProjects([])
      setLoading(false)
      return
    }

    const projectIds = memberships.map(m => m.project_id)

    const [{ data: projectsData }, { data: allMembers }, { data: oppCounts }] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('project_members')
        .select('id, project_id, user_id, role, profiles(id, full_name, avatar_url, email)')
        .in('project_id', projectIds),
      supabase
        .from('opportunities')
        .select('project_id')
        .in('project_id', projectIds),
    ])

    const assembled = (projectsData ?? []).map(p => {
      const myMembership = memberships.find(m => m.project_id === p.id)
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
        currentUserRole: (myMembership?.role ?? 'viewer') as ProjectRole,
        members,
        opportunityCount,
        lastActivityAt: p.updated_at,
      } satisfies Project
    })

    setProjects(assembled)
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [currentUserId])

  async function createProject(data: { name: string; description: string }): Promise<boolean> {
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
    return true
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
    // memberId here is the user id within the project — find the project_member row
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', memberId)
      .single()

    if (member) {
      await supabase.from('project_members').update({ role }).eq('id', member.id)
      await fetchProjects()
    }
  }

  async function removeMember(projectId: string, memberId: string) {
    await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId)
    await fetchProjects()
  }

  return {
    projects,
    loading,
    inviteState,
    createProject,
    inviteMember,
    updateMemberRole,
    removeMember,
    refetch: fetchProjects,
  }
}
