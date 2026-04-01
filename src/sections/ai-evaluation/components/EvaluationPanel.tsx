import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AIEvaluation, EvaluationSection } from '../../../types'

// ─── Section icons mapping ────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  'Fortalezas': 'text-emerald-400',
  'Brechas': 'text-amber-400',
  'Recomendaciones': 'text-sky-400',
  'Experimentos sugeridos': 'text-violet-400',
}

const SECTION_BG: Record<string, string> = {
  'Fortalezas': 'bg-emerald-500/10 border-emerald-500/20',
  'Brechas': 'bg-amber-500/10 border-amber-500/20',
  'Recomendaciones': 'bg-sky-500/10 border-sky-500/20',
  'Experimentos sugeridos': 'bg-violet-500/10 border-violet-500/20',
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function EvaluationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Cargando evaluación">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="h-4 w-32 rounded bg-slate-700 mb-3" />
          <div className="space-y-2">
            <div className="h-3 rounded bg-slate-800" />
            <div className="h-3 rounded bg-slate-800 w-4/5" />
            <div className="h-3 rounded bg-slate-800 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  section: EvaluationSection
}

function CollapsibleSection({ section }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const colorClass = SECTION_COLORS[section.title] ?? 'text-slate-300'
  const bgClass = SECTION_BG[section.title] ?? 'bg-slate-800/50 border-slate-700'

  return (
    <div className={`rounded-lg border ${bgClass} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className={`font-semibold text-sm tracking-wide ${colorClass}`}>
          {section.title}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
            {section.content}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Evaluation Panel ─────────────────────────────────────────────────────────

interface EvaluationPanelProps {
  evaluation: AIEvaluation
  isLatest?: boolean
}

export function EvaluationPanel({ evaluation, isLatest = false }: EvaluationPanelProps) {
  return (
    <div className="space-y-3">
      {isLatest && (
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
            <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
            Última evaluación
          </span>
          <span className="font-mono text-xs text-slate-500">
            {new Date(evaluation.createdAt).toLocaleString('es', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>
      )}

      {evaluation.sections.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400 whitespace-pre-line">{evaluation.rawText}</p>
        </div>
      ) : (
        evaluation.sections.map(section => (
          <CollapsibleSection key={section.title} section={section} />
        ))
      )}
    </div>
  )
}

// ─── Evaluating skeleton (exported for use in parent) ────────────────────────

interface EvaluatingStateProps {
  isEvaluating: boolean
}

export function EvaluatingState({ isEvaluating }: EvaluatingStateProps) {
  if (!isEvaluating) return null
  return <EvaluationSkeleton />
}
