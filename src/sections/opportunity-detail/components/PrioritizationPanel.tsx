import type { EffortImpact } from '../../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrioritizationPanelProps {
  priorityImpact: EffortImpact | null
  priorityFrequency: EffortImpact | null
  priorityIntensity: EffortImpact | null
  priorityCapacity: EffortImpact | null
  isTarget: boolean
  onUpdatePriority: (field: string, value: EffortImpact) => void
  onToggleTarget: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCORE: Record<EffortImpact, number> = { bajo: 1, medio: 2, alto: 3 }

const CRITERIA: { field: string; label: string }[] = [
  { field: 'priorityImpact', label: 'Impacto en outcome' },
  { field: 'priorityFrequency', label: 'Frecuencia' },
  { field: 'priorityIntensity', label: 'Intensidad del dolor' },
  { field: 'priorityCapacity', label: 'Capacidad del equipo' },
]

const LEVELS: { value: EffortImpact; label: string }[] = [
  { value: 'bajo', label: 'Bajo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
]

const LEVEL_STYLE: Record<EffortImpact, { active: string; inactive: string }> = {
  bajo: {
    active: 'bg-green-500/20 text-green-400 border-green-500/40',
    inactive: 'bg-slate-900 text-slate-500 border-slate-800 hover:border-green-500/30 hover:text-green-400/70',
  },
  medio: {
    active: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    inactive: 'bg-slate-900 text-slate-500 border-slate-800 hover:border-amber-500/30 hover:text-amber-400/70',
  },
  alto: {
    active: 'bg-red-500/20 text-red-400 border-red-500/40',
    inactive: 'bg-slate-900 text-slate-500 border-slate-800 hover:border-red-500/30 hover:text-red-400/70',
  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PrioritizationPanel({
  priorityImpact,
  priorityFrequency,
  priorityIntensity,
  priorityCapacity,
  isTarget,
  onUpdatePriority,
  onToggleTarget,
}: PrioritizationPanelProps) {
  const values: Record<string, EffortImpact | null> = {
    priorityImpact,
    priorityFrequency,
    priorityIntensity,
    priorityCapacity,
  }

  // Compute composite score (sum of all 4 criteria, each 1-3)
  const filled = Object.values(values).filter(Boolean) as EffortImpact[]
  const compositeScore = filled.reduce((sum, v) => sum + SCORE[v], 0)
  const maxScore = CRITERIA.length * 3

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-300 font-['Nunito_Sans']">Priorizacion</h2>
          {filled.length === CRITERIA.length && (
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 text-red-400 text-sm font-['IBM_Plex_Mono'] font-bold">
              {compositeScore}
            </span>
          )}
          {filled.length > 0 && filled.length < CRITERIA.length && (
            <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500">
              {compositeScore}/{maxScore}
            </span>
          )}
        </div>
        <button
          onClick={onToggleTarget}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
            font-['Nunito_Sans'] transition-all border
            ${isTarget
              ? 'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25'
              : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-red-500/30 hover:text-red-400'
            }
          `}
        >
          {'\u2B50'} {isTarget ? 'Target' : 'Marcar como Target'}
        </button>
      </div>

      {/* Criteria rows */}
      <div className="space-y-3">
        {CRITERIA.map(({ field, label }) => {
          const current = values[field]
          return (
            <div key={field} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-[Nunito_Sans] w-40 flex-shrink-0">
                {label}
              </span>
              <div className="flex gap-1.5">
                {LEVELS.map(({ value, label: lvlLabel }) => {
                  const isActive = current === value
                  const style = LEVEL_STYLE[value]
                  return (
                    <button
                      key={value}
                      onClick={() => onUpdatePriority(field, value)}
                      className={`
                        px-3 py-1 rounded-lg text-[11px] font-['IBM_Plex_Mono'] font-semibold
                        border transition-all
                        ${isActive ? style.active : style.inactive}
                      `}
                    >
                      {lvlLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
