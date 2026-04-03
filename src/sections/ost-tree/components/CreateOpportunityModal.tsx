import { useState } from 'react'
import { Sparkles, FileText, Loader2, Plus } from 'lucide-react'
import { anthropic, AI_MODEL } from '../../../lib/anthropic'

interface BusinessContextSummary {
  northStar: string
  targetSegment: string
  keyConstraints: string
}

interface CreateOpportunityModalProps {
  isOpen: boolean
  parentName?: string | null
  businessContext?: BusinessContextSummary | null
  onConfirm: (data: { name: string; description: string }) => void
  onConfirmMultiple?: (items: { name: string; description: string }[]) => void
  onClose: () => void
}

interface AISuggestion {
  name: string
  description: string
}

export function CreateOpportunityModal({
  isOpen,
  parentName,
  businessContext,
  onConfirm,
  onConfirmMultiple,
  onClose,
}: CreateOpportunityModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // AI generate ideas
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())

  // Load context
  const [showContextInput, setShowContextInput] = useState(false)
  const [contextText, setContextText] = useState('')
  const [extracting, setExtracting] = useState(false)

  const hasContext = businessContext && (businessContext.northStar || businessContext.targetSegment)

  function handleClose() {
    if (submitting) return
    setName('')
    setDescription('')
    setSuggestions([])
    setSelectedSuggestions(new Set())
    setShowContextInput(false)
    setContextText('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onConfirm({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddSelected() {
    if (selectedSuggestions.size === 0 || !onConfirmMultiple) return
    setSubmitting(true)
    const items = suggestions
      .filter((_, i) => selectedSuggestions.has(i))
      .map(s => ({ name: s.name, description: s.description }))
    try {
      await onConfirmMultiple(items)
      setSuggestions([])
      setSelectedSuggestions(new Set())
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateIdeas() {
    if (!hasContext || generating) return
    setGenerating(true)
    setSuggestions([])
    setSelectedSuggestions(new Set())

    try {
      const prompt = `Sos experto en Product Discovery (Teresa Torres). Dado este contexto:

**Desafío / North Star:** ${businessContext!.northStar}
**Usuario target:** ${businessContext!.targetSegment}
**Restricciones:** ${businessContext!.keyConstraints || 'No especificadas'}

Generá 4-5 oportunidades del usuario (problemas, necesidades no cubiertas, o fricciones) que podrían explorarse.

FORMATO: Respondé SOLO con un JSON array, sin texto adicional:
[{"name": "nombre corto", "description": "1-2 oraciones explicando el problema del usuario"}]`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0]) as AISuggestion[]
        setSuggestions(parsed)
        setSelectedSuggestions(new Set(parsed.map((_, i) => i)))
      }
    } catch (err) {
      console.error('Generate ideas error:', err)
    }
    setGenerating(false)
  }

  async function handleExtractFromContext() {
    if (!contextText.trim() || extracting) return
    setExtracting(true)
    setSuggestions([])
    setSelectedSuggestions(new Set())

    try {
      const prompt = `Sos experto en Product Discovery (Teresa Torres). Analizo este transcript/material:

---
${contextText.slice(0, 4000)}
---

${hasContext ? `Contexto del proyecto:
- Desafío: ${businessContext!.northStar}
- Target: ${businessContext!.targetSegment}` : ''}

Extraé:
1. Oportunidades del usuario (problemas, necesidades, fricciones) que se mencionan o se infieren
2. Para cada oportunidad, incluí la evidencia textual relevante del transcript

FORMATO: Respondé SOLO con un JSON array, sin texto adicional:
[{"name": "oportunidad corta", "description": "evidencia o cita relevante del transcript"}]`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0]) as AISuggestion[]
        setSuggestions(parsed)
        setSelectedSuggestions(new Set(parsed.map((_, i) => i)))
      }
      setShowContextInput(false)
      setContextText('')
    } catch (err) {
      console.error('Extract context error:', err)
    }
    setExtracting(false)
  }

  function toggleSuggestion(idx: number) {
    setSelectedSuggestions(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-lg max-h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl pointer-events-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-800 flex-shrink-0">
            <div>
              <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base">
                Nueva oportunidad
              </h2>
              {parentName && (
                <p className="font-[Nunito_Sans] text-slate-500 text-xs mt-0.5">
                  Dentro de: <span className="text-slate-400 font-medium">{parentName}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Business context card */}
            {hasContext && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 uppercase tracking-wider">Contexto del proyecto</p>
                {businessContext!.northStar && (
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    <span className="text-slate-500">Desafío:</span> {businessContext!.northStar}
                  </p>
                )}
                {businessContext!.targetSegment && (
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    <span className="text-slate-500">Target:</span> {businessContext!.targetSegment}
                  </p>
                )}
              </div>
            )}

            {/* AI action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleGenerateIdeas}
                disabled={!hasContext || generating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed font-[Nunito_Sans] text-sm font-semibold transition-colors"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generar ideas
              </button>
              <button
                onClick={() => setShowContextInput(!showContextInput)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 font-[Nunito_Sans] text-sm font-semibold transition-colors"
              >
                <FileText size={14} />
                Cargar contexto
              </button>
            </div>

            {!hasContext && (
              <p className="text-[11px] text-slate-500 font-sans text-center">
                Completá el Business Context del proyecto para habilitar "Generar ideas"
              </p>
            )}

            {/* Context input area */}
            {showContextInput && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-sans">
                  Pegá un transcript de entrevista, notas de Granola, o cualquier material:
                </p>
                <textarea
                  value={contextText}
                  onChange={e => setContextText(e.target.value)}
                  rows={5}
                  placeholder="Pegar transcript, notas, o contexto aquí..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-[Nunito_Sans] text-sm placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none"
                />
                <button
                  onClick={handleExtractFromContext}
                  disabled={!contextText.trim() || extracting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 font-[Nunito_Sans] text-sm font-semibold transition-colors"
                >
                  {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Extraer oportunidades
                </button>
              </div>
            )}

            {/* AI suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono']">
                  Sugerencias ({selectedSuggestions.size} seleccionadas)
                </p>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleSuggestion(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedSuggestions.has(idx)
                        ? 'border-red-500/40 bg-red-500/5'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                        selectedSuggestions.has(idx)
                          ? 'bg-red-500 text-white'
                          : 'border-2 border-slate-600'
                      }`}>
                        {selectedSuggestions.has(idx) && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100 font-[Nunito_Sans]">{s.name}</p>
                        <p className="text-xs text-slate-400 font-[Nunito_Sans] mt-0.5 leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleAddSelected}
                  disabled={selectedSuggestions.size === 0 || submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-[Nunito_Sans] font-semibold text-sm disabled:opacity-40 transition-colors"
                >
                  <Plus size={14} />
                  Agregar {selectedSuggestions.size} oportunidad{selectedSuggestions.size !== 1 ? 'es' : ''}
                </button>
              </div>
            )}

            {/* Manual form (shown when no suggestions) */}
            {suggestions.length === 0 && !showContextInput && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] text-slate-500 font-['IBM_Plex_Mono'] uppercase">o agregar manualmente</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <div>
                  <label className="block font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="¿Cuál es la oportunidad?"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-[Nunito_Sans] text-sm placeholder:text-slate-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-2">
                    Descripción
                    <span className="text-slate-400 ml-1 normal-case tracking-normal font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Contexto adicional..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-[Nunito_Sans] text-sm placeholder:text-slate-400 resize-none focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={handleClose} disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 font-[Nunito_Sans] font-semibold text-sm transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={!name.trim() || submitting}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-[Nunito_Sans] font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Crear'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
