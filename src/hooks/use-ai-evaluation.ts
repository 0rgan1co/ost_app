import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { parseSuggestion, type SuggestionAction } from '../lib/parse-suggestion'
import type { AIEvaluation, ConversationMessage, EvaluationSection } from '../types'

// Model constant kept for UI display purposes
const AI_MODEL = 'claude-sonnet-4-6'

// ─── Raw DB shapes ─────────────────────────────────────────────────────────────

interface DBEvaluation {
  id: string
  opportunity_id: string
  prompt_snapshot: string
  evaluation_text: string
  created_at: string
}

interface DBMessage {
  id: string
  evaluation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface DBOpportunity {
  id: string
  name: string
  description: string | null
  outcome: string | null
}

interface DBEvidence {
  id: string
  type: string
  content: string
  source: string | null
}

interface DBSolution {
  id: string
  opportunity_id: string
  name: string
  description: string | null
}

interface DBAssumption {
  id: string
  solution_id: string
  description: string
  category: string
  status: string
  result: string | null
}

interface DBExperiment {
  id: string
  assumption_id: string
  type: string
  description: string
  success_criterion: string
  effort: string
  impact: string
  status: string
  result: string | null
}

interface DBBusinessContext {
  content: string // JSON string: { northStar, targetSegment, keyConstraints }
}

interface ParsedBusinessContext {
  northStar: string
  targetSegment: string
  keyConstraints: string
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseAIEvaluationReturn {
  evaluations: AIEvaluation[]
  conversation: ConversationMessage[]
  isEvaluating: boolean
  isSendingMessage: boolean
  error: string | null
  evaluate: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
  applySuggestion: (messageId: string) => SuggestionAction[]
  executeActions: (actions: SuggestionAction[]) => Promise<number>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEvaluationText(raw: string, id: string, opportunityId: string, createdAt: string): AIEvaluation {
  let sections: EvaluationSection[] = []

  try {
    // The model returns JSON inside a potential markdown code block
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw
    const parsed = JSON.parse(jsonStr) as { sections: EvaluationSection[] }
    sections = parsed.sections ?? []
  } catch {
    // Fallback: treat the whole text as a single section
    sections = [{ title: 'Evaluación', content: raw }]
  }

  return {
    id,
    opportunityId,
    createdAt,
    model: AI_MODEL,
    sections,
    rawText: raw,
  }
}

function mapDBMessageToConversation(msg: DBMessage): ConversationMessage {
  // Detect suggestion pattern in assistant messages
  // Show "Aplicar" on ALL assistant messages (any response may contain actionable suggestions)
  const hasSuggestion = msg.role === 'assistant' && msg.content.length > 50

  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    hasSuggestion,
    suggestionSummary: hasSuggestion ? 'Aplicar esta sugerencia al OST' : undefined,
    createdAt: msg.created_at,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIEvaluation(
  opportunityId: string,
  projectId: string
): UseAIEvaluationReturn {
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([])
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track the active evaluation ID for the conversation thread
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | null>(null)

  // ── Load existing evaluations and conversation ────────────────────────────

  const fetchData = useCallback(async () => {
    if (!opportunityId) return

    try {
      // Fetch evaluations ordered by newest first
      const { data: evalRows, error: evalError } = await supabase
        .from('ai_evaluations')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false })

      if (evalError) throw evalError

      const dbEvals = (evalRows ?? []) as DBEvaluation[]
      const mapped = dbEvals.map(row =>
        parseEvaluationText(row.evaluation_text, row.id, row.opportunity_id, row.created_at)
      )
      setEvaluations(mapped)

      // Use the most recent evaluation for the conversation
      if (dbEvals.length > 0) {
        const latestId = dbEvals[0].id
        setActiveEvaluationId(latestId)

        const { data: msgRows, error: msgError } = await supabase
          .from('ai_conversation_messages')
          .select('*')
          .eq('evaluation_id', latestId)
          .order('created_at', { ascending: true })

        if (msgError) throw msgError

        const dbMessages = (msgRows ?? []) as DBMessage[]
        setConversation(dbMessages.map(mapDBMessageToConversation))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando evaluaciones')
    }
  }, [opportunityId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Evaluate ──────────────────────────────────────────────────────────────

  const evaluate = useCallback(async () => {
    setIsEvaluating(true)
    setError(null)

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('ai-proxy', {
        body: { action: 'evaluate', opportunityId, projectId },
      })

      if (fnError) throw new Error(fnError.message ?? 'Edge Function error')

      // The Edge Function returns { success, data } where data is the saved evaluation row
      const payload = result?.data ?? result
      const savedEval = payload as DBEvaluation

      const newEval = parseEvaluationText(
        savedEval.evaluation_text,
        savedEval.id,
        savedEval.opportunity_id,
        savedEval.created_at
      )

      setEvaluations(prev => [newEval, ...prev])
      setActiveEvaluationId(savedEval.id)
      // Reset conversation when a new evaluation starts
      setConversation([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al evaluar la oportunidad')
    } finally {
      setIsEvaluating(false)
    }
  }, [opportunityId, projectId])

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeEvaluationId || !content.trim()) return

      setIsSendingMessage(true)
      setError(null)

      // Optimistic user message
      const tempUserMsg: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      setConversation(prev => [...prev, tempUserMsg])

      try {
        const { data: result, error: fnError } = await supabase.functions.invoke('ai-proxy', {
          body: {
            action: 'send-message',
            opportunityId,
            projectId,
            message: content,
            evaluationId: activeEvaluationId,
          },
        })

        if (fnError) throw new Error(fnError.message ?? 'Edge Function error')

        // The Edge Function returns { success, data: { userMessage, assistantMessage } }
        const payload = result?.data ?? result
        const savedUserMsg = payload.userMessage as DBMessage
        const savedAssistantMsg = payload.assistantMessage as DBMessage

        const persistedUserMsg = mapDBMessageToConversation(savedUserMsg)
        const assistantConvMsg = mapDBMessageToConversation(savedAssistantMsg)

        // Replace optimistic user msg with persisted one and add assistant msg
        setConversation(prev => [
          ...prev.filter(m => m.id !== tempUserMsg.id),
          persistedUserMsg,
          assistantConvMsg,
        ])
      } catch (err) {
        // Remove optimistic message on error
        setConversation(prev => prev.filter(m => m.id !== tempUserMsg.id))
        setError(err instanceof Error ? err.message : 'Error al enviar el mensaje')
      } finally {
        setIsSendingMessage(false)
      }
    },
    [activeEvaluationId, opportunityId, projectId]
  )

  // ── Apply suggestion ───────────────────────────────────────────────────────
  // Returns parsed actions so the calling view can open the confirmation dialog.

  const applySuggestion = useCallback(
    (messageId: string): SuggestionAction[] => {
      const message = conversation.find((m) => m.id === messageId)
      if (!message) return [{ type: 'manual', description: 'Mensaje no encontrado', data: {} }]
      return parseSuggestion(message.content)
    },
    [conversation]
  )

  // ── Execute confirmed actions against Supabase ────────────────────────────

  const executeActions = useCallback(
    async (actions: SuggestionAction[]): Promise<number> => {
      let applied = 0

      for (const action of actions) {
        try {
          switch (action.type) {
            case 'add_hypothesis': {
              const desc =
                (action.data.description as string) ?? action.description
              // Insert as solution (Torres methodology alignment)
              const { error: insertErr } = await supabase
                .from('solutions')
                .insert({
                  opportunity_id: opportunityId,
                  name: desc,
                  description: '',
                })
              if (!insertErr) applied++
              break
            }

            case 'add_evidence': {
              const content =
                (action.data.content as string) ?? action.description
              const evidenceType =
                (action.data.type as string) ?? 'observacion'
              const { error: insertErr } = await supabase
                .from('opportunity_evidence')
                .insert({
                  opportunity_id: opportunityId,
                  type: evidenceType,
                  content,
                })
              if (!insertErr) applied++
              break
            }

            case 'update_description': {
              const desc =
                (action.data.description as string) ?? action.description
              const { error: updateErr } = await supabase
                .from('opportunities')
                .update({ description: desc })
                .eq('id', opportunityId)
              if (!updateErr) applied++
              break
            }

            case 'suggest_experiment': {
              // Don't auto-create an experiment; just note it as a solution
              // so the user can design the experiment details themselves.
              const desc =
                (action.data.description as string) ?? action.description
              const { error: insertErr } = await supabase
                .from('solutions')
                .insert({
                  opportunity_id: opportunityId,
                  name: `[Experimento sugerido] ${desc}`,
                  description: '',
                })
              if (!insertErr) applied++
              break
            }

            case 'manual':
              // No-op — already shown to the user
              break
          }
        } catch {
          // Individual action failure doesn't block the rest
        }
      }

      // Notify via toast
      if (applied > 0) {
        window.dispatchEvent(
          new CustomEvent('ost:toast', {
            detail: {
              message: `${applied} cambio${applied !== 1 ? 's' : ''} aplicado${applied !== 1 ? 's' : ''} al OST`,
              type: 'success',
            },
          })
        )
      } else {
        window.dispatchEvent(
          new CustomEvent('ost:toast', {
            detail: { message: 'No se pudieron aplicar los cambios', type: 'error' },
          })
        )
      }

      return applied
    },
    [opportunityId]
  )

  return {
    evaluations,
    conversation,
    isEvaluating,
    isSendingMessage,
    error,
    evaluate,
    sendMessage,
    applySuggestion,
    executeActions,
  }
}
