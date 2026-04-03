import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SidebarExperiment {
  id: string
  description: string
  type: string
  effort: string
  impact: string
  score: number
  hypothesisDescription: string
  opportunityName: string
  opportunityId: string
}

const SCORE: Record<string, number> = { bajo: 1, medio: 2, alto: 3 }

export function useTopExperiments(projectId: string | undefined) {
  const [experiments, setExperiments] = useState<SidebarExperiment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setExperiments([])
      return
    }

    async function fetch() {
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

      // Get hypotheses for those opportunities
      const { data: hyps } = await supabase
        .from('hypotheses')
        .select('id, opportunity_id, description')
        .in('opportunity_id', oppIds)

      if (!hyps?.length) {
        setExperiments([])
        setLoading(false)
        return
      }

      const hypIds = hyps.map(h => h.id)
      const hypMap = new Map(hyps.map(h => [h.id, h]))

      // Get all non-finished experiments
      const { data: exps } = await supabase
        .from('experiments')
        .select('*')
        .in('hypothesis_id', hypIds)
        .neq('status', 'terminada')

      if (!exps?.length) {
        setExperiments([])
        setLoading(false)
        return
      }

      // Score and sort
      const scored: SidebarExperiment[] = exps
        .map(e => {
          const hyp = hypMap.get(e.hypothesis_id)
          const oppName = hyp ? (oppMap.get(hyp.opportunity_id) ?? '') : ''
          return {
            id: e.id,
            description: e.description,
            type: e.type,
            effort: e.effort,
            impact: e.impact,
            score: (SCORE[e.impact] ?? 1) / (SCORE[e.effort] ?? 1),
            hypothesisDescription: hyp?.description ?? '',
            opportunityName: oppName,
            opportunityId: hyp?.opportunity_id ?? '',
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

      setExperiments(scored)
      setLoading(false)
    }

    fetch()
  }, [projectId])

  return { experiments, loading }
}
