import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ProjectRole } from '../types'

export interface PendingClaim {
  id: string
  projectId: string
  role: ProjectRole
  claimedBy: string
  claimedEmail: string
  claimedAt: string
  token: string
}

export function useInvites(projectId: string | undefined) {
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchPendingClaims() {
    if (!projectId) {
      setPendingClaims([])
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('project_invites')
      .select('id, project_id, role, claimed_by, claimed_email, claimed_at, token')
      .eq('project_id', projectId)
      .not('claimed_by', 'is', null)
      .is('approved_at', null)
      .is('rejected_at', null)

    if (error) {
      console.error('Error fetching pending claims:', error)
      setLoading(false)
      return
    }

    const claims: PendingClaim[] = (data ?? []).map(row => ({
      id: row.id,
      projectId: row.project_id,
      role: row.role as ProjectRole,
      claimedBy: row.claimed_by,
      claimedEmail: row.claimed_email,
      claimedAt: row.claimed_at,
      token: row.token,
    }))

    setPendingClaims(claims)
    setLoading(false)
  }

  useEffect(() => {
    fetchPendingClaims()
  }, [projectId])

  async function generateInviteLink(role: ProjectRole): Promise<string | null> {
    if (!projectId) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch project name for the denormalized column
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const { data, error } = await supabase
      .from('project_invites')
      .insert({ project_id: projectId, role, created_by: user.id, project_name: project?.name ?? null })
      .select('token')
      .single()

    if (error || !data) {
      console.error('Error generating invite link:', error)
      return null
    }

    return `${window.location.origin}/ost_app/invite/${data.token}`
  }

  async function approveClaim(inviteId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // 1. Read the invite
    const { data: invite, error: fetchError } = await supabase
      .from('project_invites')
      .select('claimed_by, claimed_email, role, project_id')
      .eq('id', inviteId)
      .single()

    if (fetchError || !invite) {
      console.error('Error reading invite:', fetchError)
      return false
    }

    const { claimed_by, claimed_email, role, project_id } = invite

    // 2. Upsert into allowed_users
    const { error: allowedError } = await supabase
      .from('allowed_users')
      .upsert({ email: claimed_email }, { onConflict: 'email' })

    if (allowedError) {
      console.error('Error upserting allowed_user:', allowedError)
      return false
    }

    // 3. Insert into project_members if not already there
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id, user_id: claimed_by, role })

    if (memberError && memberError.code !== '23505') {
      // 23505 = unique_violation — member already exists, treat as success
      console.error('Error inserting project_member:', memberError)
      return false
    }

    // 4. Mark invite as approved
    const { error: approveError } = await supabase
      .from('project_invites')
      .update({ approved_at: new Date().toISOString(), approved_by: user.id })
      .eq('id', inviteId)

    if (approveError) {
      console.error('Error approving invite:', approveError)
      return false
    }

    await fetchPendingClaims()
    return true
  }

  async function rejectClaim(inviteId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_invites')
      .update({ rejected_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (error) {
      console.error('Error rejecting claim:', error)
      return false
    }

    await fetchPendingClaims()
    return true
  }

  return {
    pendingClaims,
    loading,
    generateInviteLink,
    approveClaim,
    rejectClaim,
  }
}
