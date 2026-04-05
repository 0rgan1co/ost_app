import { Star } from 'lucide-react'
import type { EffortImpact } from '../../../types'

const SCORE: Record<EffortImpact, number> = { bajo: 1, medio: 2, alto: 3 }
const LEVELS: EffortImpact[] = ['bajo', 'medio', 'alto']

interface Criterion {
  key: string
  label: string
  value: EffortImpact | null
}

interface PrioritizationPanelProps {
  criteria: Criterion[]
  isTarget: boolean
  onUpdatePriority: (field: string, value: EffortImpact) => void
  onToggleTarget: () => void
}

function computeScore(criteria: Criterion[]): number {
  return criteria.reduce((sum, c) => sum + (c.value ? SCORE[c.value] : 0), 0)
}

export function PrioritizationPanel({
  criteria,
  isTarget,
  onUpdatePriority,
  onToggleTarget,
}: PrioritizationPanelProps) {
  const score = computeScore(criteria)
  const maxScore = criteria.length * 3
  const hasAnyScore = criteria.some(c => c.value !== null)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-100 font-[Nunito_Sans]">
            Priorización
          </h3>
          {hasAnyScore && (
            <span className="font-['IBM_Plex_Mono'] text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              {score}/{maxScore}
            </span>
          )}
        </div>
        <button
          onClick={onToggleTarget}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-[Nunito_Sans] transition-all ${
            isTarget
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600'
          }`}
        >
          <Star size={12} className={isTarget ? 'fill-red-400' : ''} />
          {isTarget ? 'Target' : 'Marcar como Target'}
        </button>
      </div>

      <div className="space-y-3">
        {criteria.map(c => (
          <div key={c.key} className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-[Nunito_Sans] min-w-0 flex-1">
              {c.label}
            </span>
            <div className="flex gap-1">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => onUpdatePriority(c.key, level)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-['IBM_Plex_Mono'] font-semibold transition-all ${
                    c.value === level
                      ? level === 'alto'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : level === 'medio'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-slate-600 hover:text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
