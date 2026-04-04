import { useRef, useLayoutEffect, useState } from 'react'
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
}

// ─── Status colors ────────────────────────────────────────────────────────────

const HYP_STATUS: Record<string, { bg: string; text: string }> = {
  'to do':    { bg: 'bg-slate-800', text: 'text-slate-400' },
  'en curso': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'terminada': { bg: 'bg-green-500/10', text: 'text-green-400' },
}

const EXP_TYPE_SHORT: Record<string, string> = {
  entrevista: 'Entrev.',
  prototipo: 'Proto.',
  smoke_test: 'Smoke',
  prueba_usabilidad: 'Usab.',
  otro: 'Otro',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OSTTreeViewCanvas({
  projectName,
  outcome,
  opportunities,
  hypothesesSummary,
  experimentsSummary,
  selectedId,
  onSelect,
}: OSTTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([])

  // Compute connector lines after render
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const newLines: { x1: number; y1: number; x2: number; y2: number }[] = []

    // Outcome → Opportunities
    const outcomeEl = container.querySelector('[data-node="outcome"]')
    const oppEls = container.querySelectorAll('[data-node="opp"]')
    if (outcomeEl) {
      const oRect = outcomeEl.getBoundingClientRect()
      const ox = oRect.left + oRect.width / 2 - rect.left
      const oy = oRect.bottom - rect.top

      oppEls.forEach(el => {
        const eRect = el.getBoundingClientRect()
        newLines.push({
          x1: ox,
          y1: oy,
          x2: eRect.left + eRect.width / 2 - rect.left,
          y2: eRect.top - rect.top,
        })
      })
    }

    // Opportunities → Hypotheses
    oppEls.forEach(oppEl => {
      const oppId = oppEl.getAttribute('data-id')
      const oRect = oppEl.getBoundingClientRect()
      const ox = oRect.left + oRect.width / 2 - rect.left
      const oy = oRect.bottom - rect.top

      const hypEls = container.querySelectorAll(`[data-node="hyp"][data-parent="${oppId}"]`)
      hypEls.forEach(hEl => {
        const hRect = hEl.getBoundingClientRect()
        newLines.push({
          x1: ox,
          y1: oy,
          x2: hRect.left + hRect.width / 2 - rect.left,
          y2: hRect.top - rect.top,
        })

        // Hypotheses → Experiments
        const hypId = hEl.getAttribute('data-id')
        const expEls = container.querySelectorAll(`[data-node="exp"][data-parent="${hypId}"]`)
        const hx = hRect.left + hRect.width / 2 - rect.left
        const hy = hRect.bottom - rect.top

        expEls.forEach(eEl => {
          const eRect = eEl.getBoundingClientRect()
          newLines.push({
            x1: hx,
            y1: hy,
            x2: eRect.left + eRect.width / 2 - rect.left,
            y2: eRect.top - rect.top,
          })
        })
      })
    })

    setLines(newLines)
  }, [opportunities, hypothesesSummary, experimentsSummary])

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <p className="text-slate-400 font-[Nunito_Sans] text-sm">No hay oportunidades aún</p>
        <p className="text-slate-400 font-[Nunito_Sans] text-xs mt-1">Crea la primera usando el botón superior</p>
      </div>
    )
  }

  const activeOpps = opportunities.filter(o => !o.isArchived)

  return (
    <div className="overflow-auto w-full h-full" ref={containerRef} style={{ position: 'relative' }}>
      {/* SVG connectors */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {lines.map((l, i) => {
          const midY = (l.y1 + l.y2) / 2
          return (
            <path
              key={i}
              d={`M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`}
              fill="none"
              stroke="rgb(51 65 85)"
              strokeWidth="1.5"
            />
          )
        })}
      </svg>

      <div className="relative flex flex-col items-center gap-12 py-8 px-4" style={{ zIndex: 1, minWidth: 'max-content' }}>

        {/* Level 0: Outcome */}
        <div
          data-node="outcome"
          className="bg-red-600 text-white rounded-2xl px-6 py-4 text-center max-w-md shadow-lg shadow-red-900/30"
        >
          <p className="text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-wider text-red-200 mb-1">Outcome</p>
          <p className="font-[Nunito_Sans] font-bold text-sm leading-snug">
            {outcome || projectName}
          </p>
        </div>

        {/* Level 1: Opportunities */}
        <div className="flex gap-6 flex-wrap justify-center">
          {activeOpps.map(opp => (
            <div
              key={opp.id}
              data-node="opp"
              data-id={opp.id}
              onClick={() => onSelect(opp.id)}
              className={`
                cursor-pointer rounded-xl border px-4 py-3 w-48 transition-all
                ${selectedId === opp.id
                  ? 'bg-slate-900 border-red-500/60 shadow-lg shadow-red-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }
              `}
            >
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-red-400 uppercase tracking-wider mb-1">Oportunidad</p>
              <p className="font-[Nunito_Sans] text-sm font-semibold text-slate-100 line-clamp-2 leading-snug">
                {opp.title}
              </p>
              <div className="flex gap-2 mt-2 font-['IBM_Plex_Mono'] text-[10px] text-slate-400">
                {opp.evidenceCount > 0 && <span>ev:{opp.evidenceCount}</span>}
                {opp.hypothesisCount > 0 && <span>hip:{opp.hypothesisCount}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Level 2: Hypotheses */}
        {(() => {
          const allHyps = activeOpps.flatMap(opp =>
            (hypothesesSummary[opp.id] ?? []).map(h => ({ ...h, oppId: opp.id }))
          )
          if (allHyps.length === 0) return null
          return (
            <div className="flex gap-4 flex-wrap justify-center">
              {allHyps.map(h => {
                const st = HYP_STATUS[h.status] ?? HYP_STATUS['to do']
                const exps = experimentsSummary[h.id] ?? []
                return (
                  <div
                    key={h.id}
                    data-node="hyp"
                    data-id={h.id}
                    data-parent={h.oppId}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 w-44"
                  >
                    <p className="text-[10px] font-['IBM_Plex_Mono'] text-blue-400 uppercase tracking-wider mb-1">Hipótesis</p>
                    <p className="font-[Nunito_Sans] text-xs text-slate-200 line-clamp-2 leading-snug">{h.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[9px] font-['IBM_Plex_Mono'] px-1.5 py-0.5 rounded ${st.bg} ${st.text}`}>
                        {h.status}
                      </span>
                      {exps.length > 0 && (
                        <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                          {exps.length} exp
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Level 3: Experiments */}
        {(() => {
          const allExps = activeOpps.flatMap(opp =>
            (hypothesesSummary[opp.id] ?? []).flatMap(h =>
              (experimentsSummary[h.id] ?? []).map(e => ({ ...e, hypId: h.id }))
            )
          )
          if (allExps.length === 0) return null
          return (
            <div className="flex gap-3 flex-wrap justify-center">
              {allExps.map(e => (
                <div
                  key={e.id}
                  data-node="exp"
                  data-id={e.id}
                  data-parent={e.hypId}
                  className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 w-36"
                >
                  <p className="text-[9px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider mb-1">Experimento</p>
                  <p className="font-[Nunito_Sans] text-[11px] text-slate-300 line-clamp-2 leading-snug">{e.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                      {EXP_TYPE_SHORT[e.type] ?? e.type}
                    </span>
                    <span className={`text-[9px] font-['IBM_Plex_Mono'] ${e.status === 'terminada' ? 'text-green-400' : e.status === 'en curso' ? 'text-blue-400' : 'text-slate-500'}`}>
                      {e.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
