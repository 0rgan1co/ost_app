import { useState, useEffect } from 'react'
import { Sparkles, X, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

export type ImproveTarget =
  | 'rewrite_name'
  | 'rewrite_description'
  | 'suggest_evidence'
  | 'suggest_solutions'
  | 'suggest_assumptions'
  | 'suggest_experiments'

export type ImproveNodeType = 'opportunity' | 'solution'

interface ImproveModalProps {
  isOpen: boolean
  nodeType: ImproveNodeType
  opportunityId: string
  projectId: string
  solutionId?: string
  nodeLabel: string
  canApplyName?: boolean
  canApplyDescription?: boolean
  onClose: () => void
  onApply?: (target: ImproveTarget, suggestion: string) => Promise<void> | void
}

const TARGETS_BY_TYPE: Record<ImproveNodeType, { key: ImproveTarget; label: string; icon: string }[]> = {
  opportunity: [
    { key: 'rewrite_name', label: 'Reescribir nombre', icon: '✏️' },
    { key: 'rewrite_description', label: 'Expandir descripción', icon: '📝' },
    { key: 'suggest_evidence', label: 'Sugerir evidencia faltante', icon: '🔍' },
    { key: 'suggest_solutions', label: 'Sugerir soluciones', icon: '💡' },
  ],
  solution: [
    { key: 'rewrite_name', label: 'Reescribir nombre', icon: '✏️' },
    { key: 'rewrite_description', label: 'Expandir descripción', icon: '📝' },
    { key: 'suggest_assumptions', label: 'Sugerir supuestos', icon: '🧪' },
    { key: 'suggest_experiments', label: 'Sugerir experimentos', icon: '🔬' },
  ],
}

export function ImproveModal({
  isOpen,
  nodeType,
  opportunityId,
  projectId,
  solutionId,
  nodeLabel,
  canApplyName = false,
  canApplyDescription = false,
  onClose,
  onApply,
}: ImproveModalProps) {
  const targets = TARGETS_BY_TYPE[nodeType]
  const [target, setTarget] = useState<ImproveTarget>(targets[1].key)
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTarget(targets[1].key)
      setInstruction('')
      setSuggestion(null)
      setError(null)
      setApplied(false)
    }
  }, [isOpen, targets])

  if (!isOpen) return null

  const run = async () => {
    setLoading(true)
    setError(null)
    setSuggestion(null)
    setApplied(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sesión no válida')

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-improve`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          opportunityId,
          projectId,
          solutionId,
          target,
          instruction: instruction.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Error desconocido')
      setSuggestion(json.data.suggestion)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al llamar al AI')
    } finally {
      setLoading(false)
    }
  }

  const apply = async () => {
    if (!suggestion || !onApply) return
    try {
      await onApply(target, suggestion)
      setApplied(true)
      setTimeout(() => onClose(), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aplicar')
    }
  }

  const canApplyThisTarget =
    (target === 'rewrite_name' && canApplyName) ||
    (target === 'rewrite_description' && canApplyDescription)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-red-400" />
            <div>
              <h3 className="font-[Nunito_Sans] font-bold text-slate-100 text-base">Mejorar con IA</h3>
              <p className="text-[11px] text-slate-500 font-[IBM_Plex_Mono] truncate max-w-[380px]">{nodeLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <label className="text-[10px] font-[IBM_Plex_Mono] uppercase tracking-wider text-slate-400 mb-2 block">
            ¿Qué querés mejorar?
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {targets.map(t => (
              <button
                key={t.key}
                onClick={() => { setTarget(t.key); setSuggestion(null); setError(null) }}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-[Nunito_Sans] font-semibold transition-colors ${
                  target === t.key
                    ? 'bg-red-500/10 border-red-500/50 text-red-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <label className="text-[10px] font-[IBM_Plex_Mono] uppercase tracking-wider text-slate-400 mb-2 block">
            Instrucción adicional (opcional)
          </label>
          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder="Ej: hacelo más específico, más ambicioso, enfocate en usuarios B2B…"
            rows={2}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-[Nunito_Sans] focus:outline-none focus:border-red-500/50 resize-none"
          />

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 font-[Nunito_Sans]">
              {error}
            </div>
          )}

          {suggestion && (
            <div className="mt-4">
              <label className="text-[10px] font-[IBM_Plex_Mono] uppercase tracking-wider text-slate-400 mb-2 block">
                Sugerencia
              </label>
              <div className="bg-slate-950/70 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-slate-100 font-[Nunito_Sans] whitespace-pre-wrap leading-relaxed">
                {suggestion}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-[Nunito_Sans] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cerrar
          </button>
          {suggestion && canApplyThisTarget && onApply && (
            <button
              onClick={apply}
              disabled={applied}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-green-700 text-white text-xs font-[Nunito_Sans] font-semibold transition-colors"
            >
              {applied ? <><Check size={14} /> Aplicado</> : 'Aplicar'}
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-700 text-white text-xs font-[Nunito_Sans] font-semibold transition-colors"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Generando…</> : <><Sparkles size={14} /> {suggestion ? 'Regenerar' : 'Generar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
