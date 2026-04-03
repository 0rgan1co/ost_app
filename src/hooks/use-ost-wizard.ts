import { useState, useCallback } from 'react'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import { supabase } from '../lib/supabase'

export interface WizardMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type WizardPhase =
  | 'intro'
  | 'context'
  | 'outcome'
  | 'opportunities'
  | 'evidence'
  | 'hypotheses'
  | 'review'
  | 'done'

const PHASE_ORDER: WizardPhase[] = [
  'intro', 'context', 'outcome', 'opportunities', 'evidence', 'hypotheses', 'review', 'done',
]

const SYSTEM_PROMPT = `Eres un facilitador experto en Product Discovery y Opportunity Solution Tree (Teresa Torres).
Tu rol es guiar al usuario paso a paso para completar su OST de forma conversacional.

REGLAS:
- Haz UNA pregunta a la vez, nunca más
- Sé conciso y directo (2-3 oraciones máximo por mensaje)
- Usa español natural y cercano
- Cuando el usuario responda, extrae la información clave y confirma brevemente antes de avanzar
- Si la respuesta es vaga, pide que sea más específica con un ejemplo

FLUJO (sigue este orden exacto):
1. CONTEXT: Pregunta por el contexto de negocio: ¿Cuál es el North Star o resultado estratégico a 12 meses? ¿Quién es tu usuario target? ¿Qué restricciones importantes tienen?
2. OUTCOME: Pregunta por el outcome específico del proyecto: ¿Qué resultado medible querés lograr con este proyecto?
3. OPPORTUNITIES: Pregunta qué problemas u oportunidades del usuario has identificado (pide al menos 2-3)
4. EVIDENCE: Para cada oportunidad, pregunta qué evidencia la soporta (citas de usuarios, datos, observaciones)
5. HYPOTHESES: Para cada oportunidad, pregunta qué soluciones están considerando
6. REVIEW: Resume el OST completo y da feedback sobre fortalezas y brechas

FORMATO DE RESPUESTA:
Responde SIEMPRE en este formato JSON:
{
  "message": "Tu mensaje al usuario (markdown permitido)",
  "phase": "context|outcome|opportunities|evidence|hypotheses|review",
  "extracted": null | {
    "type": "context|outcome|opportunity|evidence|hypothesis|review",
    "data": { ... datos extraídos ... }
  }
}

Cuando extraigas datos, usa estas estructuras en "data":
- context: { "northStar": "...", "targetSegment": "...", "keyConstraints": "..." }
- outcome: { "outcome": "..." }
- opportunity: { "opportunities": [{ "name": "...", "description": "..." }] }
- evidence: { "opportunityName": "...", "evidence": [{ "type": "cita|hecho|observacion", "content": "...", "source": "..." }] }
- hypothesis: { "opportunityName": "...", "hypotheses": [{ "description": "..." }] }
- review: { "feedback": "..." }

Si no hay datos que extraer en ese turno, usa "extracted": null.`

export function useOSTWizard(projectId: string, projectName: string) {
  const [messages, setMessages] = useState<WizardMessage[]>([])
  const [phase, setPhase] = useState<WizardPhase>('intro')
  const [sending, setSending] = useState(false)
  const [savedOpportunities, setSavedOpportunities] = useState<{ name: string; id: string }[]>([])

  const startWizard = useCallback(async () => {
    setSending(true)
    try {
      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Acabo de crear un proyecto llamado "${projectName}". Guíame para completar su OST. Empieza con la primera pregunta sobre contexto de negocio.`,
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = tryParseJSON(text)

      const assistantMsg: WizardMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: parsed?.message ?? text,
      }

      if (parsed?.phase) setPhase(parsed.phase as WizardPhase)

      setMessages([assistantMsg])
    } catch (err) {
      console.error('Wizard start error:', err)
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '¡Hola! Vamos a completar tu OST paso a paso. ¿Cuál es el North Star o resultado estratégico a 12 meses de tu producto/empresa?',
      }])
      setPhase('context')
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

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setSending(true)

    try {
      // Build message history for Claude
      const apiMessages = [
        {
          role: 'user' as const,
          content: `Acabo de crear un proyecto llamado "${projectName}". Guíame para completar su OST.`,
        },
        ...newMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.role === 'assistant' ? JSON.stringify({ message: m.content, phase, extracted: null }) : m.content,
        })),
      ]

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = tryParseJSON(text)

      // Save extracted data to Supabase
      if (parsed?.extracted) {
        await saveExtractedData(parsed.extracted, projectId, savedOpportunities, setSavedOpportunities)
      }

      const newPhase = parsed?.phase as WizardPhase | undefined
      if (newPhase) setPhase(newPhase)

      const assistantMsg: WizardMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: parsed?.message ?? text,
      }

      setMessages(prev => [...prev, assistantMsg])

      if (newPhase === 'done') setPhase('done')
    } catch (err) {
      console.error('Wizard send error:', err)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Hubo un error procesando tu respuesta. ¿Podés intentar de nuevo?',
      }])
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
  context: 'Contexto de negocio',
  outcome: 'Outcome del proyecto',
  opportunities: 'Oportunidades',
  evidence: 'Evidencia',
  hypotheses: 'Hipótesis de solución',
  review: 'Revisión y feedback',
  done: 'Completado',
}

function tryParseJSON(text: string): { message?: string; phase?: string; extracted?: any } | null {
  try {
    // Try to extract JSON from the text (might be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

async function saveExtractedData(
  extracted: { type: string; data: any },
  projectId: string,
  savedOpps: { name: string; id: string }[],
  setSavedOpps: (fn: (prev: { name: string; id: string }[]) => { name: string; id: string }[]) => void,
) {
  const { type, data } = extracted
  if (!data) return

  try {
    switch (type) {
      case 'context': {
        const content = {
          northStar: data.northStar ?? '',
          targetSegment: data.targetSegment ?? '',
          keyConstraints: data.keyConstraints ?? '',
        }
        // Upsert business context
        const { data: existing } = await supabase
          .from('business_context')
          .select('id')
          .eq('project_id', projectId)
          .maybeSingle()

        if (existing) {
          await supabase.from('business_context').update({ content }).eq('id', existing.id)
        } else {
          await supabase.from('business_context').insert({ project_id: projectId, content })
        }
        break
      }

      case 'outcome': {
        // Save outcome as project description update
        if (data.outcome) {
          await supabase.from('projects').update({ description: data.outcome }).eq('id', projectId)
        }
        break
      }

      case 'opportunity': {
        const opps = data.opportunities ?? []
        for (const opp of opps) {
          const { data: inserted, error } = await supabase
            .from('opportunities')
            .insert({
              project_id: projectId,
              parent_id: null,
              name: opp.name,
              description: opp.description ?? null,
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
        const oppName = data.opportunityName
        const opp = savedOpps.find(o => o.name.toLowerCase().includes(oppName?.toLowerCase() ?? ''))
        if (!opp) break

        const evidenceItems = data.evidence ?? []
        for (const ev of evidenceItems) {
          await supabase.from('opportunity_evidence').insert({
            opportunity_id: opp.id,
            type: ev.type ?? 'observacion',
            content: ev.content,
            source: ev.source ?? null,
          })
        }
        break
      }

      case 'hypothesis': {
        const oppName = data.opportunityName
        const opp = savedOpps.find(o => o.name.toLowerCase().includes(oppName?.toLowerCase() ?? ''))
        if (!opp) break

        const hypotheses = data.hypotheses ?? []
        for (const h of hypotheses) {
          await supabase.from('hypotheses').insert({
            opportunity_id: opp.id,
            description: h.description,
            status: 'to do',
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('Error saving extracted data:', err)
  }
}
