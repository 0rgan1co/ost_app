import { useEffect, useState, useCallback } from 'react'
import { ChevronRight, Sparkles, Loader2, AlertCircle, ArrowLeft, FileText, FlaskConical, Lightbulb, Trophy } from 'lucide-react'
import { EvaluationPanel, EvaluatingState, EvaluationHistory, ConversationPanel, SuggestionConfirmDialog } from './components'
import type { SuggestionAction } from '../../lib/parse-suggestion'
import type { AIEvaluationProps } from '../../types'

// ─── Toast ───────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: 'success' | 'error' }>).detail
      setToast(detail)
      setTimeout(() => setToast(null), 3000)
    }
    window.addEventListener('ost:toast', handler)
    return () => window.removeEventListener('ost:toast', handler)
  }, [])
  return toast
}

// ─── OST Summary types ───────────────────────────────────────────────────────

interface OSTSummary {
  evidenceCount: number
  solutions: { name: string; assumptionCount: number; experimentCount: number }[]
  topExperiments: { description: string; type: string; score: number }[]
}

// ─── Extended props ──────────────────────────────────────────────────────────

interface ExtendedAIEvaluationProps extends AIEvaluationProps {
  ostSummary?: OSTSummary
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const SOL_BADGE_STYLE = 'text-indigo-400 bg-indigo-500/10'

const EXP_TYPE_LABEL: Record<string, string> = {
  entrevista: 'Entrevista',
  prototipo: 'Prototipo',
  smoke_test: 'Smoke test',
  prueba_usabilidad: 'Usabilidad',
  otro: 'Otro',
}

// ─── AIEvaluationView ────────────────────────────────────────────────────────

export function AIEvaluationView({
  project,
  opportunity,
  evaluations,
  conversation,
  isEvaluating = false,
  isSendingMessage = false,
  onEvaluate,
  onSendMessage,
  onApplySuggestion,
  onExecuteActions,
  onNavigateBack,
  ostSummary,
}: ExtendedAIEvaluationProps) {
  const toast = useToast()

  // ── Suggestion dialog state ──────────────────────────────────────────────
  const [suggestionActions, setSuggestionActions] = useState<SuggestionAction[]>([])
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false)

  const handleApplySuggestion = useCallback(
    (messageId: string) => {
      if (!onApplySuggestion) return
      const actions = onApplySuggestion(messageId)
      if (actions && actions.length > 0) {
        setSuggestionActions(actions)
        setIsSuggestionDialogOpen(true)
      }
    },
    [onApplySuggestion]
  )

  const handleConfirmSuggestions = useCallback(
    async (selected: SuggestionAction[]) => {
      setIsSuggestionDialogOpen(false)
      setSuggestionActions([])
      if (onExecuteActions && selected.length > 0) {
        await onExecuteActions(selected)
      }
    },
    [onExecuteActions]
  )

  const handleCancelSuggestions = useCallback(() => {
    setIsSuggestionDialogOpen(false)
    setSuggestionActions([])
  }, [])

  const latestEvaluation = evaluations[0] ?? null
  const pastEvaluations = evaluations.slice(1)
  const hasEvaluation = evaluations.length > 0

  return (
    <div className="dark min-h-screen bg-slate-950 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
              : 'border-red-500/30 bg-red-500/15 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto mb-4">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <button onClick={onNavigateBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={14} />
            <span>{project.name}</span>
          </button>
          <ChevronRight size={13} className="text-slate-700" />
          <span className="text-slate-500 max-w-[200px] truncate">{opportunity.title}</span>
          <ChevronRight size={13} className="text-slate-700" />
          <span className="text-violet-400 font-medium">Evaluación IA</span>
        </nav>
      </div>

      {/* 2-column layout */}
      <div className="max-w-7xl mx-auto flex gap-6">

        {/* Left column: OST Summary */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4">

            {/* Opportunity card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-orange-400 uppercase tracking-wider mb-2">Oportunidad</p>
              <h3 className="font-[Nunito_Sans] font-bold text-slate-100 text-sm leading-snug mb-3">
                {opportunity.title}
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-['IBM_Plex_Mono'] text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {ostSummary?.evidenceCount ?? 0} evidencias
                </span>
                <span className="flex items-center gap-1">
                  <Lightbulb size={11} />
                  {ostSummary?.solutions.length ?? 0} soluciones
                </span>
              </div>
            </div>

            {/* Solutions list */}
            {ostSummary && ostSummary.solutions.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-indigo-400 uppercase tracking-wider mb-3">Soluciones</p>
                <div className="space-y-2.5">
                  {ostSummary.solutions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-[9px] font-['IBM_Plex_Mono'] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${SOL_BADGE_STYLE}`}>
                        {s.assumptionCount} sup
                      </span>
                      <div>
                        <p className="text-xs text-slate-300 font-[Nunito_Sans] leading-snug line-clamp-2">{s.name}</p>
                        {s.experimentCount > 0 && (
                          <p className="text-[10px] text-slate-500 font-['IBM_Plex_Mono'] mt-1">
                            <FlaskConical size={9} className="inline mr-1" />
                            {s.experimentCount} exp
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top experiments */}
            {ostSummary && ostSummary.topExperiments.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Trophy size={12} className="text-amber-400" />
                  <p className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider">Top Experimentos</p>
                </div>
                <div className="space-y-2">
                  {ostSummary.topExperiments.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400 font-bold mt-0.5">#{i + 1}</span>
                      <div>
                        <p className="text-xs text-slate-300 font-[Nunito_Sans] line-clamp-2">{e.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-500">{EXP_TYPE_LABEL[e.type] ?? e.type}</span>
                          <span className="text-[9px] font-['IBM_Plex_Mono'] text-amber-400 font-bold">{e.score.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Evaluation + Conversation */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header + Evaluate button */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-violet-400 font-[Nunito_Sans]">Evaluación IA</h1>
              <p className="text-xs text-slate-500 font-['IBM_Plex_Mono'] mt-0.5">
                Claude claude-sonnet-4-6
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEvaluate?.(opportunity.id)}
              disabled={isEvaluating}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isEvaluating ? (
                <><Loader2 size={15} className="animate-spin" /> Evaluando…</>
              ) : (
                <><Sparkles size={15} /> {hasEvaluation ? 'Re-evaluar' : 'Evaluar con IA'}</>
              )}
            </button>
          </div>

          {/* Evaluating skeleton */}
          <EvaluatingState isEvaluating={isEvaluating} />

          {/* Latest evaluation */}
          {!isEvaluating && latestEvaluation && (
            <EvaluationPanel evaluation={latestEvaluation} isLatest />
          )}

          {/* Empty state */}
          {!isEvaluating && !hasEvaluation && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
              <Sparkles size={28} className="mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-400 font-[Nunito_Sans]">
                Aún no hay evaluaciones para esta oportunidad.
              </p>
              <p className="text-xs text-slate-500 mt-1 font-[Nunito_Sans]">
                Haz clic en "Evaluar con IA" para que Claude analice tu OST.
              </p>
            </div>
          )}

          {/* History */}
          {pastEvaluations.length > 0 && (
            <EvaluationHistory pastEvaluations={pastEvaluations} />
          )}

          {/* Conversation */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono']">
              Conversación de refinamiento
            </h2>
            <ConversationPanel
              conversation={conversation}
              isSendingMessage={isSendingMessage}
              hasEvaluation={hasEvaluation}
              onSendMessage={onSendMessage}
              onApplySuggestion={handleApplySuggestion}
            />
          </div>
        </div>
      </div>

      {/* Suggestion confirmation dialog */}
      <SuggestionConfirmDialog
        isOpen={isSuggestionDialogOpen}
        actions={suggestionActions}
        onConfirm={handleConfirmSuggestions}
        onCancel={handleCancelSuggestions}
      />
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

export function ConnectedAIEvaluationView({
  project,
  opportunity,
  onNavigateBack,
}: ConnectedAIEvaluationProps) {
  const {
    evaluations, conversation, isEvaluating, isSendingMessage, error,
    evaluate, sendMessage, applySuggestion, executeActions,
  } = useAIEvaluation(opportunity.id, project.id)

  return (
    <>
      {error && (
        <div className="mx-auto max-w-7xl mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
      <AIEvaluationView
        project={project}
        opportunity={opportunity}
        evaluations={evaluations}
        conversation={conversation}
        isEvaluating={isEvaluating}
        isSendingMessage={isSendingMessage}
        onEvaluate={evaluate}
        onSendMessage={sendMessage}
        onApplySuggestion={applySuggestion}
        onExecuteActions={executeActions}
        onNavigateBack={onNavigateBack}
      />
    </>
  )
}
