import { useState, useRef, useLayoutEffect } from 'react'
import { ChevronDown, ChevronRight, Pencil, Check, Plus } from 'lucide-react'
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
  onRenameOpportunity?: (id: string, name: string) => void
  onAddOpportunity?: () => void
  onAddHypothesis?: (opportunityId: string) => void
  onAddExperiment?: (hypothesisId: string) => void
  onRenameHypothesis?: (id: string, text: string) => void
  onRenameExperiment?: (id: string, text: string) => void
  onEditOutcome?: (text: string) => void
}

const HYP_DOT: Record<string, string> = {
  'to do': 'bg-slate-500',
  'en curso': 'bg-blue-400',
  'terminada': 'bg-green-400',
}

const EXP_DOT: Record<string, string> = {
  'to do': 'bg-slate-600',
  'en curso': 'bg-blue-400',
  'terminada': 'bg-green-400',
}

const EXP_TYPE: Record<string, string> = {
  entrevista: 'Entrev.', prototipo: 'Proto.', smoke_test: 'Smoke',
  prueba_usabilidad: 'Usab.', otro: 'Otro',
}

interface Line { x1: number; y1: number; x2: number; y2: number }

export function OSTTreeViewCanvas({
  projectName, outcome, opportunities, hypothesesSummary, experimentsSummary,
  selectedId, onSelect, onRenameOpportunity, onAddOpportunity, onAddHypothesis, onAddExperiment,
  onRenameHypothesis, onRenameExperiment, onEditOutcome,
}: OSTTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(() => new Set(opportunities.filter(o => !o.isArchived).map(o => o.id)))
  const [expandedHyps, setExpandedHyps] = useState<Set<string>>(() => {
    // Auto-expand hypotheses that have experiments
    const ids = new Set<string>()
    Object.entries(experimentsSummary).forEach(([hypId, exps]) => {
      if (exps.length > 0) ids.add(hypId)
    })
    return ids
  })
  const [renderKey, setRenderKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const toggleOpp = (id: string) => {
    setExpandedOpps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setRenderKey(k => k + 1)
  }
  const toggleHyp = (id: string) => {
    setExpandedHyps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setRenderKey(k => k + 1)
  }

  // Compute SVG lines after layout
  useLayoutEffect(() => {
    if (!containerRef.current) return
    const c = containerRef.current
    const cr = c.getBoundingClientRect()
    const newLines: Line[] = []

    function connect(parentSel: string, childSel: string) {
      const parent = c.querySelector(parentSel)
      const children = c.querySelectorAll(childSel)
      if (!parent || !children.length) return
      const pr = parent.getBoundingClientRect()
      const px = pr.left + pr.width / 2 - cr.left
      const py = pr.bottom - cr.top

      children.forEach(child => {
        const chr = child.getBoundingClientRect()
        const cx = chr.left + chr.width / 2 - cr.left
        const cy = chr.top - cr.top
        newLines.push({ x1: px, y1: py, x2: cx, y2: cy })
      })
    }

    // Outcome → Opportunities
    connect('[data-n="outcome"]', '[data-n="opp"]')

    // Each opp → its hypotheses
    const oppEls = c.querySelectorAll('[data-n="opp"]')
    oppEls.forEach(el => {
      const id = el.getAttribute('data-id')
      connect(`[data-n="opp"][data-id="${id}"]`, `[data-n="hyp"][data-parent="${id}"]`)
    })

    // Each hyp → its experiments
    const hypEls = c.querySelectorAll('[data-n="hyp"]')
    hypEls.forEach(el => {
      const id = el.getAttribute('data-id')
      connect(`[data-n="hyp"][data-id="${id}"]`, `[data-n="exp"][data-parent="${id}"]`)
    })

    setLines(newLines)
  }, [expandedOpps, expandedHyps, opportunities, hypothesesSummary, experimentsSummary, renderKey])

  const activeOpps = opportunities.filter(o => !o.isArchived)

  if (activeOpps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 font-[Nunito_Sans] text-sm">No hay oportunidades aún</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative overflow-auto w-full h-full p-6" style={{ minHeight: '400px' }}>
      {/* SVG connectors */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 0 }}>
        {lines.map((l, i) => {
          const midY = l.y1 + (l.y2 - l.y1) * 0.5
          return <path key={i} d={`M${l.x1},${l.y1} C${l.x1},${midY} ${l.x2},${midY} ${l.x2},${l.y2}`}
            fill="none" stroke="rgb(71 85 105)" strokeWidth="1.5" strokeDasharray="none" />
        })}
      </svg>

      <div className="relative flex flex-col items-center gap-10" style={{ zIndex: 1 }}>

        {/* Level 0: Outcome */}
        <div data-n="outcome"
          className="bg-red-600 text-white rounded-2xl px-6 py-4 text-center max-w-lg shadow-lg shadow-red-900/30 cursor-pointer group/outcome"
          onDoubleClick={() => { if (onEditOutcome) { setEditingId('__outcome__'); setEditText(outcome || '') } }}>
          <p className="text-[9px] font-['IBM_Plex_Mono'] uppercase tracking-widest text-red-200 mb-1">Outcome</p>
          {editingId === '__outcome__' ? (
            <div className="flex items-start gap-2">
              <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditOutcome?.(editText); setEditingId(null) }; if (e.key === 'Escape') setEditingId(null) }}
                rows={2} className="w-full bg-red-700 border border-red-400/50 rounded px-2 py-1 text-sm text-white font-[Nunito_Sans] focus:outline-none resize-y min-h-[2rem] placeholder:text-red-300"
                placeholder="¿Qué resultado querés lograr?" />
              <button onClick={() => { onEditOutcome?.(editText); setEditingId(null) }}
                className="text-red-200 hover:text-white flex-shrink-0 mt-1"><Check size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <p className="font-[Nunito_Sans] font-bold text-sm leading-snug">{outcome || projectName}</p>
              {onEditOutcome && (
                <button onClick={() => { setEditingId('__outcome__'); setEditText(outcome || '') }}
                  className="text-red-300 hover:text-white flex-shrink-0">
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* + Add Opportunity button under Outcome */}
        {onAddOpportunity && (
          <button onClick={onAddOpportunity}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs font-[Nunito_Sans] font-semibold transition-colors">
            <Plus size={12} /> Oportunidad
          </button>
        )}

        {/* Level 1: Opportunities */}
        <div className="flex gap-5 flex-wrap justify-center">
          {activeOpps.map(opp => {
            const hyps = hypothesesSummary[opp.id] ?? []
            const isExp = expandedOpps.has(opp.id)
            return (
              <div key={opp.id} data-n="opp" data-id={opp.id}
                onClick={() => onSelect(opp.id)}
                className={`cursor-pointer rounded-xl border px-4 py-3 w-52 transition-all hover:shadow-md ${
                  selectedId === opp.id
                    ? 'bg-slate-800 border-orange-500/50 shadow-orange-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-['IBM_Plex_Mono'] text-orange-400 uppercase tracking-wider">Oportunidad</p>
                  {hyps.length > 0 && (
                    <button onClick={e => { e.stopPropagation(); toggleOpp(opp.id) }}
                      className="text-slate-500 hover:text-slate-300">
                      {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}
                </div>
                {editingId === opp.id ? (
                  <div className="flex items-start gap-1">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRenameOpportunity?.(opp.id, editText); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      rows={2}
                      className="w-full bg-slate-800 border border-orange-500/50 rounded px-2 py-1 text-sm text-slate-100 font-[Nunito_Sans] focus:outline-none resize-y min-h-[2rem]"
                    />
                    <button onClick={e => { e.stopPropagation(); onRenameOpportunity?.(opp.id, editText); setEditingId(null) }}
                      className="text-green-400 hover:text-green-300 flex-shrink-0 mt-1"><Check size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-start gap-1 group/title">
                    <p className="font-[Nunito_Sans] text-sm font-semibold text-slate-100 line-clamp-2 leading-snug flex-1">{opp.title}</p>
                    {onRenameOpportunity && (
                      <button onClick={e => { e.stopPropagation(); setEditingId(opp.id); setEditText(opp.title) }}
                        className="opacity-0 group-hover/title:opacity-100 text-slate-500 hover:text-orange-400 flex-shrink-0 mt-0.5">
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-2 text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                  <span>ev:{opp.evidenceCount}</span>
                  <span>hip:{hyps.length}</span>
                </div>
                {onAddHypothesis && (
                  <button onClick={e => { e.stopPropagation(); onAddHypothesis(opp.id) }}
                    className="w-full flex items-center justify-center gap-1 mt-2 py-1.5 rounded-lg border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[10px] font-[Nunito_Sans] font-semibold transition-colors">
                    <Plus size={10} /> Agregar solución
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Level 2: Hypotheses */}
        {(() => {
          const visibleHyps = activeOpps
            .filter(o => expandedOpps.has(o.id))
            .flatMap(o => (hypothesesSummary[o.id] ?? []).map(h => ({ ...h, oppId: o.id })))
          if (visibleHyps.length === 0) return null
          return (
            <div className="flex gap-4 flex-wrap justify-center">
              {visibleHyps.map(h => {
                const exps = experimentsSummary[h.id] ?? []
                const isExp = expandedHyps.has(h.id)
                const dot = HYP_DOT[h.status] ?? HYP_DOT['to do']
                return (
                  <div key={h.id} data-n="hyp" data-id={h.id} data-parent={h.oppId}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 w-48 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <p className="text-[9px] font-['IBM_Plex_Mono'] text-indigo-400 uppercase tracking-wider">Solución</p>
                      </div>
                      {exps.length > 0 && (
                        <button onClick={() => toggleHyp(h.id)} className="text-slate-500 hover:text-slate-300">
                          {isExp ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </button>
                      )}
                    </div>
                    {editingId === h.id ? (
                      <div className="flex items-start gap-1">
                        <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRenameHypothesis?.(h.id, editText); setEditingId(null) }; if (e.key === 'Escape') setEditingId(null) }}
                          rows={2} className="w-full bg-slate-800 border border-indigo-500/50 rounded px-2 py-1 text-xs text-slate-100 font-[Nunito_Sans] focus:outline-none resize-y min-h-[1.5rem]" />
                        <button onClick={() => { onRenameHypothesis?.(h.id, editText); setEditingId(null) }}
                          className="text-green-400 hover:text-green-300 flex-shrink-0 mt-0.5"><Check size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 group/htitle">
                        <p className="font-[Nunito_Sans] text-xs text-slate-200 line-clamp-2 leading-snug flex-1">{h.title}</p>
                        {onRenameHypothesis && (
                          <button onClick={() => { setEditingId(h.id); setEditText(h.title) }}
                            className="opacity-0 group-hover/htitle:opacity-100 text-slate-500 hover:text-indigo-400 flex-shrink-0 mt-0.5"><Pencil size={9} /></button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                      <span>{h.status}</span>
                      {exps.length > 0 && <span>{exps.length} exp</span>}
                    </div>
                    {onAddExperiment && (
                      <button onClick={() => onAddExperiment(h.id)}
                        className="w-full flex items-center justify-center gap-1 mt-2 py-1 rounded-lg border border-dashed border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[10px] font-[Nunito_Sans] font-semibold transition-colors">
                        <Plus size={9} /> Agregar experimento
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Level 3: Experiments */}
        {(() => {
          const visibleExps = activeOpps
            .filter(o => expandedOpps.has(o.id))
            .flatMap(o => (hypothesesSummary[o.id] ?? [])
              .filter(h => expandedHyps.has(h.id))
              .flatMap(h => (experimentsSummary[h.id] ?? []).map(e => ({ ...e, hypId: h.id })))
            )
          if (visibleExps.length === 0) return null
          return (
            <div className="flex gap-3 flex-wrap justify-center">
              {visibleExps.map(e => {
                const dot = EXP_DOT[e.status] ?? EXP_DOT['to do']
                return (
                  <div key={e.id} data-n="exp" data-id={e.id} data-parent={e.hypId}
                    className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 w-40 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      <p className="text-[8px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider">Experimento</p>
                    </div>
                    {editingId === e.id ? (
                      <div className="flex items-start gap-1">
                        <textarea autoFocus value={editText} onChange={ev => setEditText(ev.target.value)}
                          onKeyDown={ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); onRenameExperiment?.(e.id, editText); setEditingId(null) }; if (ev.key === 'Escape') setEditingId(null) }}
                          rows={2} className="w-full bg-slate-800 border border-amber-500/50 rounded px-2 py-1 text-[11px] text-slate-100 font-[Nunito_Sans] focus:outline-none resize-y min-h-[1.5rem]" />
                        <button onClick={() => { onRenameExperiment?.(e.id, editText); setEditingId(null) }}
                          className="text-green-400 hover:text-green-300 flex-shrink-0 mt-0.5"><Check size={10} /></button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 group/etitle">
                        <p className="font-[Nunito_Sans] text-[11px] text-slate-300 line-clamp-2 leading-snug flex-1">{e.description}</p>
                        {onRenameExperiment && (
                          <button onClick={() => { setEditingId(e.id); setEditText(e.description) }}
                            className="opacity-0 group-hover/etitle:opacity-100 text-slate-500 hover:text-amber-400 flex-shrink-0 mt-0.5"><Pencil size={8} /></button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 text-[8px] font-['IBM_Plex_Mono'] text-slate-500">
                      <span>{EXP_TYPE[e.type] ?? e.type}</span>
                      <span className={e.status === 'terminada' ? 'text-green-400' : ''}>{e.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
