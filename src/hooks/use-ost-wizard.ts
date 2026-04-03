import { useState, useCallback, useRef } from 'react'
import { anthropic, AI_MODEL } from '../lib/anthropic'

export interface WizardMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type WizardPhase =
  | 'challenge'
  | 'context'
  | 'opportunities'
  | 'evidence'
  | 'hypotheses'
  | 'review'
  | 'done'

const PHASE_ORDER: WizardPhase[] = [
  'challenge', 'context', 'opportunities', 'evidence', 'hypotheses', 'review', 'done',
]

const SYSTEM_PROMPT = `Eres un facilitador experto en Product Discovery y Opportunity Solution Tree (Teresa Torres).
Tu rol es guiar al usuario paso a paso para completar su OST de forma conversacional.

REGLAS:
- Haz UNA pregunta a la vez, nunca más
- Sé conciso y directo (2-3 oraciones máximo por mensaje)
- Usa español natural y cercano
- Cuando el usuario responda, confirma brevemente lo que entendiste y avanza a la siguiente pregunta
- Si la respuesta es vaga, pide que sea más específica

FLUJO (sigue este orden exacto):
1. CHALLENGE: Pregunta cuál es el desafío estratégico que le gustaría encarar
2. CONTEXT: Pregunta por el contexto: ¿Quién es tu usuario target? ¿Qué restricciones importantes tienen?
3. OPPORTUNITIES: Pregunta qué problemas u oportunidades del usuario han identificado (pide al menos 2-3)
4. EVIDENCE: Para cada oportunidad mencionada, pregunta qué evidencia la soporta (citas, datos, observaciones)
5. HYPOTHESES: Para cada oportunidad, pregunta qué soluciones están considerando
6. REVIEW: Resume todo el OST armado y da feedback constructivo sobre fortalezas y brechas

Responde SOLO con texto conversacional natural en español. NO uses JSON ni formato estructurado.`

export function useOSTWizard(_projectId: string, projectName: string) {
  const [messages, setMessages] = useState<WizardMessage[]>([])
  const [phase, setPhase] = useState<WizardPhase>('challenge')
  const [sending, setSending] = useState(false)
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const sendingRef = useRef(false)

  const callClaude = useCallback(async (msgs: { role: 'user' | 'assistant'; content: string }[]): Promise<string> => {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: msgs,
    })
    return response.content[0].type === 'text' ? response.content[0].text : ''
  }, [])

  const startWizard = useCallback(async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    setSending(true)

    const initMsg = `Acabo de crear un proyecto llamado "${projectName}". Quiero completar su OST. Empezá con la primera pregunta sobre el desafío estratégico.`
    apiHistoryRef.current = [{ role: 'user', content: initMsg }]

    let reply: string
    try {
      reply = await callClaude(apiHistoryRef.current)
    } catch (err) {
      console.error('Wizard start error:', err)
      reply = `¡Hola! Vamos a armar tu OST para "${projectName}". Contame: ¿cuál es el desafío estratégico que te gustaría encarar con este proyecto?`
    }

    apiHistoryRef.current.push({ role: 'assistant', content: reply })
    setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: reply }])
    setSending(false)
    sendingRef.current = false
  }, [projectName, callClaude])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || sendingRef.current) return
    sendingRef.current = true
    setSending(true)

    const trimmed = userText.trim()

    // Optimistic UI: show user message immediately
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }])

    // Add to API history
    apiHistoryRef.current.push({ role: 'user', content: trimmed })

    let reply: string
    try {
      reply = await callClaude(apiHistoryRef.current)
    } catch (err) {
      console.error('Wizard send error:', err)
      // Remove failed user message from history to keep alternation valid
      apiHistoryRef.current.pop()
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hubo un error procesando tu respuesta. ¿Podés intentar de nuevo?',
      }])
      setSending(false)
      sendingRef.current = false
      return
    }

    apiHistoryRef.current.push({ role: 'assistant', content: reply })

    // Advance phase based on what Claude is asking about
    const lower = reply.toLowerCase()
    if (phase === 'challenge' && (lower.includes('usuario') || lower.includes('target') || lower.includes('restricci') || lower.includes('contexto'))) {
      setPhase('context')
    } else if (phase === 'context' && (lower.includes('oportunidad') || lower.includes('problema') || lower.includes('necesidad'))) {
      setPhase('opportunities')
    } else if (phase === 'opportunities' && (lower.includes('evidencia') || lower.includes('dato') || lower.includes('cita') || lower.includes('observ'))) {
      setPhase('evidence')
    } else if (phase === 'evidence' && (lower.includes('solución') || lower.includes('hipótesis') || lower.includes('solucion') || lower.includes('idea'))) {
      setPhase('hypotheses')
    } else if (phase === 'hypotheses' && (lower.includes('resumen') || lower.includes('feedback') || lower.includes('fortaleza') || lower.includes('brecha') || lower.includes('ost completo'))) {
      setPhase('review')
    } else if (phase === 'review') {
      setPhase('done')
    }

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
    setSending(false)
    sendingRef.current = false
  }, [callClaude, phase])

  const currentPhaseLabel = PHASE_LABELS[phase] ?? ''
  const progress = Math.round((PHASE_ORDER.indexOf(phase) / (PHASE_ORDER.length - 1)) * 100)

  return {
    messages,
    phase,
    currentPhaseLabel,
    progress,
    sending,
    startWizard,
    sendMessage,
  }
}

const PHASE_LABELS: Record<WizardPhase, string> = {
  challenge: 'Desafío estratégico',
  context: 'Contexto',
  opportunities: 'Oportunidades',
  evidence: 'Evidencia',
  hypotheses: 'Hipótesis de solución',
  review: 'Revisión y feedback',
  done: 'Completado',
}
