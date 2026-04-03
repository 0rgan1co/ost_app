import { Trophy } from 'lucide-react'
import type { TopExperiment, EffortImpact } from '../../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EFFORT_IMPACT_COLORS: Record<EffortImpact, string> = {
  bajo:  'text-green-400 bg-green-500/10',
  medio: 'text-amber-400 bg-amber-500/10',
  alto:  'text-red-400 bg-red-500/10',
}

const TYPE_LABELS: Record<string, string> = {
  entrevista:        'Entrevista',
  prototipo:         'Prototipo',
  smoke_test:        'Smoke test',
  prueba_usabilidad: 'Usabilidad',
  otro:              'Otro',
}

const RANK_BADGES = [
  { label: '#1', className: 'text-amber-400 bg-amber-500/15 ring-1 ring-amber-500/30' },
  { label: '#2', className: 'text-slate-300 bg-slate-700 ring-1 ring-slate-600' },
  { label: '#3', className: 'text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20' },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface TopExperimentsCardProps {
  topExperiments: TopExperiment[]
}

export function TopExperimentsCard({ topExperiments }: TopExperimentsCardProps) {
  if (topExperiments.length === 0) {
    return (
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={16} className="text-amber-400" />
          <h2 className="text-base font-bold text-slate-100 font-sans">Top 3 Experimentos</h2>
        </div>
        <div className="py-6 text-center">
          <p className="text-slate-500 text-sm font-sans">Sin experimentos registrados</p>
          <p className="text-slate-400 text-xs mt-1 font-sans">
            Añade experimentos a tus hipótesis para ver los de mayor prioridad aquí
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-amber-400" />
        <h2 className="text-base font-bold text-slate-100 font-sans">Top 3 Experimentos</h2>
        <span className="text-xs font-['IBM_Plex_Mono'] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full ml-1">
          por score
        </span>
      </div>

      <div className="space-y-3">
        {topExperiments.map((top, idx) => {
          const badge = RANK_BADGES[idx] ?? RANK_BADGES[2]
          const exp = top.experiment

          return (
            <div
              key={exp.id}
              className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Rank */}
                  <span className={`text-[11px] font-['IBM_Plex_Mono'] font-bold px-2 py-0.5 rounded-md ${badge.className}`}>
                    {badge.label}
                  </span>
                  {/* Type */}
                  <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-300 bg-slate-700 px-2 py-0.5 rounded-md">
                    {TYPE_LABELS[exp.type] ?? exp.type}
                  </span>
                </div>
                {/* Score */}
                <span className="flex-shrink-0 text-[13px] font-['IBM_Plex_Mono'] font-bold text-red-400">
                  {top.priorityScore.toFixed(2)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-200 leading-relaxed font-sans mb-2">
                {exp.description}
              </p>

              {/* Success criterion */}
              <div className="bg-slate-900/60 border-l-2 border-red-500/40 rounded-r pl-3 py-1.5 mb-3">
                <p className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-0.5">Criterio de éxito</p>
                <p className="text-xs text-slate-300 font-sans">{exp.successCriterion}</p>
              </div>

              {/* Effort / Impact + Hypothesis origin */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-['IBM_Plex_Mono']">Esfuerzo:</span>
                  <span className={`text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md capitalize ${EFFORT_IMPACT_COLORS[exp.effort]}`}>
                    {exp.effort}
                  </span>
                  <span className="text-[11px] text-slate-400 font-['IBM_Plex_Mono'] ml-1">Impacto:</span>
                  <span className={`text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md capitalize ${EFFORT_IMPACT_COLORS[exp.impact]}`}>
                    {exp.impact}
                  </span>
                </div>
                {/* Origin hypothesis */}
                <p className="text-[11px] text-slate-400 font-sans truncate max-w-[200px]" title={top.hypothesisTitle}>
                  Hipótesis: {top.hypothesisTitle}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
