import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { anthropic, AI_MODEL } from '../lib/anthropic'

export interface WizardMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type WizardPhase =
  | 'challenge'
  | 'target'
  | 'constraints'
  | 'opportunities'
  | 'evidence'
  | 'hypotheses'
  | 'feedback'
  | 'done'

const PHASE_ORDER: WizardPhase[] = [
  'challenge', 'target', 'constraints', 'opportunities', 'evidence', 'hypotheses', 'feedback', 'done',
]

// ─── Hardcoded questions per phase ────────────────────────────────────────────

const QUESTIONS: Record<WizardPhase, string> = {
  challenge: '',
  target: '¿Quién es tu usuario target? Describilo brevemente: qué hace, qué necesita, qué le duele.',
  constraints: '¿Qué restricciones importantes tienen? (presupuesto, tecnología, tiempo, regulación, equipo...)',
  opportunities: 'Listá 2-3 oportunidades o problemas del usuario que quieras explorar. Separalas con punto y coma o una por línea.',
  evidence: '¿Qué evidencia tenés para estas oportunidades? (citas de usuarios, datos, observaciones). Si no tenés aún, escribí "ninguna por ahora".',
  hypotheses: '¿Qué ideas de solución están considerando para estas oportunidades? Listá las que se te ocurran.',
  feedback: '',
  done: '',
}

const CONFIRMATIONS: Record<string, (input: string) => string> = {
  challenge: (input) => `Perfecto, tu desafío estratégico es: **${input.slice(0, 100)}${input.length > 100 ? '...' : ''}**`,
  target: () => 'Entendido, tengo el perfil de tu usuario.',
  constraints: () => 'Anotado. Estas restricciones son clave para enfocar las soluciones.',
  opportunities: (input) => {
    const count = parseItems(input).length
    return `Registré ${count} oportunidad${count !== 1 ? 'es' : ''}. Ahora veamos la evidencia.`
  },
  evidence: () => 'Evidencia registrada.',
  hypotheses: () => '¡Genial! Ya tengo todo para armar tu OST. Dame un momento para analizar y darte feedback...',
}

function parseItems(text: string): string[] {
  return text
    .split(/[;\n]/)
    .map(l => l.replace(/^[\d\-\.\)\s•]+/, '').trim())
    .filter(l => l.length > 3)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOSTWizard(projectId: string, projectName: string) {
  const [messages, setMessages] = useState<WizardMessage[]>([])
  const [phase, setPhase] = useState<WizardPhase>('challenge')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const collectedRef = useRef<Record<string, string>>({})

  const msg = (role: 'user' | 'assistant', content: string): WizardMessage => ({
    id: crypto.randomUUID(), role, content,
  })

  const startWizard = useCallback(() => {
    const greeting = `¡Hola! Vamos a armar el OST de **"${projectName}"** paso a paso. Contame: ¿cuál es el desafío estratégico que te gustaría encarar?`
    setMessages([msg('assistant', greeting)])
    setPhase('challenge')
  }, [projectName])

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || sendingRef.current) return
    sendingRef.current = true
    setSending(true)

    const trimmed = userText.trim()
    const currentPhase = phase

    // Store answer
    collectedRef.current[currentPhase] = trimmed

    // Show user message
    const newMsgs: WizardMessage[] = [msg('user', trimmed)]

    // Confirmation
    const confirmFn = CONFIRMATIONS[currentPhase]
    if (confirmFn) {
      newMsgs.push(msg('assistant', confirmFn(trimmed)))
    }

    // Save data to Supabase
    await savePhaseData(currentPhase, trimmed, projectId, collectedRef.current)

    // Determine next phase
    const currentIdx = PHASE_ORDER.indexOf(currentPhase)
    const nextPhase = PHASE_ORDER[currentIdx + 1] as WizardPhase | undefined

    if (nextPhase && nextPhase !== 'feedback' && nextPhase !== 'done') {
      // Ask next question
      const question = QUESTIONS[nextPhase]
      if (question) {
        newMsgs.push(msg('assistant', question))
      }
      setMessages(prev => [...prev, ...newMsgs])
      setPhase(nextPhase)
    } else if (nextPhase === 'feedback') {
      // Generate AI feedback
      setMessages(prev => [...prev, ...newMsgs])
      setPhase('feedback')

      // Call Claude for feedback
      try {
        const feedbackText = await generateFeedback(collectedRef.current, projectName)
        setMessages(prev => [...prev, msg('assistant', feedbackText)])
        setPhase('done')
      } catch (err) {
        console.error('Feedback error:', err)
        setMessages(prev => [...prev, msg('assistant', '¡Tu OST está armado! Podés verlo en la sección OST Tree. Revisá las oportunidades y agregá más evidencia para fortalecer tus hipótesis.')])
        setPhase('done')
      }
    }

    setSending(false)
    sendingRef.current = false
  }, [phase, projectId, projectName])

  const currentPhaseLabel = PHASE_LABELS[phase] ?? ''
  const progress = Math.round((PHASE_ORDER.indexOf(phase) / (PHASE_ORDER.length - 1)) * 100)

  return { messages, phase, currentPhaseLabel, progress, sending, startWizard, sendMessage }
}

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<WizardPhase, string> = {
  challenge: 'Desafío estratégico',
  target: 'Usuario target',
  constraints: 'Restricciones',
  opportunities: 'Oportunidades',
  evidence: 'Evidencia',
  hypotheses: 'Hipótesis de solución',
  feedback: 'Generando feedback...',
  done: 'Completado',
}

// ─── Save data to Supabase ────────────────────────────────────────────────────

async function savePhaseData(
  phase: string,
  userText: string,
  projectId: string,
  _collected: Record<string, string>,
) {
  try {
    switch (phase) {
      case 'challenge': {
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

      case 'target': {
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

      case 'constraints': {
        const { data: existing } = await supabase
          .from('business_context')
          .select('id, content')
          .eq('project_id', projectId)
          .maybeSingle()
        if (existing) {
          const prev = (existing.content as any) ?? {}
          await supabase.from('business_context').update({
            content: { ...prev, keyConstraints: userText },
          }).eq('id', existing.id)
        }
        break
      }

      case 'opportunities': {
        const items = parseItems(userText)
        for (const name of items) {
          await supabase.from('opportunities').insert({
            project_id: projectId,
            parent_id: null,
            name,
          })
        }
        break
      }

      case 'evidence': {
        if (userText.toLowerCase().includes('ninguna')) break
        // Associate evidence with the first opportunity
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id')
          .eq('project_id', projectId)
          .limit(1)
        if (opps?.[0]) {
          await supabase.from('opportunity_evidence').insert({
            opportunity_id: opps[0].id,
            type: 'observacion',
            content: userText,
          })
        }
        break
      }

      case 'hypotheses': {
        const items = parseItems(userText)
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id')
          .eq('project_id', projectId)
          .limit(1)
        if (opps?.[0]) {
          for (const desc of items) {
            await supabase.from('hypotheses').insert({
              opportunity_id: opps[0].id,
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

// ─── Claude feedback ──────────────────────────────────────────────────────────

async function generateFeedback(collected: Record<string, string>, projectName: string): Promise<string> {
  const prompt = `Sos un experto en Product Discovery y Opportunity Solution Tree (Teresa Torres).

Acabo de completar el OST inicial del proyecto "${projectName}". Acá está lo que armé:

**Desafío estratégico:** ${collected.challenge || 'No definido'}
**Usuario target:** ${collected.target || 'No definido'}
**Restricciones:** ${collected.constraints || 'No definidas'}
**Oportunidades:** ${collected.opportunities || 'No definidas'}
**Evidencia:** ${collected.evidence || 'Ninguna aún'}
**Hipótesis de solución:** ${collected.hypotheses || 'Ninguna aún'}

Dame feedback breve (máximo 5 oraciones) sobre:
1. Qué está bien armado
2. Qué le falta o podría mejorar
3. Un next step concreto que me recomendás

Respondé en español, directo y práctico. No uses JSON.`

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : 'OST creado exitosamente.'
}
