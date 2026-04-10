import { supabase } from './supabase'

interface SendInviteParams {
  to: string
  toName?: string
  projectName: string
  projectId: string
  inviterName: string
  role: string
}

export async function sendProjectInvite(params: SendInviteParams): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: { ...params, type: 'invite' },
    })

    if (error) {
      console.error('Email invite error:', error)
      return false
    }

    return data?.success === true
  } catch (err) {
    console.error('Email invite failed:', err)
    return false
  }
}

interface ClaimNotificationParams {
  adminEmail: string
  adminName: string
  claimantEmail: string
  claimantName: string
  projectName: string
  role: string
  inviteId: string
  token: string
}

export async function sendClaimNotification(params: ClaimNotificationParams): Promise<boolean> {
  const approveUrl = `https://zejoaoeotrqanunzypmp.supabase.co/functions/v1/approve-invite?id=${params.inviteId}&secret=${params.token}`

  try {
    const { data, error } = await supabase.functions.invoke('send-invite', {
      body: {
        type: 'claim-notification',
        adminEmail: params.adminEmail,
        adminName: params.adminName,
        claimantEmail: params.claimantEmail,
        claimantName: params.claimantName,
        projectName: params.projectName,
        role: params.role,
        approveUrl,
      },
    })

    if (error) {
      console.error('Email claim notification error:', error)
      return false
    }

    return data?.success === true
  } catch (err) {
    console.error('Email claim notification failed:', err)
    return false
  }
}
