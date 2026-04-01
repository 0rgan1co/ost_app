import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Opportunity, OSTTreeEvidence, HypothesisSummary } from '../types'

// ─── Raw DB rows ──────────────────────────────────────────────────────────────

interface DBOpportunity {
  id: string
  project_id: string
  parent_id: string | null
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

// ─── Tree node ────────────────────────────────────────────────────────────────

export interface OSTTreeNode extends Opportunity {
  children: OSTTreeNode[]
}

// ─── Hook return ─────────────────────────────────────────────────────────────

export interface UseOSTTreeReturn {
  nodes: OSTTreeNode[]
  flatOpportunities: Opportunity[]
  recentEvidence: Record<string, OSTTreeEvidence[]>
  hypothesesSummary: Record<string, HypothesisSummary[]>
  loading: boolean
  error: string | null
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  createOpportunity: (data: { name: string; description?: string; parentId?: string | null }) => Promise<void>
  archiveOpportunity: (id: string) => Promise<void>
  restoreOpportunity: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapDBToOpportunity(row: DBOpportunity, evidenceCount: number, activeHypothesisCount: number): Opportunity {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.name,
    description: row.description ?? '',
    status: row.archived ? 'descartada' : 'activa',
    isArchived: row.archived,
    isExpanded: true,
    evidenceCount,
    hypothesisCount: 0, // filled below
    activeHypothesisCount,
    experimentCount: 0,
    activeExperimentCount: 0,
    createdAt: row.created_at,
  }
}

function buildTree(opportunities: Opportunity[]): OSTTreeNode[] {
  const map = new Map<string, OSTTreeNode>()
  const roots: OSTTreeNode[] = []

  opportunities.forEach(opp => {
    map.set(opp.id, { ...opp, children: [] })
  })

  map.forEach(node => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOSTTree(projectId: string): UseOSTTreeReturn {
  const [flatOpportunities, setFlatOpportunities] = useState<Opportunity[]>([])
  const [recentEvidence, setRecentEvidence] = useState<Record<string, OSTTreeEvidence[]>>({})
  const [hypothesesSummary, setHypothesesSummary] = useState<Record<string, HypothesisSummary[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      // Fetch opportunities
      const { data: oppRows, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (oppError) throw oppError
      const rows = (oppRows ?? []) as DBOpportunity[]
      const oppIds = rows.map(r => r.id)

      if (oppIds.length === 0) {
        setFlatOpportunities([])
        setRecentEvidence({})
        setHypothesesSummary({})
        setLoading(false)
        return
      }

      // Fetch evidence and hypotheses in parallel
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

      // Map DB rows to Opportunity type
      const opportunities: Opportunity[] = rows.map(row => {
        const opp = mapDBToOpportunity(
          row,
          evidenceCountMap[row.id] ?? 0,
          activeHypothesisCountMap[row.id] ?? 0,
        )
        opp.hypothesisCount = totalHypothesisCountMap[row.id] ?? 0
        return opp
      })

      // Initialize all as expanded
      setExpandedIds(new Set(opportunities.map(o => o.id)))
      setFlatOpportunities(opportunities)
      setRecentEvidence(recentEvidenceMap)
      setHypothesesSummary(hypothesesSummaryMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el árbol')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const createOpportunity = useCallback(async (data: {
    name: string
    description?: string
    parentId?: string | null
  }) => {
    const { error } = await supabase.from('opportunities').insert({
      project_id: projectId,
      parent_id: data.parentId ?? null,
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

  const restoreOpportunity = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .update({ archived: false })
      .eq('id', id)
    if (error) throw error
    await fetchData()
  }, [fetchData])

  const nodes = buildTree(flatOpportunities)

  return {
    nodes,
    flatOpportunities,
    recentEvidence,
    hypothesesSummary,
    loading,
    error,
    expandedIds,
    toggleExpand,
    createOpportunity,
    archiveOpportunity,
    restoreOpportunity,
    refetch: fetchData,
  }
}
