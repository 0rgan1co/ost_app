import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeProject } from './use-realtime-project'
import { OpportunityEvidenceSchema, ExperimentCreateSchema } from '../lib/schemas'
import type {
  OpportunityDetail,
  Evidence,
  EvidenceType,
  Solution,
  Assumption,
  AssumptionCategory,
  AssumptionStatus,
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
  priority_impact: string | null
  priority_frequency: string | null
  priority_intensity: string | null
  priority_capacity: string | null
  is_target: boolean | null
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

interface RawSolution {
  id: string
  opportunity_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface RawAssumption {
  id: string
  solution_id: string
  description: string
  category: AssumptionCategory
  status: AssumptionStatus
  result: string | null
  created_at: string
  updated_at: string
}

interface RawExperiment {
  id: string
  assumption_id: string
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
    priorityImpact: (raw.priority_impact as EffortImpact) ?? null,
    priorityFrequency: (raw.priority_frequency as EffortImpact) ?? null,
    priorityIntensity: (raw.priority_intensity as EffortImpact) ?? null,
    priorityCapacity: (raw.priority_capacity as EffortImpact) ?? null,
    isTarget: raw.is_target ?? false,
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
    assumptionId: raw.assumption_id,
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

function mapAssumption(raw: RawAssumption, experiments: Experiment[]): Assumption {
  return {
    id: raw.id,
    solutionId: raw.solution_id,
    description: raw.description,
    category: raw.category,
    status: raw.status,
    result: raw.result,
    experiments,
    createdAt: raw.created_at,
  }
}

function mapSolution(raw: RawSolution, assumptions: Assumption[]): Solution {
  return {
    id: raw.id,
    opportunityId: raw.opportunity_id,
    name: raw.name,
    description: raw.description ?? '',
    assumptions,
    createdAt: raw.created_at,
  }
}

function computeTopExperiments(solutions: Solution[]): TopExperiment[] {
  const all: TopExperiment[] = []
  for (const s of solutions) {
    for (const a of s.assumptions) {
      for (const e of a.experiments) {
        all.push({
          experiment: e,
          assumptionDescription: a.description,
          solutionName: s.name,
          priorityScore: e.priorityScore,
        })
      }
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
  solutions: Solution[]
  topExperiments: TopExperiment[]
  loading: boolean
  error: string | null
  updateOpportunity: (id: string, data: Partial<OpportunityDetail>) => Promise<void>
  addEvidence: (data: Omit<Evidence, 'id' | 'createdAt'>) => Promise<void>
  deleteEvidence: (id: string) => Promise<void>
  addSolution: (data: { name: string; description?: string }) => Promise<void>
  deleteSolution: (id: string) => Promise<void>
  addAssumption: (solutionId: string, data: { description: string; category: AssumptionCategory }) => Promise<void>
  changeAssumptionStatus: (id: string, status: AssumptionStatus, result?: string) => Promise<void>
  deleteAssumption: (id: string) => Promise<void>
  addExperiment: (
    assumptionId: string,
    data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
  ) => Promise<void>
  changeExperimentStatus: (id: string, status: ExperimentStatus, result?: string) => Promise<void>
  updatePriority: (field: string, value: EffortImpact) => Promise<void>
  toggleTarget: () => Promise<void>
}

export function useOpportunityDetail(opportunityId: string): UseOpportunityDetailReturn {
  const [project, setProject] = useState<DetailProject | null>(null)
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
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

      // Fetch solutions
      const { data: rawSolutions } = await supabase
        .from('solutions')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: true })

      if (!rawSolutions?.length) {
        setSolutions([])
        setTopExperiments([])
        setLoading(false)
        return
      }

      const solutionIds = rawSolutions.map(s => s.id)

      // Fetch all assumptions for these solutions
      const { data: rawAssumptions } = await supabase
        .from('assumptions')
        .select('*')
        .in('solution_id', solutionIds)
        .order('created_at', { ascending: true })

      // Fetch all experiments for these assumptions
      const assumptionIds = (rawAssumptions ?? []).map(a => a.id)
      let rawExperiments: RawExperiment[] = []
      if (assumptionIds.length > 0) {
        const { data } = await supabase
          .from('experiments')
          .select('*')
          .in('assumption_id', assumptionIds)
          .order('created_at', { ascending: true })
        rawExperiments = (data ?? []) as RawExperiment[]
      }

      // Build nested structure: Solution[] > Assumption[] > Experiment[]
      const mappedSolutions = (rawSolutions as RawSolution[]).map(s => {
        const solutionAssumptions = (rawAssumptions ?? [])
          .filter(a => a.solution_id === s.id)
          .map(a => {
            const exps = rawExperiments
              .filter(e => e.assumption_id === a.id)
              .map(e => mapExperiment(e))
            return mapAssumption(a as RawAssumption, exps)
          })
        return mapSolution(s, solutionAssumptions)
      })

      setSolutions(mappedSolutions)
      setTopExperiments(computeTopExperiments(mappedSolutions))
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
      const validation = OpportunityEvidenceSchema.safeParse(data)
      if (!validation.success) {
        console.error('[addEvidence] Validation failed:', validation.error.format())
        return
      }
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

  const addSolution = useCallback(
    async (data: { name: string; description?: string }) => {
      await supabase.from('solutions').insert({
        opportunity_id: opportunityId,
        name: data.name,
        description: data.description ?? null,
      })
      await fetchAll()
    },
    [opportunityId, fetchAll]
  )

  const deleteSolution = useCallback(
    async (id: string) => {
      await supabase.from('solutions').delete().eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const addAssumption = useCallback(
    async (solutionId: string, data: { description: string; category: AssumptionCategory }) => {
      await supabase.from('assumptions').insert({
        solution_id: solutionId,
        description: data.description,
        category: data.category,
        status: 'pendiente',
      })
      await fetchAll()
    },
    [fetchAll]
  )

  const changeAssumptionStatus = useCallback(
    async (id: string, status: AssumptionStatus, result?: string) => {
      const patch: Record<string, unknown> = { status }
      if ((status === 'validado' || status === 'invalidado') && result) {
        patch.result = result
      }
      await supabase.from('assumptions').update(patch).eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const deleteAssumption = useCallback(
    async (id: string) => {
      await supabase.from('assumptions').delete().eq('id', id)
      await fetchAll()
    },
    [fetchAll]
  )

  const addExperiment = useCallback(
    async (
      assumptionId: string,
      data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
    ) => {
      const validation = ExperimentCreateSchema.safeParse(data)
      if (!validation.success) {
        console.error('[addExperiment] Validation failed:', validation.error.format())
        return
      }
      await supabase.from('experiments').insert({
        assumption_id: assumptionId,
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

  const updatePriority = useCallback(
    async (field: string, value: EffortImpact) => {
      // Map camelCase field names to snake_case DB columns
      const fieldMap: Record<string, string> = {
        priorityImpact: 'priority_impact',
        priorityFrequency: 'priority_frequency',
        priorityIntensity: 'priority_intensity',
        priorityCapacity: 'priority_capacity',
      }
      const column = fieldMap[field]
      if (!column) return
      await supabase.from('opportunities').update({ [column]: value }).eq('id', opportunityId)
      await fetchAll()
    },
    [opportunityId, fetchAll]
  )

  const toggleTarget = useCallback(
    async () => {
      // Get the project_id for this opportunity
      const { data: rawOpp } = await supabase
        .from('opportunities')
        .select('project_id, is_target')
        .eq('id', opportunityId)
        .single()

      if (!rawOpp) return

      const newValue = !rawOpp.is_target

      if (newValue) {
        // Unset is_target on all opportunities in the project first
        await supabase
          .from('opportunities')
          .update({ is_target: false })
          .eq('project_id', rawOpp.project_id)
      }

      // Set is_target on the specified opportunity
      await supabase
        .from('opportunities')
        .update({ is_target: newValue })
        .eq('id', opportunityId)

      await fetchAll()
    },
    [opportunityId, fetchAll]
  )

  return {
    project,
    opportunity,
    evidence,
    solutions,
    topExperiments,
    loading,
    error,
    updateOpportunity,
    addEvidence,
    deleteEvidence,
    addSolution,
    deleteSolution,
    addAssumption,
    changeAssumptionStatus,
    deleteAssumption,
    addExperiment,
    changeExperimentStatus,
    updatePriority,
    toggleTarget,
  }
}
