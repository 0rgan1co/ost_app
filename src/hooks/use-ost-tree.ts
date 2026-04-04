import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Opportunity, OSTTreeEvidence, HypothesisSummary } from '../types'

export interface ExperimentSummary {
  id: string
  hypothesisId: string
  description: string
  type: string
  status: string
  effort: string
  impact: string
}

// ─── Raw DB rows ──────────────────────────────────────────────────────────────

interface DBOpportunity {
  id: string
  project_id: string
  name: string
  description: string | null
  outcome: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

interface DBEvidence {
  id: string
  opportunity_id: string
  type: 'cita' | 'hecho' | 'observacion'
  content: string
  source: string | null
  created_at: string
}

interface DBHypothesis {
  id: string
  opportunity_id: string
  description: string
  status: 'to do' | 'en curso' | 'terminada'
  result: string | null
  created_at: string
  updated_at: string
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface UseOSTTreeReturn {
  opportunities: Opportunity[]
  recentEvidence: Record<string, OSTTreeEvidence[]>
  hypothesesSummary: Record<string, HypothesisSummary[]>
  experimentsSummary: Record<string, ExperimentSummary[]>
  loading: boolean
  error: string | null
  createOpportunity: (data: { name: string; description?: string }) => Promise<void>
  renameOpportunity: (id: string, name: string) => Promise<void>
  archiveOpportunity: (id: string) => Promise<void>
  restoreOpportunity: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapDBToOpportunity(row: DBOpportunity, evidenceCount: number, activeHypothesisCount: number): Opportunity {
  return {
    id: row.id,
    title: row.name,
    description: row.description ?? '',
    status: row.archived ? 'descartada' : 'activa',
    isArchived: row.archived,
    isExpanded: true,
    evidenceCount,
    hypothesisCount: 0,
    activeHypothesisCount,
    experimentCount: 0,
    activeExperimentCount: 0,
    createdAt: row.created_at,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOSTTree(projectId: string): UseOSTTreeReturn {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [recentEvidence, setRecentEvidence] = useState<Record<string, OSTTreeEvidence[]>>({})
  const [hypothesesSummary, setHypothesesSummary] = useState<Record<string, HypothesisSummary[]>>({})
  const [experimentsSummary, setExperimentsSummary] = useState<Record<string, ExperimentSummary[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      const { data: oppRows, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (oppError) throw oppError
      const rows = (oppRows ?? []) as DBOpportunity[]
      const oppIds = rows.map(r => r.id)

      if (oppIds.length === 0) {
        setOpportunities([])
        setRecentEvidence({})
        setHypothesesSummary({})
        setExperimentsSummary({})
        setLoading(false)
        return
      }

      const [{ data: evidenceRows }, { data: hypothesisRows }] = await Promise.all([
        supabase
          .from('opportunity_evidence')
          .select('*')
          .in('opportunity_id', oppIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('hypotheses')
          .select('*')
          .in('opportunity_id', oppIds)
          .order('created_at', { ascending: false }),
      ])

      const ev = (evidenceRows ?? []) as DBEvidence[]
      const hy = (hypothesisRows ?? []) as DBHypothesis[]

      // Fetch experiments for all hypotheses
      const hypIds = hy.map(h => h.id)
      let expRows: any[] = []
      if (hypIds.length > 0) {
        const { data } = await supabase
          .from('experiments')
          .select('*')
          .in('hypothesis_id', hypIds)
        expRows = data ?? []
      }

      // Build experiments summary grouped by hypothesis_id
      const experimentsSummaryMap: Record<string, ExperimentSummary[]> = {}
      for (const e of expRows) {
        if (!experimentsSummaryMap[e.hypothesis_id]) experimentsSummaryMap[e.hypothesis_id] = []
        experimentsSummaryMap[e.hypothesis_id].push({
          id: e.id,
          hypothesisId: e.hypothesis_id,
          description: e.description,
          type: e.type,
          status: e.status,
          effort: e.effort,
          impact: e.impact,
        })
      }

      // Build evidence counts and recent evidence per opportunity
      const evidenceCountMap: Record<string, number> = {}
      const recentEvidenceMap: Record<string, OSTTreeEvidence[]> = {}

      ev.forEach(e => {
        evidenceCountMap[e.opportunity_id] = (evidenceCountMap[e.opportunity_id] ?? 0) + 1
        if (!recentEvidenceMap[e.opportunity_id]) recentEvidenceMap[e.opportunity_id] = []
        if (recentEvidenceMap[e.opportunity_id].length < 3) {
          recentEvidenceMap[e.opportunity_id].push({
            id: e.id,
            type: e.type,
            content: e.content,
            source: e.source ?? '',
          })
        }
      })

      // Build hypothesis counts and summary per opportunity
      const activeHypothesisCountMap: Record<string, number> = {}
      const totalHypothesisCountMap: Record<string, number> = {}
      const hypothesesSummaryMap: Record<string, HypothesisSummary[]> = {}

      hy.forEach(h => {
        totalHypothesisCountMap[h.opportunity_id] = (totalHypothesisCountMap[h.opportunity_id] ?? 0) + 1
        if (h.status !== 'terminada') {
          activeHypothesisCountMap[h.opportunity_id] = (activeHypothesisCountMap[h.opportunity_id] ?? 0) + 1
        }
        if (!hypothesesSummaryMap[h.opportunity_id]) hypothesesSummaryMap[h.opportunity_id] = []
        hypothesesSummaryMap[h.opportunity_id].push({
          id: h.id,
          title: h.description,
          status: h.status,
        })
      })

      const mapped: Opportunity[] = rows.map(row => {
        const opp = mapDBToOpportunity(
          row,
          evidenceCountMap[row.id] ?? 0,
          activeHypothesisCountMap[row.id] ?? 0,
        )
        opp.hypothesisCount = totalHypothesisCountMap[row.id] ?? 0
        return opp
      })

      setOpportunities(mapped)
      setRecentEvidence(recentEvidenceMap)
      setHypothesesSummary(hypothesesSummaryMap)
      setExperimentsSummary(experimentsSummaryMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando oportunidades')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createOpportunity = useCallback(async (data: {
    name: string
    description?: string
  }) => {
    const { error } = await supabase.from('opportunities').insert({
      project_id: projectId,
      parent_id: null,
      name: data.name,
      description: data.description ?? null,
    })
    if (error) throw error
    await fetchData()
  }, [projectId, fetchData])

  const archiveOpportunity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .update({ archived: true })
      .eq('id', id)
    if (error) throw error
    await fetchData()
  }, [fetchData])

  const renameOpportunity = useCallback(async (id: string, name: string) => {
    if (!name.trim()) return
    const { error } = await supabase
      .from('opportunities')
      .update({ name: name.trim() })
      .eq('id', id)
    if (error) throw error
    await fetchData()
  }, [fetchData])

  const restoreOpportunity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .update({ archived: false })
      .eq('id', id)
    if (error) throw error
    await fetchData()
  }, [fetchData])

  return {
    opportunities,
    recentEvidence,
    hypothesesSummary,
    experimentsSummary,
    loading,
    error,
    createOpportunity,
    renameOpportunity,
    archiveOpportunity,
    restoreOpportunity,
    refetch: fetchData,
  }
}
