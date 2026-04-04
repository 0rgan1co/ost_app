import { useState, useEffect } from 'react'
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
  // Traceability
  hypothesisId: string
  hypothesisDescription: string
  opportunityId: string
  opportunityName: string
  projectName: string
}

const SCORE: Record<string, number> = { bajo: 1, medio: 2, alto: 3 }

export function useAllExperiments(projectId: string | undefined) {
  const [experiments, setExperiments] = useState<KanbanExperiment[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchAll() {
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

    const { data: hyps } = await supabase
      .from('hypotheses')
      .select('id, opportunity_id, description')
      .in('opportunity_id', oppIds)

    if (!hyps?.length) { setExperiments([]); setLoading(false); return }

    const hypIds = hyps.map(h => h.id)
    const hypMap = new Map(hyps.map(h => [h.id, h]))

    const { data: exps } = await supabase
      .from('experiments')
      .select('*')
      .in('hypothesis_id', hypIds)

    const mapped: KanbanExperiment[] = (exps ?? []).map(e => {
      const hyp = hypMap.get(e.hypothesis_id)
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
        hypothesisId: e.hypothesis_id,
        hypothesisDescription: hyp?.description ?? '',
        opportunityId: hyp?.opportunity_id ?? '',
        opportunityName: oppMap.get(hyp?.opportunity_id ?? '') ?? '',
        projectName: project?.name ?? '',
      }
    }).sort((a, b) => b.score - a.score)

    setExperiments(mapped)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [projectId])

  async function changeStatus(id: string, status: string, result?: string) {
    const update: any = { status }
    if (result) update.result = result
    await supabase.from('experiments').update(update).eq('id', id)
    await fetchAll()
  }

  return { experiments, loading, changeStatus, refetch: fetchAll }
}
