import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { Opportunity, HypothesisSummary } from '../../../types'
import type { ExperimentSummary } from '../../../hooks/use-ost-tree'

interface OSTTreeViewProps {
  projectName: string
  outcome: string
  opportunities: Opportunity[]
  hypothesesSummary: Record<string, HypothesisSummary[]>
  experimentsSummary: Record<string, ExperimentSummary[]>
  selectedId: string | null
  onSelect: (id: string) => void
  onNavigateToDetail?: (id: string) => void
}

const HYP_STATUS: Record<string, { dot: string; text: string }> = {
  'to do':     { dot: 'bg-slate-500', text: 'text-slate-400' },
  'en curso':  { dot: 'bg-blue-400', text: 'text-blue-400' },
  'terminada': { dot: 'bg-green-400', text: 'text-green-400' },
}

const EXP_TYPE_SHORT: Record<string, string> = {
  entrevista: 'Entrev.',
  prototipo: 'Proto.',
  smoke_test: 'Smoke',
  prueba_usabilidad: 'Usab.',
  otro: 'Otro',
}

export function OSTTreeViewCanvas({
  projectName,
  outcome,
  opportunities,
  hypothesesSummary,
  experimentsSummary,
  selectedId,
  onSelect,
  onNavigateToDetail,
}: OSTTreeViewProps) {
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(new Set(opportunities.filter(o => !o.isArchived).map(o => o.id)))
  const [expandedHyps, setExpandedHyps] = useState<Set<string>>(new Set())

  const toggleOpp = (id: string) => {
    setExpandedOpps(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleHyp = (id: string) => {
    setExpandedHyps(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeOpps = opportunities.filter(o => !o.isArchived)

  if (activeOpps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 font-[Nunito_Sans] text-sm">No hay oportunidades aún</p>
        <p className="text-slate-500 font-[Nunito_Sans] text-xs mt-1">Crea la primera usando el botón superior</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto w-full h-full px-4 py-2">

      {/* Outcome root node */}
      <div className="mb-2">
        <div className="inline-flex items-center gap-2 bg-red-600 text-white rounded-xl px-4 py-2.5">
          <span className="text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-wider text-red-200">Outcome</span>
          <span className="font-[Nunito_Sans] font-bold text-sm">{outcome || projectName}</span>
        </div>
      </div>

      {/* Opportunities */}
      <div className="ml-4 border-l-2 border-slate-800 pl-4 space-y-1">
        {activeOpps.map(opp => {
          const isExpanded = expandedOpps.has(opp.id)
          const hyps = hypothesesSummary[opp.id] ?? []
          const isSelected = selectedId === opp.id

          return (
            <div key={opp.id}>
              {/* Opportunity row */}
              <div className={`
                flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all group
                ${isSelected ? 'bg-slate-800 border border-orange-500/30' : 'hover:bg-slate-900'}
              `}>
                {/* Expand toggle */}
                <button
                  onClick={() => toggleOpp(opp.id)}
                  className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                >
                  {hyps.length > 0 ? (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60" />
                    </span>
                  )}
                </button>

                {/* Name — click to select */}
                <button
                  onClick={() => onSelect(opp.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="font-[Nunito_Sans] text-sm font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                    {opp.title}
                  </span>
                </button>

                {/* Counters */}
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 flex-shrink-0">
                  ev:{opp.evidenceCount} hip:{hyps.length}
                </span>

                {/* Navigate to detail */}
                {onNavigateToDetail && (
                  <button
                    onClick={() => onNavigateToDetail(opp.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                    title="Ver detalle"
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              {/* Hypotheses (expanded) */}
              {isExpanded && hyps.length > 0 && (
                <div className="ml-6 border-l-2 border-slate-800/50 pl-3 space-y-0.5 mb-1">
                  {hyps.map(h => {
                    const st = HYP_STATUS[h.status] ?? HYP_STATUS['to do']
                    const exps = experimentsSummary[h.id] ?? []
                    const hypExpanded = expandedHyps.has(h.id)

                    return (
                      <div key={h.id}>
                        {/* Hypothesis row */}
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-900/50 group">
                          {/* Expand */}
                          <button
                            onClick={() => exps.length > 0 && toggleHyp(h.id)}
                            className="text-slate-600 hover:text-slate-400 flex-shrink-0"
                          >
                            {exps.length > 0 ? (
                              hypExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                            ) : (
                              <span className="w-3 h-3 flex items-center justify-center">
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              </span>
                            )}
                          </button>

                          {/* Status dot */}
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />

                          {/* Description */}
                          <p className="flex-1 text-xs text-slate-300 font-[Nunito_Sans] truncate min-w-0">
                            {h.title}
                          </p>

                          {/* Status label */}
                          <span className={`text-[9px] font-['IBM_Plex_Mono'] flex-shrink-0 ${st.text}`}>
                            {h.status}
                          </span>

                          {exps.length > 0 && (
                            <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-600 flex-shrink-0">
                              {exps.length}exp
                            </span>
                          )}
                        </div>

                        {/* Experiments (expanded) */}
                        {hypExpanded && exps.length > 0 && (
                          <div className="ml-5 border-l border-slate-800/30 pl-3 space-y-0.5 mb-1">
                            {exps.map(e => (
                              <div key={e.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-900/30">
                                <span className="w-1 h-1 rounded-full bg-amber-500/60 flex-shrink-0" />
                                <p className="flex-1 text-[11px] text-slate-400 font-[Nunito_Sans] truncate min-w-0">
                                  {e.description}
                                </p>
                                <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-600 flex-shrink-0">
                                  {EXP_TYPE_SHORT[e.type] ?? e.type}
                                </span>
                                <span className={`text-[9px] font-['IBM_Plex_Mono'] flex-shrink-0 ${
                                  e.status === 'terminada' ? 'text-green-400' : e.status === 'en curso' ? 'text-blue-400' : 'text-slate-600'
                                }`}>
                                  {e.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
