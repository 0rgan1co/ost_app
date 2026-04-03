import type { Opportunity, OSTTreeEvidence, HypothesisSummary } from '../../../types'

interface OpportunityPanelProps {
  opportunity: Opportunity | null
  recentEvidence: OSTTreeEvidence[]
  hypothesesSummary: HypothesisSummary[]
  isOpen: boolean
  onClose: () => void
  onNavigateToDetail: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
}

const EVIDENCE_TYPE_CONFIG = {
  cita: { label: 'Cita', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  hecho: { label: 'Hecho', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  observacion: { label: 'Obs.', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
}

const HYPOTHESIS_STATUS_CONFIG = {
  'to do': { label: 'Por hacer', color: 'text-slate-400', bg: 'bg-slate-800', dot: 'bg-slate-600' },
  'en curso': { label: 'En curso', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' },
  'terminada': { label: 'Terminada', color: 'text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400' },
}

export function OpportunityPanel({
  opportunity,
  recentEvidence,
  hypothesesSummary,
  isOpen,
  onClose,
  onNavigateToDetail,
  onArchive,
  onRestore,
}: OpportunityPanelProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300
          ${isOpen && opportunity ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full z-50
          w-full sm:w-[380px]
          bg-slate-950 border-l border-slate-800
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen && opportunity ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {opportunity && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {opportunity.isArchived ? (
                    <span className="font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                      Descartada
                    </span>
                  ) : (
                    <span className="font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      Activa
                    </span>
                  )}
                </div>
                <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base leading-snug">
                  {opportunity.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Description */}
              {opportunity.description && (
                <div>
                  <p className="font-[Nunito_Sans] text-slate-400 text-sm leading-relaxed">
                    {opportunity.description}
                  </p>
                </div>
              )}

              {/* Counters grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
                  <p className="font-[IBM_Plex_Mono] text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Evidencia
                  </p>
                  <p className="font-[IBM_Plex_Mono] text-xl font-bold text-slate-200">
                    {opportunity.evidenceCount}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
                  <p className="font-[IBM_Plex_Mono] text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Hipótesis activas
                  </p>
                  <p className={`font-[IBM_Plex_Mono] text-xl font-bold ${opportunity.activeHypothesisCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {opportunity.activeHypothesisCount}
                    <span className="text-sm font-normal text-slate-400">/{opportunity.hypothesisCount}</span>
                  </p>
                </div>
              </div>

              {/* Recent Evidence */}
              {recentEvidence.length > 0 && (
                <div>
                  <h3 className="font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-3">
                    Evidencia reciente
                  </h3>
                  <div className="space-y-2">
                    {recentEvidence.map(ev => {
                      const config = EVIDENCE_TYPE_CONFIG[ev.type]
                      return (
                        <div
                          key={ev.id}
                          className="bg-slate-900 rounded-lg border border-slate-800 p-3"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={`font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded ${config.color} ${config.bg} border ${config.border}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="font-[Nunito_Sans] text-slate-400 text-xs leading-relaxed line-clamp-3">
                            {ev.content}
                          </p>
                          {ev.source && (
                            <p className="font-[IBM_Plex_Mono] text-[10px] text-slate-400 mt-1.5 truncate">
                              — {ev.source}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Hypotheses summary */}
              {hypothesesSummary.length > 0 && (
                <div>
                  <h3 className="font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-3">
                    Hipótesis
                  </h3>
                  <div className="space-y-1.5">
                    {hypothesesSummary.slice(0, 4).map(h => {
                      const config = HYPOTHESIS_STATUS_CONFIG[h.status]
                      return (
                        <div
                          key={h.id}
                          className="flex items-start gap-2 py-1.5"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mt-1.5 flex-shrink-0`} />
                          <p className="font-[Nunito_Sans] text-slate-400 text-xs leading-relaxed flex-1 min-w-0 line-clamp-2">
                            {h.title}
                          </p>
                          <span className={`font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded ${config.color} ${config.bg} flex-shrink-0`}>
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state for no data */}
              {recentEvidence.length === 0 && hypothesesSummary.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-slate-400 font-[Nunito_Sans] text-xs">
                    Sin evidencia ni hipótesis aún
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => onNavigateToDetail(opportunity.id)}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-[Nunito_Sans] font-semibold text-sm transition-colors"
              >
                Ver detalle completo
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onNavigateToDetail(opportunity.id)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 font-[Nunito_Sans] text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Agregar evidencia
                </button>

                {opportunity.isArchived ? (
                  <button
                    onClick={() => { onRestore(opportunity.id); onClose() }}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-green-400 hover:text-green-300 hover:border-green-500/30 font-[Nunito_Sans] text-sm transition-colors"
                  >
                    Restaurar
                  </button>
                ) : (
                  <button
                    onClick={() => { onArchive(opportunity.id); onClose() }}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-amber-400 hover:text-amber-300 hover:border-amber-500/30 font-[Nunito_Sans] text-sm transition-colors"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
