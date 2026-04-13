import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface KanbanExperiment {
  id: string
  description: string
  type: string
  successCriterion: string
  effort: string
  impact: string
  status: 'to do' | 'en curso' | 'terminada'
  result: string | null
  score: number
  // Experimento Semilla fields
  objective: string
  who: string
  actions: string
  startDate: string | null
  endDate: string | null
  reviewCycle: string
  // Traceability
  assumptionId: string
  assumptionDescription: string
  solutionId: string
  solutionName: string
  opportunityId: string
  opportunityName: string
  projectName: string
}

const SCORE: Record<string, number> = { bajo: 1, medio: 2, alto: 3 }

export function useAllExperiments(projectId: string | undefined) {
  const [experiments, setExperiments] = useState<KanbanExperiment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!projectId) { setExperiments([]); return }
    setLoading(true)

    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const { data: opps } = await supabase
      .from('opportunities')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('archived', false)

    if (!opps?.length) { setExperiments([]); setLoading(false); return }

    const oppIds = opps.map(o => o.id)
    const oppMap = new Map(opps.map(o => [o.id, o.name]))

    // Fetch solutions for these opportunities
    const { data: sols } = await supabase
      .from('solutions')
      .select('id, opportunity_id, name')
      .in('opportunity_id', oppIds)

    if (!sols?.length) { setExperiments([]); setLoading(false); return }

    const solIds = sols.map(s => s.id)
    const solMap = new Map(sols.map(s => [s.id, s]))

    // Fetch assumptions for these solutions
    const { data: assumptions } = await supabase
      .from('assumptions')
      .select('id, solution_id, description')
      .in('solution_id', solIds)

    const assIds = assumptions?.map(a => a.id) ?? []
    const assMap = new Map((assumptions ?? []).map(a => [a.id, a]))

    // Fetch experiments: either by assumption or directly by solution
    const filters: string[] = []
    if (assIds.length > 0) filters.push(`assumption_id.in.(${assIds.join(',')})`)
    if (solIds.length > 0) filters.push(`solution_id.in.(${solIds.join(',')})`)
    const { data: exps } = filters.length
      ? await supabase.from('experiments').select('*').or(filters.join(','))
      : { data: [] as any[] }

    const mapped: KanbanExperiment[] = (exps ?? []).map(e => {
      const assumption = e.assumption_id ? assMap.get(e.assumption_id) : null
      const solution = e.solution_id
        ? solMap.get(e.solution_id)
        : (assumption ? solMap.get(assumption.solution_id) : null)
      return {
        id: e.id,
        description: e.description,
        type: e.type,
        successCriterion: e.success_criterion,
        effort: e.effort,
        impact: e.impact,
        status: e.status,
        result: e.result,
        score: (SCORE[e.impact] ?? 1) / (SCORE[e.effort] ?? 1),
        objective: e.objective ?? '',
        who: e.who ?? '',
        actions: e.actions ?? '',
        startDate: e.start_date ?? null,
        endDate: e.end_date ?? null,
        reviewCycle: e.review_cycle ?? '',
        assumptionId: e.assumption_id,
        assumptionDescription: assumption?.description ?? '',
        solutionId: solution?.id ?? '',
        solutionName: solution?.name ?? '',
        opportunityId: solution?.opportunity_id ?? '',
        opportunityName: oppMap.get(solution?.opportunity_id ?? '') ?? '',
        projectName: project?.name ?? '',
      }
    }).sort((a, b) => b.score - a.score)

    setExperiments(mapped)
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime subscription for experiments and related tables
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`all-experiments-${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'experiments' },
        () => fetchAll()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'assumptions' },
        () => fetchAll()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'solutions' },
        () => fetchAll()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities', filter: `project_id=eq.${projectId}` },
        () => fetchAll()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchAll])

  async function changeStatus(id: string, status: string, result?: string) {
    const update: any = { status }
    if (result) update.result = result
    await supabase.from('experiments').update(update).eq('id', id)
    await fetchAll()
  }

  async function updateExperiment(id: string, fields: {
    objective?: string; who?: string; actions?: string;
    startDate?: string | null; endDate?: string | null; reviewCycle?: string;
    successCriterion?: string; result?: string;
  }) {
    const update: any = {}
    if (fields.objective !== undefined) update.objective = fields.objective
    if (fields.who !== undefined) update.who = fields.who
    if (fields.actions !== undefined) update.actions = fields.actions
    if (fields.startDate !== undefined) update.start_date = fields.startDate
    if (fields.endDate !== undefined) update.end_date = fields.endDate
    if (fields.reviewCycle !== undefined) update.review_cycle = fields.reviewCycle
    if (fields.successCriterion !== undefined) update.success_criterion = fields.successCriterion
    if (fields.result !== undefined) update.result = fields.result
    await supabase.from('experiments').update(update).eq('id', id)
    await fetchAll()
  }

  return { experiments, loading, changeStatus, updateExperiment, refetch: fetchAll }
}
