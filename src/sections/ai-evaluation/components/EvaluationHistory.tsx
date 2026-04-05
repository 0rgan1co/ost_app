import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import { EvaluationPanel } from './EvaluationPanel'
import type { AIEvaluation } from '../../../types'

interface EvaluationHistoryProps {
  /** Evaluations excluding the most recent one (which is shown separately) */
  pastEvaluations: AIEvaluation[]
}

export function EvaluationHistory({ pastEvaluations }: EvaluationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (pastEvaluations.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <History size={14} className="text-slate-500" />
          Evaluaciones anteriores
          <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-400">
            {pastEvaluations.length}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-6 border-t border-slate-800">
          {pastEvaluations.map((evaluation, index) => (
            <div key={evaluation.id}>
              {/* Timestamp header for each past evaluation */}
              <div className="flex items-center gap-2 pt-4 mb-3">
                <span className="font-mono text-xs text-slate-400">
                  {new Date(evaluation.createdAt).toLocaleString('es', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                {index < pastEvaluations.length - 1 && (
                  <div className="flex-1 border-t border-slate-800" />
                )}
              </div>
              <EvaluationPanel evaluation={evaluation} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
