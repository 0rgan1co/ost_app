import { useState, useEffect, useCallback } from 'react'
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

interface ContentJson {
  northStar: ContextField
  targetSegment: ContextField
  keyConstraints: ContextField
}

// ─── Default / empty context ──────────────────────────────────────────────────

function emptyContext(): BusinessContext {
  return {
    northStar: { value: '', updatedAt: null },
    targetSegment: { value: '', updatedAt: null },
    keyConstraints: { value: '', updatedAt: null },
  }
}

function parseContent(raw: string): BusinessContext {
  try {
    const parsed = JSON.parse(raw) as Partial<ContentJson>
    return {
      northStar: parsed.northStar ?? { value: '', updatedAt: null },
      targetSegment: parsed.targetSegment ?? { value: '', updatedAt: null },
      keyConstraints: parsed.keyConstraints ?? { value: '', updatedAt: null },
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

  return {
    context,
    loading,
    isSaving,
    saveField,
    refetch: fetchContext,
  }
}
