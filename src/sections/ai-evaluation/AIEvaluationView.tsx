import { useEffect, useState } from 'react'
import { ChevronRight, Sparkles, Loader2, AlertCircle, ArrowLeft, FileText, Lightbulb } from 'lucide-react'
import { EvaluationPanel, EvaluatingState, EvaluationHistory, ConversationPanel } from './components'
import type { AIEvaluationProps } from '../../types'

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: 'success' | 'error' }>).detail
      setToast(detail)
      setTimeout(() => setToast(null), 4000)
    }
    window.addEventListener('ost:toast', handler)
    return () => window.removeEventListener('ost:toast', handler)
  }, [])
  return toast
}

interface OSTSummary {
  evidenceCount: number
  hypotheses: { description: string; status: string; experimentCount: number }[]
  topExperiments: { description: string; type: string; score: number }[]
}

interface ExtendedAIEvaluationProps extends AIEvaluationProps {
  ostSummary?: OSTSummary
}

const HYP_STATUS_STYLE: Record<string, string> = {
  'to do': 'text-slate-400 bg-slate-800',
  'en curso': 'text-blue-400 bg-blue-500/10',
  'terminada': 'text-green-400 bg-green-500/10',
}

export function AIEvaluationView({
  project, opportunity, evaluations, conversation,
  isEvaluating = false, isSendingMessage = false,
  onEvaluate, onSendMessage, onApplySuggestion, onNavigateBack, ostSummary,
}: ExtendedAIEvaluationProps) {
  const toast = useToast()
  const latestEvaluation = evaluations[0] ?? null
  const pastEvaluations = evaluations.slice(1)
  const hasEvaluation = evaluations.length > 0

  return (
    <div className="dark min-h-screen bg-slate-950 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Toast with action link */}
      {toast && (
        <div role="alert" className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' : 'border-red-500/30 bg-red-500/15 text-red-400'
        }`}>
          {toast.message}
          {toast.type === 'success' && onNavigateBack && (
            <button onClick={onNavigateBack} className="ml-2 underline text-emerald-300 hover:text-emerald-200 text-xs">
              Ver OST →
            </button>
          )}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto mb-4">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <button onClick={onNavigateBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={14} />
            <span>{project.name}</span>
          </button>
          <ChevronRight size={13} className="text-slate-700" />
          <span className="text-orange-400 max-w-[200px] truncate">{opportunity.title}</span>
          <ChevronRight size={13} className="text-slate-700" />
          <span className="text-violet-400 font-medium">Evaluación IA</span>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto flex gap-6">

        {/* Left column: OST Summary (hidden on mobile) */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-6 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-orange-400 uppercase tracking-wider mb-2">Oportunidad</p>
              <h3 className="font-[Nunito_Sans] font-bold text-slate-100 text-sm leading-snug mb-2">{opportunity.title}</h3>
              <div className="flex items-center gap-3 text-[11px] font-['IBM_Plex_Mono'] text-slate-400">
                <span className="flex items-center gap-1"><FileText size={11} />{ostSummary?.evidenceCount ?? 0} ev</span>
                <span className="flex items-center gap-1"><Lightbulb size={11} />{ostSummary?.hypotheses.length ?? 0} hip</span>
              </div>
            </div>

            {ostSummary && ostSummary.hypotheses.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-indigo-400 uppercase tracking-wider mb-2">Hipótesis</p>
                <div className="space-y-2">
                  {ostSummary.hypotheses.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-[9px] font-['IBM_Plex_Mono'] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${HYP_STATUS_STYLE[h.status] ?? HYP_STATUS_STYLE['to do']}`}>{h.status}</span>
                      <p className="text-[11px] text-slate-300 font-[Nunito_Sans] line-clamp-2">{h.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Evaluation + Conversation */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header + Evaluate button */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-violet-400 font-[Nunito_Sans]">Evaluación IA</h1>
            <button type="button" onClick={() => onEvaluate?.(opportunity.id)} disabled={isEvaluating}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
              {isEvaluating ? <><Loader2 size={14} className="animate-spin" /> Evaluando…</> : <><Sparkles size={14} /> {hasEvaluation ? 'Re-evaluar' : 'Evaluar con IA'}</>}
            </button>
          </div>

          {/* Evaluating skeleton */}
          <EvaluatingState isEvaluating={isEvaluating} />

          {/* CONVERSATION FIRST — the refinement loop is the core value */}
          {hasEvaluation && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200 font-[Nunito_Sans]">Conversación con Claude</h2>
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500">{conversation.length} mensajes</span>
              </div>
              <ConversationPanel
                conversation={conversation}
                isSendingMessage={isSendingMessage}
                hasEvaluation={hasEvaluation}
                onSendMessage={onSendMessage}
                onApplySuggestion={onApplySuggestion}
              />
            </div>
          )}

          {/* Empty state — before first evaluation */}
          {!isEvaluating && !hasEvaluation && (
            <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-8 text-center">
              <Sparkles size={32} className="mx-auto mb-3 text-violet-400" />
              <p className="text-base font-semibold text-slate-200 font-[Nunito_Sans] mb-1">
                Evaluá tu oportunidad con IA
              </p>
              <p className="text-sm text-slate-400 font-[Nunito_Sans] mb-4 max-w-sm mx-auto">
                Claude va a analizar tu evidencia, hipótesis y experimentos para identificar fortalezas, brechas y sugerencias.
              </p>
              <button onClick={() => onEvaluate?.(opportunity.id)} disabled={isEvaluating}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors">
                <Sparkles size={16} /> Evaluar con IA
              </button>
            </div>
          )}

          {/* Evaluation sections — collapsed by default, below conversation */}
          {!isEvaluating && latestEvaluation && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-slate-200 font-[Nunito_Sans] font-semibold py-2">
                <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                Ver evaluación completa
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-600">
                  {new Date(latestEvaluation.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
              </summary>
              <div className="pt-2">
                <EvaluationPanel evaluation={latestEvaluation} isLatest />
              </div>
            </details>
          )}

          {/* History */}
          {pastEvaluations.length > 0 && (
            <details>
              <summary className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer font-['IBM_Plex_Mono']">
                {pastEvaluations.length} evaluaciones anteriores
              </summary>
              <div className="pt-2">
                <EvaluationHistory pastEvaluations={pastEvaluations} />
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Connected version ───────────────────────────────────────────────────────

import { useAIEvaluation } from '../../hooks/use-ai-evaluation'
import type { AIEvalProject, AIEvalOpportunity } from '../../types'

interface ConnectedAIEvaluationProps {
  project: AIEvalProject
  opportunity: AIEvalOpportunity
  onNavigateBack?: () => void
}

export function ConnectedAIEvaluationView({ project, opportunity, onNavigateBack }: ConnectedAIEvaluationProps) {
  const { evaluations, conversation, isEvaluating, isSendingMessage, error, evaluate, sendMessage, applySuggestion } = useAIEvaluation(opportunity.id, project.id)
  return (
    <>
      {error && (
        <div className="mx-auto max-w-6xl mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle size={15} />{error}
        </div>
      )}
      <AIEvaluationView project={project} opportunity={opportunity} evaluations={evaluations} conversation={conversation}
        isEvaluating={isEvaluating} isSendingMessage={isSendingMessage} onEvaluate={evaluate} onSendMessage={sendMessage}
        onApplySuggestion={applySuggestion} onNavigateBack={onNavigateBack} />
    </>
  )
}
