import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeProjectOptions {
  projectId: string | undefined
  onEvent: () => void
  enabled?: boolean
}

export function useRealtimeProject({ projectId, onEvent, enabled = true }: UseRealtimeProjectOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!projectId || !enabled) return

    const channel = supabase
      .channel(`project-${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities', filter: `project_id=eq.${projectId}` },
        () => onEventRef.current()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'opportunity_evidence' },
        () => onEventRef.current()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'experiments' },
        () => onEventRef.current()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'solutions' },
        () => onEventRef.current()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'assumptions' },
        () => onEventRef.current()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
        () => onEventRef.current()
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [projectId, enabled])
}
