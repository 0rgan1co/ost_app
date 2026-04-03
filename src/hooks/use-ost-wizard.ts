import { useState, useCallback, useRef } from 'react'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import { supabase } from '../lib/supabase'

export interface WizardMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type WizardPhase =
  | 'intro'
  | 'challenge'
  | 'context'
  | 'opportunities'
  | 'evidence'
  | 'hypotheses'
  | 'review'
  | 'done'

const PHASE_ORDER: WizardPhase[] = [
  'intro', 'challenge', 'context', 'opportunities', 'evidence', 'hypotheses', 'review', 'done',
]

const SYSTEM_PROMPT = `Eres un facilitador experto en Product Discovery y Opportunity Solution Tree (Teresa Torres).
Tu rol es guiar al usuario paso a paso para completar su OST de forma conversacional.

REGLAS:
- Haz UNA pregunta a la vez, nunca más
- Sé conciso y directo (2-3 oraciones máximo por mensaje)
- Usa español natural y cercano
- Cuando el usuario responda, confirma brevemente y avanza a la siguiente pregunta
- Si la respuesta es vaga, pide que sea más específica

FLUJO (sigue este orden exacto):
1. CHALLENGE: Pregunta cuál es el desafío estratégico que le gustaría encarar
2. CONTEXT: Pregunta por el contexto: ¿Quién es tu usuario target? ¿Qué restricciones importantes tienen?
3. OPPORTUNITIES: Pregunta qué problemas u oportunidades del usuario has identificado (pide al menos 2-3)
4. EVIDENCE: Para cada oportunidad, pregunta qué evidencia la soporta (citas de usuarios, datos, observaciones)
5. HYPOTHESES: Para cada oportunidad, pregunta qué soluciones están considerando
6. REVIEW: Resume todo el OST y da feedback constructivo sobre fortalezas y brechas

IMPORTANTE: Responde SOLO con texto plano en español. NO uses JSON. NO uses formato estructurado. Solo texto conversacional natural.`

export function useOSTWizard(projectId: string, projectName: string) {
  const [messages, setMessages] = useState<WizardMessage[]>([])
  const [phase, setPhase] = useState<WizardPhase>('intro')
  const [sending, setSending] = useState(false)
  const [savedOpportunities, setSavedOpportunities] = useState<{ name: string; id: string }[]>([])
  // Keep full API history in a ref to avoid serialization issues
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  const startWizard = useCallback(async () => {
    setSending(true)

    const firstUserMsg = `Acabo de crear un proyecto llamado "${projectName}". Quiero completar su OST. Empezá con la primera pregunta.`

    try {
      apiHistoryRef.current = [{ role: 'user', content: firstUserMsg }]

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: apiHistoryRef.current,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      apiHistoryRef.current.push({ role: 'assistant', content: text })

      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
      }])
      setPhase('challenge')
    } catch (err) {
      console.error('Wizard start error:', err)
      const fallback = `¡Hola! Vamos a armar tu OST para "${projectName}". Contame: ¿cuál es el desafío estratégico que te gustaría encarar con este proyecto?`

      apiHistoryRef.current = [
        { role: 'user', content: firstUserMsg },
        { role: 'assistant', content: fallback },
      ]

      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fallback,
      }])
      setPhase('challenge')
    }
    setSending(false)
  }, [projectName])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || sending) return

    const userMsg: WizardMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText.trim(),
    }

    setMessages(prev => [...prev, userMsg])
    setSending(true)

    // Add to API history
    apiHistoryRef.current.push({ role: 'user', content: userText.trim() })

    try {
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: apiHistoryRef.current,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      // Add to API history
      apiHistoryRef.current.push({ role: 'assistant', content: text })

      // Try to extract and save data based on current phase
      await tryExtractAndSave(text, userText.trim(), phase, projectId, savedOpportunities, setSavedOpportunities)

      // Advance phase based on conversation progress
      advancePhase(text, phase, setPhase)

      const assistantMsg: WizardMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('Wizard send error:', err)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hubo un error procesando tu respuesta. ¿Podés intentar de nuevo?',
      }])
      // Remove the failed user message from API history so we don't break alternation
      apiHistoryRef.current.pop()
    }

    setSending(false)
  }, [messages, sending, phase, projectId, projectName, savedOpportunities])

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<WizardPhase, string> = {
  intro: 'Inicio',
  challenge: 'Desafío estratégico',
  context: 'Contexto',
  opportunities: 'Oportunidades',
  evidence: 'Evidencia',
  hypotheses: 'Hipótesis de solución',
  review: 'Revisión y feedback',
  done: 'Completado',
}

function advancePhase(
  assistantText: string,
  currentPhase: WizardPhase,
  setPhase: (p: WizardPhase) => void,
) {
  const lower = assistantText.toLowerCase()

  // Detect phase transitions from assistant's questions
  if (currentPhase === 'challenge' && (lower.includes('usuario') || lower.includes('target') || lower.includes('restricci'))) {
    setPhase('context')
  } else if (currentPhase === 'context' && (lower.includes('oportunidad') || lower.includes('problema') || lower.includes('necesidad'))) {
    setPhase('opportunities')
  } else if (currentPhase === 'opportunities' && (lower.includes('evidencia') || lower.includes('dato') || lower.includes('cita') || lower.includes('observ'))) {
    setPhase('evidence')
  } else if (currentPhase === 'evidence' && (lower.includes('solución') || lower.includes('hipótesis') || lower.includes('solucion'))) {
    setPhase('hypotheses')
  } else if (currentPhase === 'hypotheses' && (lower.includes('resumen') || lower.includes('feedback') || lower.includes('fortaleza') || lower.includes('brecha'))) {
    setPhase('review')
  } else if (currentPhase === 'review' && (lower.includes('completado') || lower.includes('listo') || lower.includes('éxito'))) {
    setPhase('done')
  }
}

async function tryExtractAndSave(
  _assistantText: string,
  userText: string,
  phase: WizardPhase,
  projectId: string,
  savedOpps: { name: string; id: string }[],
  setSavedOpps: (fn: (prev: { name: string; id: string }[]) => { name: string; id: string }[]) => void,
) {
  try {
    switch (phase) {
      case 'challenge': {
        // Save the challenge as the project outcome / north star
        const { data: existing } = await supabase
          .from('business_context')
          .select('id')
          .eq('project_id', projectId)
          .maybeSingle()

        const content = { northStar: userText, targetSegment: '', keyConstraints: '' }
        if (existing) {
          await supabase.from('business_context').update({ content }).eq('id', existing.id)
        } else {
          await supabase.from('business_context').insert({ project_id: projectId, content })
        }
        break
      }

      case 'context': {
        // Update business context with target/constraints info
        const { data: existing } = await supabase
          .from('business_context')
          .select('id, content')
          .eq('project_id', projectId)
          .maybeSingle()

        if (existing) {
          const prev = (existing.content as any) ?? {}
          await supabase.from('business_context').update({
            content: { ...prev, targetSegment: userText },
          }).eq('id', existing.id)
        }
        break
      }

      case 'opportunities': {
        // Parse opportunities from user text (split by line breaks, numbers, or bullets)
        const lines = userText.split(/[\n,]/)
          .map(l => l.replace(/^[\d\-\.\)\s•]+/, '').trim())
          .filter(l => l.length > 5)

        for (const name of lines) {
          const { data: inserted, error } = await supabase
            .from('opportunities')
            .insert({
              project_id: projectId,
              parent_id: null,
              name,
            })
            .select('id, name')
            .single()

          if (!error && inserted) {
            setSavedOpps(prev => [...prev, { name: inserted.name, id: inserted.id }])
          }
        }
        break
      }

      case 'evidence': {
        // Try to match evidence to an opportunity
        if (savedOpps.length > 0) {
          const opp = savedOpps[0] // Associate with first opp if can't determine
          await supabase.from('opportunity_evidence').insert({
            opportunity_id: opp.id,
            type: 'observacion',
            content: userText,
          })
        }
        break
      }

      case 'hypotheses': {
        if (savedOpps.length > 0) {
          const opp = savedOpps[0]
          const lines = userText.split(/[\n,]/)
            .map(l => l.replace(/^[\d\-\.\)\s•]+/, '').trim())
            .filter(l => l.length > 5)

          for (const desc of lines) {
            await supabase.from('hypotheses').insert({
              opportunity_id: opp.id,
              description: desc,
              status: 'to do',
            })
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('Error saving wizard data:', err)
  }
}
