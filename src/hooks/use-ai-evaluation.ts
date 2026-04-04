import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import type { AIEvaluation, ConversationMessage, EvaluationSection } from '../types'

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

interface DBHypothesis {
  id: string
  description: string
  status: string
  result: string | null
}

interface DBExperiment {
  id: string
  hypothesis_id: string
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
  applySuggestion: (messageId: string) => void
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
  const hasSuggestion =
    msg.role === 'assistant' &&
    (msg.content.toLowerCase().includes('sugerencia') ||
      msg.content.toLowerCase().includes('te sugiero') ||
      msg.content.toLowerCase().includes('recomiendo agregar') ||
      msg.content.toLowerCase().includes('podrías agregar'))

  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    hasSuggestion,
    suggestionSummary: hasSuggestion ? 'Aplicar esta sugerencia al OST' : undefined,
    createdAt: msg.created_at,
  }
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

async function buildEvaluationPrompt(
  opportunityId: string,
  projectId: string
): Promise<string> {
  // Fetch all required data in parallel
  const [
    { data: oppData },
    { data: evidenceData },
    { data: hypothesesData },
    { data: contextData },
  ] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, name, description, outcome')
      .eq('id', opportunityId)
      .single<DBOpportunity>(),
    supabase
      .from('opportunity_evidence')
      .select('id, type, content, source')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true }),
    supabase
      .from('hypotheses')
      .select('id, description, status, result')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true }),
    supabase
      .from('business_context')
      .select('content')
      .eq('project_id', projectId)
      .single<DBBusinessContext>(),
  ])

  const opp = oppData as DBOpportunity | null
  const evidence = (evidenceData ?? []) as DBEvidence[]
  const hypotheses = (hypothesesData ?? []) as DBHypothesis[]

  // Parse business context
  let bizContext: ParsedBusinessContext = {
    northStar: 'No definido',
    targetSegment: 'No definido',
    keyConstraints: 'No definido',
  }
  if (contextData?.content) {
    try {
      bizContext = JSON.parse(contextData.content) as ParsedBusinessContext
    } catch {
      // Use defaults if parse fails
    }
  }

  // Fetch experiments for each hypothesis
  const hypothesisIds = hypotheses.map(h => h.id)
  let experiments: DBExperiment[] = []
  if (hypothesisIds.length > 0) {
    const { data: expData } = await supabase
      .from('experiments')
      .select('id, hypothesis_id, type, description, success_criterion, effort, impact, status, result')
      .in('hypothesis_id', hypothesisIds)
      .order('created_at', { ascending: true })
    experiments = (expData ?? []) as DBExperiment[]
  }

  // Map experiments by hypothesis
  const expByHypothesis = new Map<string, DBExperiment[]>()
  experiments.forEach(exp => {
    const list = expByHypothesis.get(exp.hypothesis_id) ?? []
    list.push(exp)
    expByHypothesis.set(exp.hypothesis_id, list)
  })

  // Build prompt sections
  const evidenceText =
    evidence.length === 0
      ? '  (sin evidencia registrada)'
      : evidence
          .map(e => `  - [${e.type}] ${e.content}${e.source ? ` (fuente: ${e.source})` : ''}`)
          .join('\n')

  const hypothesesText =
    hypotheses.length === 0
      ? '  (sin hipótesis registradas)'
      : hypotheses
          .map(h => {
            const exps = expByHypothesis.get(h.id) ?? []
            const expsText =
              exps.length === 0
                ? '    (sin experimentos)'
                : exps
                    .map(
                      e =>
                        `    - [${e.type}] ${e.description} | criterio: ${e.success_criterion} | esfuerzo: ${e.effort} | impacto: ${e.impact} | estado: ${e.status}${e.result ? ` | resultado: ${e.result}` : ''}`
                    )
                    .join('\n')
            return `  - Hipótesis: ${h.description} (${h.status})${h.result ? ` → resultado: ${h.result}` : ''}\n${expsText}`
          })
          .join('\n')

  return `Eres un experto en product discovery usando el Opportunity Solution Tree (OST) de Teresa Torres.

Analiza la siguiente oportunidad y proporciona una evaluación estructurada.

## Contexto de negocio del proyecto

- North Star: ${bizContext.northStar}
- Segmento objetivo: ${bizContext.targetSegment}
- Restricciones clave: ${bizContext.keyConstraints}

## Oportunidad a evaluar

- Nombre: ${opp?.name ?? 'Sin nombre'}
- Descripción: ${opp?.description ?? 'Sin descripción'}
- Outcome esperado: ${opp?.outcome ?? 'No especificado'}

## Evidencia recopilada

${evidenceText}

## Hipótesis y experimentos

${hypothesesText}

## Instrucciones de respuesta

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura exacta:
{
  "sections": [
    { "title": "Fortalezas", "content": "..." },
    { "title": "Brechas", "content": "..." },
    { "title": "Recomendaciones", "content": "..." },
    { "title": "Experimentos sugeridos", "content": "..." }
  ]
}

Cada sección debe ser concisa (3-5 puntos) y accionable para el equipo de producto.`
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
      const prompt = await buildEvaluationPrompt(opportunityId, projectId)

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })

      const rawText =
        response.content[0].type === 'text' ? response.content[0].text : ''

      // Persist to Supabase
      const { data: savedEval, error: saveError } = await supabase
        .from('ai_evaluations')
        .insert({
          opportunity_id: opportunityId,
          prompt_snapshot: prompt,
          evaluation_text: rawText,
        })
        .select()
        .single<DBEvaluation>()

      if (saveError) throw saveError

      const newEval = parseEvaluationText(
        rawText,
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
        // Persist user message
        const { data: savedUserMsg, error: userMsgError } = await supabase
          .from('ai_conversation_messages')
          .insert({
            evaluation_id: activeEvaluationId,
            role: 'user',
            content,
          })
          .select()
          .single<DBMessage>()

        if (userMsgError) throw userMsgError

        // Build message history for the API call
        const historyForAPI = conversation
          .filter(m => m.id !== tempUserMsg.id) // exclude the optimistic one
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

        // Add the current user message
        historyForAPI.push({ role: 'user', content })

        // Get the evaluation context for the system message
        const latestEval = evaluations[0]
        const systemContext = latestEval
          ? `Eres un experto en product discovery (OST de Teresa Torres). Estás en una conversación de refinamiento sobre una evaluación previa. La evaluación inicial fue:\n\n${latestEval.rawText}`
          : 'Eres un experto en product discovery usando el Opportunity Solution Tree (OST) de Teresa Torres.'

        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1024,
          system: systemContext,
          messages: historyForAPI,
        })

        const assistantText =
          response.content[0].type === 'text' ? response.content[0].text : ''

        // Persist assistant message
        const { data: savedAssistantMsg, error: assistantMsgError } = await supabase
          .from('ai_conversation_messages')
          .insert({
            evaluation_id: activeEvaluationId,
            role: 'assistant',
            content: assistantText,
          })
          .select()
          .single<DBMessage>()

        if (assistantMsgError) throw assistantMsgError

        const assistantConvMsg = mapDBMessageToConversation(savedAssistantMsg)

        // Replace optimistic user msg with persisted one and add assistant msg
        const persistedUserMsg = mapDBMessageToConversation(savedUserMsg)
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
    [activeEvaluationId, conversation, evaluations]
  )

  // ── Apply suggestion (placeholder) ────────────────────────────────────────

  const applySuggestion = useCallback(async (messageId: string) => {
    const msg = conversation.find(m => m.id === messageId)
    if (!msg) return

    try {
      // Ask Claude to extract actionable items from the suggestion
      const extractPrompt = `Del siguiente mensaje de evaluación, extraé las acciones concretas que se pueden aplicar al OST.

Mensaje: "${msg.content}"

Respondé SOLO con un JSON array. Cada item tiene: type ("add_opportunity" | "add_hypothesis" | "add_evidence") y data con los campos necesarios.
Ejemplo: [{"type":"add_opportunity","data":{"name":"..."}}, {"type":"add_hypothesis","data":{"opportunityIndex":0,"description":"..."}}]
Si no hay acciones claras, respondé []`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: extractPrompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No actions found')

      const actions = JSON.parse(match[0])
      let applied = 0

      // Get existing opportunities for context
      const { data: opps } = await supabase
        .from('opportunities')
        .select('id, name')
        .eq('project_id', projectId)
        .eq('archived', false)

      for (const action of actions) {
        if (action.type === 'add_opportunity' && action.data?.name) {
          await supabase.from('opportunities').insert({
            project_id: projectId, parent_id: null, name: action.data.name,
            description: action.data.description ?? null,
          })
          applied++
        } else if (action.type === 'add_hypothesis' && action.data?.description && opps?.length) {
          const targetOpp = opps[action.data.opportunityIndex ?? 0] ?? opps[0]
          await supabase.from('hypotheses').insert({
            opportunity_id: targetOpp.id, description: action.data.description, status: 'to do',
          })
          applied++
        } else if (action.type === 'add_evidence' && action.data?.content && opps?.length) {
          const targetOpp = opps[action.data.opportunityIndex ?? 0] ?? opps[0]
          await supabase.from('opportunity_evidence').insert({
            opportunity_id: targetOpp.id, type: action.data.type ?? 'observacion',
            content: action.data.content, source: action.data.source ?? null,
          })
          applied++
        }
      }

      window.dispatchEvent(new CustomEvent('ost:toast', {
        detail: {
          message: applied > 0 ? `${applied} sugerencia${applied > 1 ? 's' : ''} aplicada${applied > 1 ? 's' : ''} al OST` : 'No se encontraron acciones aplicables',
          type: applied > 0 ? 'success' : 'error',
        },
      }))
    } catch (err) {
      console.error('Apply suggestion error:', err)
      window.dispatchEvent(new CustomEvent('ost:toast', {
        detail: { message: 'Error al aplicar sugerencia', type: 'error' },
      }))
    }
  }, [conversation, projectId])

  return {
    evaluations,
    conversation,
    isEvaluating,
    isSendingMessage,
    error,
    evaluate,
    sendMessage,
    applySuggestion,
  }
}
