import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'
import { anthropic, AI_MODEL } from '../../../lib/anthropic'
import { supabase } from '../../../lib/supabase'

interface AgentGuideProps {
  projectId: string
  projectName: string
  hasOutcome: boolean
  opportunityCount: number
  solutionCount: number
  experimentCount: number
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string }

const SYSTEM = `Sos un agente guía experto en Product Discovery y Opportunity Solution Tree (Teresa Torres).
Tu trabajo es ayudar al usuario a completar su OST paso a paso.

REGLAS:
- Sé conciso (2-3 oraciones máximo)
- UNA pregunta a la vez
- Confirmá brevemente y avanzá
- Español natural y cercano
- El usuario puede escribir como quiera, vos extraés la info

FLUJO (según lo que falte):
1. OUTCOME: "¿Qué resultado medible querés lograr?"
2. OPORTUNIDADES: "¿Qué problemas o necesidades del usuario identificaste? Contame todos los que se te ocurran."
3. EVIDENCIA: "Para cada oportunidad, ¿qué evidencia tenés?"
4. SOLUCIONES: "¿Qué soluciones podrían resolver cada oportunidad?"
5. EXPERIMENTOS: "¿Cómo validarías cada solución con una prueba de bajo esfuerzo?"

Cuando todo esté completo, felicitalo y sugerí ver el árbol visual.
Respondé SOLO texto conversacional, nunca JSON.`

export function AgentGuide({ projectId, projectName, hasOutcome, opportunityCount, solutionCount, experimentCount }: AgentGuideProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const apiHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const sendingRef = useRef(false)
  const startedRef = useRef(false)

  const isComplete = hasOutcome && opportunityCount > 0 && solutionCount > 0 && experimentCount > 0

  const callClaude = useCallback(async (msgs: { role: 'user' | 'assistant'; content: string }[]): Promise<string> => {
    const r = await anthropic.messages.create({ model: AI_MODEL, max_tokens: 512, system: SYSTEM, messages: msgs })
    return r.content[0].type === 'text' ? r.content[0].text : ''
  }, [])

  // Start conversation when opened
  useEffect(() => {
    if (!open || startedRef.current) return
    startedRef.current = true

    const status = `Proyecto: "${projectName}"\nEstado actual: Outcome=${hasOutcome ? 'sí' : 'no'}, Oportunidades=${opportunityCount}, Soluciones=${solutionCount}, Experimentos=${experimentCount}\n\nAyudame a completar lo que falta.`

    apiHistoryRef.current = [{ role: 'user', content: status }]
    setSending(true)

    callClaude(apiHistoryRef.current).then(reply => {
      apiHistoryRef.current.push({ role: 'assistant', content: reply })
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: reply }])
      setSending(false)
    }).catch(() => {
      const fallback = !hasOutcome
        ? `¡Hola! Vamos a completar tu OST para "${projectName}". Empecemos: ¿cuál es el resultado que querés lograr con este proyecto?`
        : opportunityCount === 0
          ? `Tu outcome está definido. Ahora necesitamos oportunidades: ¿qué problemas o necesidades del usuario identificaste?`
          : `Buen progreso. Tenés ${opportunityCount} oportunidades. ¿Qué soluciones estás considerando para ellas?`
      apiHistoryRef.current.push({ role: 'assistant', content: fallback })
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: fallback }])
      setSending(false)
    })
  }, [open, projectName, hasOutcome, opportunityCount, solutionCount, experimentCount, callClaude])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    const text = input.trim()
    setInput('')

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    apiHistoryRef.current.push({ role: 'user', content: text })

    try {
      const reply = await callClaude(apiHistoryRef.current)
      apiHistoryRef.current.push({ role: 'assistant', content: reply })
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])

      // Try to save data based on what's missing
      await trySaveFromChat(text, projectId, hasOutcome, opportunityCount)
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Error procesando. ¿Podés intentar de nuevo?' }])
      apiHistoryRef.current.pop()
    }

    setSending(false)
    sendingRef.current = false
  }

  if (isComplete) return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-lg shadow-red-900/40 font-[Nunito_Sans] font-semibold text-sm transition-all hover:scale-105"
        >
          <Sparkles size={16} />
          Agente Guía
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Sparkles size={14} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100 font-[Nunito_Sans]">Agente Guía</p>
                <p className="text-[10px] text-slate-500 font-['IBM_Plex_Mono']">Completá tu OST paso a paso</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-[Nunito_Sans] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-red-500 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-red-400" />
                  <span className="text-xs text-slate-500">Pensando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-800">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Escribí tu respuesta..."
                rows={1}
                disabled={sending}
                className="flex-1 resize-none px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 font-[Nunito_Sans] disabled:opacity-50"
              />
              <button onClick={handleSend} disabled={!input.trim() || sending}
                className="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl flex-shrink-0">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Use Claude to extract structured items from free-form text
async function extractItems(userText: string, type: string): Promise<string[]> {
  try {
    const prompt = `Del siguiente texto, extraé cada ${type} individual como un item separado. Devolvé SOLO un JSON array de strings, sin texto adicional.

Texto: "${userText}"

Ejemplo de respuesta: ["item 1", "item 2", "item 3"]`

    const r = await anthropic.messages.create({
      model: AI_MODEL, max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = r.content[0].type === 'text' ? r.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
  } catch {}
  // Fallback: simple split
  return userText.split(/[;\n]/).map(l => l.replace(/^[\d\-\.\)\s•]+/, '').trim()).filter(l => l.length > 3)
}

// Save data from chat responses when possible
async function trySaveFromChat(userText: string, projectId: string, hasOutcome: boolean, oppCount: number) {
  try {
    if (!hasOutcome) {
      const { data: existing } = await supabase.from('business_context').select('id').eq('project_id', projectId).maybeSingle()
      const now = new Date().toISOString()
      const content = JSON.stringify({
        strategicChallenge: { value: '', updatedAt: null },
        northStar: { value: userText, updatedAt: now },
        targetSegment: { value: '', updatedAt: null },
        keyConstraints: { value: '', updatedAt: null },
      })
      if (existing) {
        await supabase.from('business_context').update({ content }).eq('id', existing.id)
      } else {
        await supabase.from('business_context').insert({ project_id: projectId, content })
      }
    } else if (oppCount === 0) {
      // Use AI to extract individual opportunities from free text
      const items = await extractItems(userText, 'oportunidad o problema del usuario')
      for (const name of items) {
        if (name.length > 3) {
          await supabase.from('opportunities').insert({ project_id: projectId, parent_id: null, name })
        }
      }
    }
  } catch (err) {
    console.error('Agent save error:', err)
  }
}
