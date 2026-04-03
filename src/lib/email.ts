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
