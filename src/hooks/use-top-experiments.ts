import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface SidebarExperiment {
  id: string
  description: string
  type: string
  effort: string
  impact: string
  score: number
  assumptionDescription: string
  solutionName: string
  opportunityName: string
  opportunityId: string
}

const SCORE: Record<string, number> = { bajo: 1, medio: 2, alto: 3 }

export function useTopExperiments(projectId: string | undefined) {
  const [experiments, setExperiments] = useState<SidebarExperiment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTopExperiments = useCallback(async () => {
    if (!projectId) {
      setExperiments([])
      return
    }

    setLoading(true)

    // Get all opportunities for this project
    const { data: opps } = await supabase
      .from('opportunities')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('archived', false)

    if (!opps?.length) {
      setExperiments([])
      setLoading(false)
      return
    }

    const oppIds = opps.map(o => o.id)
    const oppMap = new Map(opps.map(o => [o.id, o.name]))

    // Get solutions for those opportunities
    const { data: sols } = await supabase
      .from('solutions')
      .select('id, opportunity_id, name')
      .in('opportunity_id', oppIds)

    if (!sols?.length) {
      setExperiments([])
      setLoading(false)
      return
    }

    const solIds = sols.map(s => s.id)
    const solMap = new Map(sols.map(s => [s.id, s]))

    // Get assumptions for those solutions
    const { data: assumptions } = await supabase
      .from('assumptions')
      .select('id, solution_id, description')
      .in('solution_id', solIds)

    const assIds = assumptions?.map(a => a.id) ?? []
    const assMap = new Map((assumptions ?? []).map(a => [a.id, a]))

    // Get all non-finished experiments (by assumption or directly by solution)
    const filters: string[] = []
    if (assIds.length > 0) filters.push(`assumption_id.in.(${assIds.join(',')})`)
    if (solIds.length > 0) filters.push(`solution_id.in.(${solIds.join(',')})`)
    const { data: exps } = filters.length
      ? await supabase.from('experiments').select('*').or(filters.join(',')).neq('status', 'terminada')
      : { data: [] as any[] }

    if (!exps?.length) {
      setExperiments([])
      setLoading(false)
      return
    }

    // Score and sort
    const scored: SidebarExperiment[] = exps
      .map(e => {
        const assumption = e.assumption_id ? assMap.get(e.assumption_id) : null
        const solution = e.solution_id
          ? solMap.get(e.solution_id)
          : (assumption ? solMap.get(assumption.solution_id) : null)
        const oppName = solution ? (oppMap.get(solution.opportunity_id) ?? '') : ''
        return {
          id: e.id,
          description: e.description,
          type: e.type,
          effort: e.effort,
          impact: e.impact,
          score: (SCORE[e.impact] ?? 1) / (SCORE[e.effort] ?? 1),
          assumptionDescription: assumption?.description ?? '',
          solutionName: solution?.name ?? '',
          opportunityName: oppName,
          opportunityId: solution?.opportunity_id ?? '',
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    setExperiments(scored)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchTopExperiments()
  }, [fetchTopExperiments])

  // Realtime subscription for experiments and related tables
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`top-experiments-${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'experiments' },
        () => fetchTopExperiments()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'assumptions' },
        () => fetchTopExperiments()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'solutions' },
        () => fetchTopExperiments()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities', filter: `project_id=eq.${projectId}` },
        () => fetchTopExperiments()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, fetchTopExperiments])

  return { experiments, loading }
}
