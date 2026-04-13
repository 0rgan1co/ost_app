import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeProject } from './use-realtime-project'
import type { Opportunity, OSTTreeEvidence, SolutionSummary } from '../types'

export interface ExperimentSummary {
  id: string
  assumptionId: string
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

interface DBSolution {
  id: string
  opportunity_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface DBAssumption {
  id: string
  solution_id: string
  description: string
  category: string
  status: string
  created_at: string
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface UseOSTTreeReturn {
  opportunities: Opportunity[]
  recentEvidence: Record<string, OSTTreeEvidence[]>
  solutionsSummary: Record<string, SolutionSummary[]>
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

function mapDBToOpportunity(row: DBOpportunity, evidenceCount: number, solutionCount: number): Opportunity {
  return {
    id: row.id,
    title: row.name,
    description: row.description ?? '',
    status: row.archived ? 'descartada' : 'activa',
    isArchived: row.archived,
    isExpanded: true,
    evidenceCount,
    solutionCount,
    experimentCount: 0,
    activeExperimentCount: 0,
    priorityImpact: null,
    priorityFrequency: null,
    priorityIntensity: null,
    priorityCapacity: null,
    isTarget: false,
    createdAt: row.created_at,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOSTTree(projectId: string): UseOSTTreeReturn {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [recentEvidence, setRecentEvidence] = useState<Record<string, OSTTreeEvidence[]>>({})
  const [solutionsSummary, setSolutionsSummary] = useState<Record<string, SolutionSummary[]>>({})
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
        setSolutionsSummary({})
        setExperimentsSummary({})
        setLoading(false)
        return
      }

      const [{ data: evidenceRows }, { data: solutionRows }] = await Promise.all([
        supabase
          .from('opportunity_evidence')
          .select('*')
          .in('opportunity_id', oppIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('solutions')
          .select('*')
          .in('opportunity_id', oppIds)
          .order('created_at', { ascending: false }),
      ])

      const ev = (evidenceRows ?? []) as DBEvidence[]
      const sols = (solutionRows ?? []) as DBSolution[]

      // Fetch assumptions for all solutions
      const solIds = sols.map(s => s.id)
      let assumptionRows: DBAssumption[] = []
      if (solIds.length > 0) {
        const { data } = await supabase
          .from('assumptions')
          .select('*')
          .in('solution_id', solIds)
        assumptionRows = (data ?? []) as DBAssumption[]
      }

      // Fetch experiments for all assumptions
      const assumptionIds = assumptionRows.map(a => a.id)
      let expRows: any[] = []
      if (assumptionIds.length > 0) {
        const { data } = await supabase
          .from('experiments')
          .select('*')
          .in('assumption_id', assumptionIds)
        expRows = data ?? []
      }

      const assumptionToSolutionId: Record<string, string> = {}
      for (const a of assumptionRows) {
        assumptionToSolutionId[a.id] = a.solution_id
      }

      // Build experiments summary grouped by solution_id (via their assumption)
      const experimentsSummaryMap: Record<string, ExperimentSummary[]> = {}
      for (const e of expRows) {
        const solId = assumptionToSolutionId[e.assumption_id]
        if (!solId) continue
        if (!experimentsSummaryMap[solId]) experimentsSummaryMap[solId] = []
        experimentsSummaryMap[solId].push({
          id: e.id,
          assumptionId: e.assumption_id,
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

      // Build assumption count per solution
      const assumptionCountBySolution: Record<string, number> = {}
      for (const a of assumptionRows) {
        assumptionCountBySolution[a.solution_id] = (assumptionCountBySolution[a.solution_id] ?? 0) + 1
      }

      // Build experiment count per solution (through assumptions)
      const experimentCountBySolution: Record<string, number> = {}
      for (const e of expRows) {
        const solId = assumptionToSolutionId[e.assumption_id]
        if (solId) {
          experimentCountBySolution[solId] = (experimentCountBySolution[solId] ?? 0) + 1
        }
      }

      // Build solution counts and summary per opportunity
      const solutionCountMap: Record<string, number> = {}
      const solutionsSummaryMap: Record<string, SolutionSummary[]> = {}

      sols.forEach(s => {
        solutionCountMap[s.opportunity_id] = (solutionCountMap[s.opportunity_id] ?? 0) + 1
        if (!solutionsSummaryMap[s.opportunity_id]) solutionsSummaryMap[s.opportunity_id] = []
        solutionsSummaryMap[s.opportunity_id].push({
          id: s.id,
          name: s.name,
          assumptionCount: assumptionCountBySolution[s.id] ?? 0,
          experimentCount: experimentCountBySolution[s.id] ?? 0,
        })
      })

      const mapped: Opportunity[] = rows.map(row => {
        return mapDBToOpportunity(
          row,
          evidenceCountMap[row.id] ?? 0,
          solutionCountMap[row.id] ?? 0,
        )
      })

      setOpportunities(mapped)
      setRecentEvidence(recentEvidenceMap)
      setSolutionsSummary(solutionsSummaryMap)
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

  useRealtimeProject({ projectId, onEvent: fetchData })

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
    solutionsSummary,
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
