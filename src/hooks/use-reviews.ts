import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface OutcomeReview {
  id: string
  cycleName: string
  achievements: string
  obstacles: string
  learnings: string
  nextSteps: string
  createdAt: string
}

export function useReviews(projectId: string | undefined) {
  const [reviews, setReviews] = useState<OutcomeReview[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!projectId) { setReviews([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('outcome_reviews')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setReviews((data ?? []).map(r => ({
      id: r.id,
      cycleName: r.cycle_name,
      achievements: r.achievements,
      obstacles: r.obstacles,
      learnings: r.learnings,
      nextSteps: r.next_steps,
      createdAt: r.created_at,
    })))
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function createReview(data: { cycleName: string; achievements: string; obstacles: string; learnings: string; nextSteps: string }) {
    const { data: user } = await supabase.auth.getUser()
    await supabase.from('outcome_reviews').insert({
      project_id: projectId,
      cycle_name: data.cycleName,
      achievements: data.achievements,
      obstacles: data.obstacles,
      learnings: data.learnings,
      next_steps: data.nextSteps,
      created_by: user.user?.id,
    })
    await fetchReviews()
  }

  async function deleteReview(id: string) {
    await supabase.from('outcome_reviews').delete().eq('id', id)
    await fetchReviews()
  }

  return { reviews, loading, createReview, deleteReview }
}
