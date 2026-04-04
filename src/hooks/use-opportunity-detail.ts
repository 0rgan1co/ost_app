import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeProject } from './use-realtime-project'
import type {
  OpportunityDetail,
  Evidence,
  EvidenceType,
  Hypothesis,
  HypothesisStatus,
  Experiment,
  ExperimentStatus,
  ExperimentType,
  EffortImpact,
  TopExperiment,
  DetailProject,
} from '../types'

// ─── Priority Score ───────────────────────────────────────────────────────────

const SCORE: Record<EffortImpact, number> = { bajo: 1, medio: 2, alto: 3 }

function calcPriorityScore(impact: EffortImpact, effort: EffortImpact): number {
  return SCORE[impact] / SCORE[effort]
}

// ─── Raw DB types ─────────────────────────────────────────────────────────────

interface RawOpportunity {
  id: string
  project_id: string
  name: string
  description: string | null
  outcome: string | null
  archived: boolean
  created_at: string
}

interface RawEvidence {
  id: string
  opportunity_id: string
  type: EvidenceType
  content: string
  source: string | null
  created_at: string
}

interface RawHypothesis {
  id: string
  opportunity_id: string
  description: string
  status: HypothesisStatus
  result: string | null
  created_at: string
  updated_at: string
}

interface RawExperiment {
  id: string
  hypothesis_id: string
  type: ExperimentType
  description: string
  success_criterion: string
  effort: EffortImpact
  impact: EffortImpact
  status: ExperimentStatus
  result: string | null
  created_at: string
  updated_at: string
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapOpportunity(raw: RawOpportunity): OpportunityDetail {
  return {
    id: raw.id,
    title: raw.name,
    description: raw.description ?? '',
    outcome: raw.outcome ?? '',
    status: raw.archived ? 'descartada' : 'activa',
    createdAt: raw.created_at,
  }
}

function mapEvidence(raw: RawEvidence): Evidence {
  return {
    id: raw.id,
    type: raw.type,
    content: raw.content,
    source: raw.source,
    createdAt: raw.created_at,
  }
}

function mapExperiment(raw: RawExperiment): Experiment {
  return {
    id: raw.id,
    hypothesisId: raw.hypothesis_id,
    type: raw.type,
    description: raw.description,
    successCriterion: raw.success_criterion,
    effort: raw.effort,
    impact: raw.impact,
    status: raw.status,
    result: raw.result,
    priorityScore: calcPriorityScore(raw.impact, raw.effort),
  }
}

function mapHypothesis(raw: RawHypothesis, experiments: Experiment[]): Hypothesis {
  return {
    id: raw.id,
    description: raw.description,
    status: raw.status,
    result: raw.result,
    experiments,
    createdAt: raw.created_at,
  }
}

function computeTopExperiments(hypotheses: Hypothesis[]): TopExperiment[] {
  const all: TopExperiment[] = []
  for (const h of hypotheses) {
    for (const e of h.experiments) {
      all.push({
        experiment: e,
        hypothesisTitle: h.description,
        priorityScore: e.priorityScore,
      })
    }
  }
  return all
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseOpportunityDetailReturn {
  project: DetailProject | null
  opportunity: OpportunityDetail | null
  evidence: Evidence[]
  hypotheses: Hypothesis[]
  topExperiments: TopExperiment[]
  loading: boolean
  error: string | null
  updateOpportunity: (id: string, data: Partial<OpportunityDetail>) => Promise<void>
  addEvidence: (data: Omit<Evidence, 'id' | 'createdAt'>) => Promise<void>
  deleteEvidence: (id: string) => Promise<void>
  addHypothesis: (data: Pick<Hypothesis, 'description'>) => Promise<void>
  changeHypothesisStatus: (id: string, status: HypothesisStatus, result?: string) => Promise<void>
  deleteHypothesis: (id: string) => Promise<void>
  addExperiment: (
    hypothesisId: string,
    data: Omit<Experiment, 'id' | 'hypothesisId' | 'priorityScore' | 'result' | 'status'>
  ) => Promise<void>
  changeExperimentStatus: (id: string, status: ExperimentStatus, result?: string) => Promise<void>
}

export function useOpportunityDetail(opportunityId: string): UseOpportunityDetailReturn {
  const [project, setProject] = useState<DetailProject | null>(null)
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [topExperiments, setTopExperiments] = useState<TopExperiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch opportunity
      const { data: rawOpp, error: oppErr } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single()

      if (oppErr || !rawOpp) throw new Error('No se pudo cargar la oportunidad')

      const mappedOpp = mapOpportunity(rawOpp as RawOpportunity)
      setOpportunity(mappedOpp)

      // Fetch project
      const { data: rawProject } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', (rawOpp as RawOpportunity).project_id)
        .single()

      if (rawProject) {
        setProject({ id: rawProject.id, name: rawProject.name })
      }

      // Fetch evidence
      const { data: rawEvidence } = await supabase
        .from('opportunity_evidence')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true })

      const mappedEvidence = (rawEvidence ?? []).map(e => mapEvidence(e as RawEvidence))
      setEvidence(mappedEvidence)

      // Fetch hypotheses
      const { data: rawHypotheses } = await supabase
        .from('hypotheses')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true })

      if (!rawHypotheses?.length) {
        setHypotheses([])
        setTopExperiments([])
        setLoading(false)
        return
      }

      const hypothesisIds = rawHypotheses.map(h => h.id)

      // Fetch all experiments for these hypotheses
      const { data: rawExperiments } = await supabase
        .from('experiments')
        .select('*')
        .in('hypothesis_id', hypothesisIds)
        .order('created_at', { ascending: true })

      const mappedHypotheses = (rawHypotheses as RawHypothesis[]).map(h => {
        const exps = (rawExperiments ?? [])
          .filter(e => e.hypothesis_id === h.id)
          .map(e => mapExperiment(e as RawExperiment))
        return mapHypothesis(h, exps)
      })

      setHypotheses(mappedHypotheses)
      setTopExperiments(computeTopExperiments(mappedHypotheses))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useRealtimeProject({
    projectId: project?.id,
    onEvent: fetchAll,
  })

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const updateOpportunity = useCallback(
    async (id: string, data: Partial<OpportunityDetail>) => {
      const patch: Record<string, unknown> = {}
      if (data.title !== undefined) patch.name = data.title
      if (data.description !== undefined) patch.description = data.description
      if (data.outcome !== undefined) patch.outcome = data.outcome
      if (data.status !== undefined) patch.archived = data.status === 'descartada'

      await supabase.from('opportunities').update(patch).eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const addEvidence = useCallback(
    async (data: Omit<Evidence, 'id' | 'createdAt'>) => {
      await supabase.from('opportunity_evidence').insert({
        opportunity_id: opportunityId,
        type: data.type,
        content: data.content,
        source: data.source ?? null,
      })
      await fetchAll()
    },
    [opportunityId, fetchAll]
  )

  const deleteEvidence = useCallback(
    async (id: string) => {
      await supabase.from('opportunity_evidence').delete().eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const addHypothesis = useCallback(
    async (data: Pick<Hypothesis, 'description'>) => {
      await supabase.from('hypotheses').insert({
        opportunity_id: opportunityId,
        description: data.description,
        status: 'to do',
      })
      await fetchAll()
    },
    [opportunityId, fetchAll]
  )

  const changeHypothesisStatus = useCallback(
    async (id: string, status: HypothesisStatus, result?: string) => {
      const patch: Record<string, unknown> = { status }
      if (status === 'terminada' && result) patch.result = result
      await supabase.from('hypotheses').update(patch).eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const deleteHypothesis = useCallback(
    async (id: string) => {
      await supabase.from('hypotheses').delete().eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const addExperiment = useCallback(
    async (
      hypothesisId: string,
      data: Omit<Experiment, 'id' | 'hypothesisId' | 'priorityScore' | 'result' | 'status'>
    ) => {
      await supabase.from('experiments').insert({
        hypothesis_id: hypothesisId,
        type: data.type,
        description: data.description,
        success_criterion: data.successCriterion,
        effort: data.effort,
        impact: data.impact,
        status: 'to do',
      })
      await fetchAll()
    },
    [fetchAll]
  )

  const changeExperimentStatus = useCallback(
    async (id: string, status: ExperimentStatus, result?: string) => {
      const patch: Record<string, unknown> = { status }
      if (status === 'terminada' && result) patch.result = result
      await supabase.from('experiments').update(patch).eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  return {
    project,
    opportunity,
    evidence,
    hypotheses,
    topExperiments,
    loading,
    error,
    updateOpportunity,
    addEvidence,
    deleteEvidence,
    addHypothesis,
    changeHypothesisStatus,
    deleteHypothesis,
    addExperiment,
    changeExperimentStatus,
  }
}
