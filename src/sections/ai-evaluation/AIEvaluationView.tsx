import { useEffect, useState } from 'react'
import { ChevronRight, Sparkles, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { EvaluationPanel, EvaluatingState, EvaluationHistory, ConversationPanel } from './components'
import type { AIEvaluationProps } from '../../types'

// ─── Toast notification (listens to custom event from applySuggestion) ────────

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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

interface BreadcrumbProps {
  projectName: string
  opportunityTitle: string
  onNavigateBack?: () => void
}

function Breadcrumb({ projectName, opportunityTitle, onNavigateBack }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={onNavigateBack}
        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>{projectName}</span>
      </button>
      <ChevronRight size={13} className="text-slate-700" />
      <span className="text-slate-500 max-w-[200px] truncate">{opportunityTitle}</span>
      <ChevronRight size={13} className="text-slate-700" />
      <span className="text-slate-300 font-medium">Evaluación IA</span>
    </nav>
  )
}

// ─── AIEvaluationView ─────────────────────────────────────────────────────────

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
  onNavigateBack,
}: AIEvaluationProps) {
  const toast = useToast()

  const latestEvaluation = evaluations[0] ?? null
  const pastEvaluations = evaluations.slice(1)
  const hasEvaluation = evaluations.length > 0

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 md:px-8 md:py-8">
      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
              : 'border-red-500/30 bg-red-500/15 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          projectName={project.name}
          opportunityTitle={opportunity.title}
          onNavigateBack={onNavigateBack}
        />

        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-100">Evaluación IA</h1>
          <p className="text-sm text-slate-500">
            Analiza{' '}
            <span className="text-slate-400 font-medium">{opportunity.title}</span>{' '}
            con Claude {/* model name */}
            <span className="font-mono text-xs text-slate-400">claude-sonnet-4-6</span>
          </p>
        </div>

        {/* Evaluate button */}
        <div>
          <button
            type="button"
            onClick={() => onEvaluate?.(opportunity.id)}
            disabled={isEvaluating}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEvaluating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Evaluando…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                {hasEvaluation ? 'Re-evaluar con IA' : 'Evaluar con IA'}
              </>
            )}
          </button>
        </div>

        {/* Skeleton during evaluation */}
        <EvaluatingState isEvaluating={isEvaluating} />

        {/* Latest evaluation */}
        {!isEvaluating && latestEvaluation && (
          <div className="space-y-4">
            <EvaluationPanel evaluation={latestEvaluation} isLatest />
          </div>
        )}

        {/* Empty state */}
        {!isEvaluating && !hasEvaluation && (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center">
            <Sparkles size={28} className="mx-auto mb-3 text-slate-700" />
            <p className="text-sm text-slate-500">
              Aún no hay evaluaciones para esta oportunidad.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en "Evaluar con IA" para comenzar.
            </p>
          </div>
        )}

        {/* Evaluation history */}
        {pastEvaluations.length > 0 && (
          <EvaluationHistory pastEvaluations={pastEvaluations} />
        )}

        {/* Conversation panel */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Conversación de refinamiento
          </h2>
          <ConversationPanel
            conversation={conversation}
            isSendingMessage={isSendingMessage}
            hasEvaluation={hasEvaluation}
            onSendMessage={onSendMessage}
            onApplySuggestion={onApplySuggestion}
          />
        </div>

        {/* Error state */}
        {/* Note: error is shown via the hook; if consumer passes no error prop,
            this block won't render. Wire error display at the page level if needed. */}
      </div>
    </div>
  )
}

// ─── Connected version (uses the hook internally) ─────────────────────────────

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
    evaluations,
    conversation,
    isEvaluating,
    isSendingMessage,
    error,
    evaluate,
    sendMessage,
    applySuggestion,
  } = useAIEvaluation(opportunity.id, project.id)

  return (
    <>
      {error && (
        <div className="mx-auto max-w-3xl mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
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
        onNavigateBack={onNavigateBack}
      />
    </>
  )
}
