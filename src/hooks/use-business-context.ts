import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { BusinessContext, ContextField } from '../types'

// ─── Internal Supabase row shape ──────────────────────────────────────────────

interface BusinessContextRow {
  id: string
  project_id: string
  content: string
  updated_at: string
}

// ─── Content JSON stored in the `content` column ─────────────────────────────

// ─── Default / empty context ──────────────────────────────────────────────────

function emptyContext(): BusinessContext {
  return {
    strategicChallenge: { value: '', updatedAt: null },
    northStar: { value: '', updatedAt: null },
    targetSegment: { value: '', updatedAt: null },
    keyConstraints: { value: '', updatedAt: null },
  }
}

function toContextField(val: unknown): ContextField {
  if (!val) return { value: '', updatedAt: null }
  if (typeof val === 'string') return { value: val, updatedAt: null }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return { value: String((val as any).value ?? ''), updatedAt: (val as any).updatedAt ?? null }
  }
  return { value: '', updatedAt: null }
}

function parseContent(raw: string): BusinessContext {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyContext()
    return {
      strategicChallenge: toContextField(parsed.strategicChallenge),
      northStar: toContextField(parsed.northStar),
      targetSegment: toContextField(parsed.targetSegment),
      keyConstraints: toContextField(parsed.keyConstraints),
    }
  } catch {
    return emptyContext()
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBusinessContext(projectId: string) {
  const [context, setContext] = useState<BusinessContext>(emptyContext())
  const [rowId, setRowId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchContext = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data } = await supabase
      .from('business_context')
      .select('id, project_id, content, updated_at')
      .eq('project_id', projectId)
      .maybeSingle<BusinessContextRow>()

    if (data) {
      setRowId(data.id)
      setContext(parseContent(data.content))
    } else {
      setRowId(null)
      setContext(emptyContext())
    }

    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  // ── Realtime subscription for business_context ────────────────────────────

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`biz-ctx-${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'business_context', filter: `project_id=eq.${projectId}` },
        () => fetchContext()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchContext])

  // ── Save a single field ────────────────────────────────────────────────────

  const saveField = useCallback(
    async (field: keyof BusinessContext, value: string) => {
      setIsSaving(true)

      // Build updated context merging the new field value + timestamp
      const updatedField: ContextField = {
        value,
        updatedAt: new Date().toISOString(),
      }

      const updatedContext: BusinessContext = {
        ...context,
        [field]: updatedField,
      }

      const contentJson = JSON.stringify(updatedContext)

      if (rowId) {
        // Update existing row
        await supabase
          .from('business_context')
          .update({ content: contentJson, updated_at: new Date().toISOString() })
          .eq('id', rowId)
      } else {
        // Insert new row (upsert pattern — row doesn't exist yet)
        const { data: inserted } = await supabase
          .from('business_context')
          .insert({ project_id: projectId, content: contentJson })
          .select('id')
          .single()

        if (inserted) {
          setRowId(inserted.id)
        }
      }

      // Optimistic update — reflect the change immediately in UI
      setContext(updatedContext)
      setIsSaving(false)
    },
    [context, projectId, rowId]
  )

  // ── Realtime subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`biz-ctx-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_context', filter: `project_id=eq.${projectId}` },
        () => fetchContext()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchContext])

  return {
    context,
    loading,
    isSaving,
    saveField,
    refetch: fetchContext,
  }
}
