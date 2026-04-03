import { Trophy } from 'lucide-react'
import type { SidebarExperiment } from '../../hooks/use-top-experiments'

interface SidebarTopExperimentsProps {
  experiments: SidebarExperiment[]
  onNavigateToOpportunity: (opportunityId: string) => void
}

const RANK_COLORS = [
  'text-amber-400',
  'text-slate-400',
  'text-orange-400',
]

const TYPE_SHORT: Record<string, string> = {
  entrevista: 'Entrev.',
  prototipo: 'Proto.',
  smoke_test: 'Smoke',
  prueba_usabilidad: 'Usab.',
  otro: 'Otro',
}

export function SidebarTopExperiments({ experiments, onNavigateToOpportunity }: SidebarTopExperimentsProps) {
  if (experiments.length === 0) return null

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 px-2 mb-2">
        <Trophy size={13} className="text-amber-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] hidden lg:inline">
          Top 3 Experimentos
        </span>
      </div>

      <div className="space-y-1">
        {experiments.map((exp, idx) => (
          <button
            key={exp.id}
            onClick={() => onNavigateToOpportunity(exp.opportunityId)}
            title={`${exp.description}\nScore: ${exp.score.toFixed(2)} · ${exp.opportunityName}`}
            className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group md:justify-center lg:justify-start"
          >
            {/* Rank number */}
            <span className={`text-[11px] font-['IBM_Plex_Mono'] font-bold mt-0.5 flex-shrink-0 ${RANK_COLORS[idx]}`}>
              #{idx + 1}
            </span>

            {/* Content — hidden on tablet, shown on desktop */}
            <div className="flex-1 min-w-0 hidden lg:block">
              <p className="text-xs text-slate-700 dark:text-slate-200 font-sans font-medium truncate leading-tight group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                {exp.description}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-400 dark:text-slate-500">
                  {TYPE_SHORT[exp.type] ?? exp.type}
                </span>
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-red-400 font-bold">
                  {exp.score.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-600 truncate font-sans">
                  · {exp.opportunityName}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
