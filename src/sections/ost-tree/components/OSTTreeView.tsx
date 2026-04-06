import { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Pencil, Check, Plus, Star, Trash2 } from 'lucide-react'
import type { Opportunity, SolutionSummary } from '../../../types'
import type { ExperimentSummary } from '../../../hooks/use-ost-tree'

interface OSTTreeViewProps {
  projectName: string
  outcome: string
  opportunities: Opportunity[]
  solutionsSummary: Record<string, SolutionSummary[]>
  experimentsSummary: Record<string, ExperimentSummary[]>
  selectedId: string | null
  onSelect: (id: string) => void
  onNavigateToDetail?: (id: string) => void
  onRenameOpportunity?: (id: string, name: string) => void
  onAddOpportunity?: () => void
  onAddSolution?: (opportunityId: string) => void
  onAddExperiment?: (assumptionId: string) => void
  onRenameSolution?: (id: string, text: string) => void
  onRenameExperiment?: (id: string, text: string) => void
  onEditOutcome?: (text: string) => void
  starredIds?: Set<string>
  onToggleStar?: (id: string) => void
  onDeleteOpportunity?: (id: string) => void
  onDeleteSolution?: (id: string) => void
  onDeleteExperiment?: (id: string) => void
  onOpenExperiment?: (experimentId: string) => void
  members?: { id: string; name: string; avatarUrl: string | null }[]
  assignedMap?: Record<string, string | null>
  onAssign?: (type: 'opportunity' | 'solution' | 'experiment', id: string, userId: string | null) => void
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

function AssignAvatar({ itemId, type, members, assignedMap, onAssign }: {
  itemId: string; type: 'opportunity' | 'solution' | 'experiment'
  members?: { id: string; name: string; avatarUrl: string | null }[]
  assignedMap?: Record<string, string | null>
  onAssign?: (type: 'opportunity' | 'solution' | 'experiment', id: string, userId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  if (!members?.length || !onAssign) return null
  const assignedId = assignedMap?.[itemId]
  const assigned = assignedId ? members.find(m => m.id === assignedId) : null

  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} title={assigned ? assigned.name : 'Asignar'}>
        {assigned ? (
          assigned.avatarUrl ? (
            <img src={assigned.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-700" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-slate-700">
              {assigned.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          )
        ) : (
          <div className="w-5 h-5 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-600 hover:border-slate-400 hover:text-slate-400 transition-colors">
            <Plus size={8} />
          </div>
        )}
      </button>
      {open && (
        <div className="absolute top-7 right-0 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px]">
          {assigned && (
            <button onClick={() => { onAssign(type, itemId, null); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-[10px] text-slate-400 hover:bg-slate-800 font-[Nunito_Sans]">
              Desasignar
            </button>
          )}
          {members.map(m => (
            <button key={m.id} onClick={() => { onAssign(type, itemId, m.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-800 ${m.id === assignedId ? 'bg-slate-800' : ''}`}>
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-white text-[7px] font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[10px] text-slate-300 font-[Nunito_Sans] truncate">{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function OSTTreeViewCanvas({
  projectName, outcome, opportunities, solutionsSummary, experimentsSummary,
  selectedId, onSelect, onRenameOpportunity, onAddOpportunity, onAddSolution, onAddExperiment,
  onRenameSolution, onRenameExperiment, onEditOutcome, starredIds, onToggleStar,
  onDeleteOpportunity, onDeleteSolution, onDeleteExperiment, onOpenExperiment,
  members, assignedMap, onAssign,
}: OSTTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(() => new Set(opportunities.filter(o => !o.isArchived).map(o => o.id)))
  const [expandedSols, setExpandedSols] = useState<Set<string>>(new Set())

  // Auto-expand solutions that have experiments whenever data changes
  useEffect(() => {
    const ids = new Set<string>()
    Object.values(solutionsSummary).flat().forEach(sol => {
      if (sol.experimentCount > 0) ids.add(sol.id)
    })
    if (ids.size > 0) setExpandedSols(prev => new Set([...prev, ...ids]))
  }, [solutionsSummary])
  const [renderKey, setRenderKey] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Pan/drag for canvas navigation
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return
    const el = wrapperRef.current
    if (!el) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const el = wrapperRef.current
    if (!el) return
    el.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x)
    el.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y)
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  const toggleOpp = (id: string) => {
    setExpandedOpps(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setRenderKey(k => k + 1)
  }
  const toggleSol = (id: string) => {
    setExpandedSols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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

    // Each opp → its solutions
    const oppEls = c.querySelectorAll('[data-n="opp"]')
    oppEls.forEach(el => {
      const id = el.getAttribute('data-id')
      connect(`[data-n="opp"][data-id="${id}"]`, `[data-n="sol"][data-parent="${id}"]`)
    })

    // Each sol → its experiments
    const solEls = c.querySelectorAll('[data-n="sol"]')
    solEls.forEach(el => {
      const id = el.getAttribute('data-id')
      connect(`[data-n="sol"][data-id="${id}"]`, `[data-n="exp"][data-parent="${id}"]`)
    })

    setLines(newLines)
  }, [expandedOpps, expandedSols, opportunities, solutionsSummary, experimentsSummary, renderKey])

  const activeOpps = opportunities.filter(o => !o.isArchived)

  if (activeOpps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 font-[Nunito_Sans] text-sm">No hay oportunidades aún</p>
      </div>
    )
  }

  return (
    <div ref={(el) => { (containerRef as any).current = el; (wrapperRef as any).current = el }}
      className={`relative overflow-auto w-full h-full p-6 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ minHeight: '400px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}>
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
          {/* + Oportunidad inside outcome card */}
          {onAddOpportunity && (
            <button onClick={onAddOpportunity}
              className="w-full mt-3 -mb-4 -mx-6 px-6 py-2 bg-red-700/50 border-t border-red-500/30 rounded-b-2xl text-[10px] font-[Nunito_Sans] font-semibold text-red-200 hover:bg-red-700/80 hover:text-white transition-colors flex items-center justify-center gap-1"
              style={{ width: 'calc(100% + 48px)' }}>
              <Plus size={11} /> Agregar oportunidad
            </button>
          )}
        </div>

        {/* Level 1: Opportunities */}
        <div className="flex gap-5 flex-wrap justify-center">
          {activeOpps.map(opp => {
            const sols = solutionsSummary[opp.id] ?? []
            const isExp = expandedOpps.has(opp.id)
            return (
              <div key={opp.id} data-n="opp" data-id={opp.id}
                onClick={() => onSelect(opp.id)}
                className={`relative cursor-pointer rounded-xl border px-4 py-3 w-52 transition-all hover:shadow-md ${
                  opp.isTarget
                    ? 'bg-slate-800 border-amber-500/60 shadow-amber-500/20 ring-1 ring-amber-500/30'
                    : selectedId === opp.id
                      ? 'bg-slate-800 border-orange-500/50 shadow-orange-500/10'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}>
                {/* Delete confirmation overlay */}
                {confirmDeleteId === opp.id && (
                  <div className="absolute inset-0 bg-slate-950/95 rounded-xl z-10 flex flex-col items-center justify-center gap-2 p-3" onClick={e => e.stopPropagation()}>
                    <p className="text-xs text-slate-300 font-[Nunito_Sans] text-center">¿Eliminar esta oportunidad?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1 text-[10px] text-slate-400 hover:text-slate-200 rounded-lg">Cancelar</button>
                      <button onClick={() => { onDeleteOpportunity?.(opp.id); setConfirmDeleteId(null) }} className="px-3 py-1 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold">Eliminar</button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {opp.isTarget && <span className="text-amber-400" title="Target">{'⭐'}</span>}
                    <p className="text-[9px] font-['IBM_Plex_Mono'] text-orange-400 uppercase tracking-wider">Oportunidad</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <AssignAvatar itemId={opp.id} type="opportunity" members={members} assignedMap={assignedMap} onAssign={onAssign} />
                    {onToggleStar && (
                      <button onClick={e => { e.stopPropagation(); onToggleStar(opp.id) }}
                        className={`flex-shrink-0 transition-colors ${starredIds?.has(opp.id) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                        <Star size={12} fill={starredIds?.has(opp.id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    {onDeleteOpportunity && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(opp.id) }}
                        className="text-slate-600 hover:text-red-400 flex-shrink-0 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    )}
                    {sols.length > 0 && (
                      <button onClick={e => { e.stopPropagation(); toggleOpp(opp.id) }}
                        className="text-slate-500 hover:text-slate-300">
                        {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                  </div>
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
                  <span>sol:{sols.length}</span>
                </div>
                {sols.length < 3 ? (
                  <p className="text-[9px] text-amber-400 font-[Nunito_Sans] mt-1">{'💡'} Idea al menos 3 soluciones</p>
                ) : (
                  <p className="text-[9px] text-green-400 font-['IBM_Plex_Mono'] mt-1">{'✓'} 3+ soluciones</p>
                )}
                {onAddSolution && (
                  <button onClick={e => { e.stopPropagation(); onAddSolution(opp.id) }}
                    className="w-full flex items-center justify-center gap-1 mt-2 py-1.5 rounded-lg border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[10px] font-[Nunito_Sans] font-semibold transition-colors">
                    <Plus size={10} /> Agregar solución
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Level 2: Solutions */}
        {(() => {
          const visibleSols = activeOpps
            .filter(o => expandedOpps.has(o.id))
            .flatMap(o => (solutionsSummary[o.id] ?? []).map(s => ({ ...s, oppId: o.id })))
          if (visibleSols.length === 0) return null
          return (
            <div className="flex gap-4 flex-wrap justify-center">
              {visibleSols.map(s => {
                const isExp = expandedSols.has(s.id)
                return (
                  <div key={s.id} data-n="sol" data-id={s.id} data-parent={s.oppId}
                    className="relative bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 w-48 hover:border-indigo-500/30 transition-all">
                    {confirmDeleteId === s.id && (
                      <div className="absolute inset-0 bg-slate-950/95 rounded-xl z-10 flex flex-col items-center justify-center gap-2 p-3">
                        <p className="text-[10px] text-slate-300 font-[Nunito_Sans] text-center">¿Eliminar esta solución?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-[10px] text-slate-400 rounded-lg">Cancelar</button>
                          <button onClick={() => { onDeleteSolution?.(s.id); setConfirmDeleteId(null) }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold">Eliminar</button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <p className="text-[9px] font-['IBM_Plex_Mono'] text-indigo-400 uppercase tracking-wider">Solución</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <AssignAvatar itemId={s.id} type="solution" members={members} assignedMap={assignedMap} onAssign={onAssign} />
                        {onToggleStar && (
                          <button onClick={() => onToggleStar(s.id)}
                            className={`flex-shrink-0 transition-colors ${starredIds?.has(s.id) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                            <Star size={10} fill={starredIds?.has(s.id) ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        {onDeleteSolution && (
                          <button onClick={() => setConfirmDeleteId(s.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                        )}
                        {s.experimentCount > 0 && (
                          <button onClick={() => toggleSol(s.id)} className="text-slate-500 hover:text-slate-300">
                            {isExp ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {editingId === s.id ? (
                      <div className="flex items-start gap-1">
                        <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRenameSolution?.(s.id, editText); setEditingId(null) }; if (e.key === 'Escape') setEditingId(null) }}
                          rows={2} className="w-full bg-slate-800 border border-indigo-500/50 rounded px-2 py-1 text-xs text-slate-100 font-[Nunito_Sans] focus:outline-none resize-y min-h-[1.5rem]" />
                        <button onClick={() => { onRenameSolution?.(s.id, editText); setEditingId(null) }}
                          className="text-green-400 hover:text-green-300 flex-shrink-0 mt-0.5"><Check size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 group/htitle">
                        <p className="font-[Nunito_Sans] text-xs text-slate-200 line-clamp-2 leading-snug flex-1">{s.name}</p>
                        {onRenameSolution && (
                          <button onClick={() => { setEditingId(s.id); setEditText(s.name) }}
                            className="opacity-0 group-hover/htitle:opacity-100 text-slate-500 hover:text-indigo-400 flex-shrink-0 mt-0.5"><Pencil size={9} /></button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                      <span>{s.assumptionCount} sup</span>
                      {s.experimentCount > 0 && <span>{s.experimentCount} exp</span>}
                    </div>
                    {onAddExperiment && (
                      <button onClick={() => onAddExperiment(s.id)}
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
            .flatMap(o => (solutionsSummary[o.id] ?? [])
              .filter(s => expandedSols.has(s.id))
              .flatMap(s => (experimentsSummary[s.id] ?? []).map(e => ({ ...e, solId: s.id })))
            )
          if (visibleExps.length === 0) return null
          return (
            <div className="flex gap-3 flex-wrap justify-center">
              {visibleExps.map(e => {
                const dot = EXP_DOT[e.status] ?? EXP_DOT['to do']
                return (
                  <div key={e.id} data-n="exp" data-id={e.id} data-parent={e.solId}
                    onClick={() => onOpenExperiment?.(e.id)}
                    className="relative bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2 w-40 hover:border-amber-500/30 transition-all cursor-pointer">
                    {confirmDeleteId === e.id && (
                      <div className="absolute inset-0 bg-slate-950/95 rounded-lg z-10 flex flex-col items-center justify-center gap-2 p-2">
                        <p className="text-[9px] text-slate-300 font-[Nunito_Sans] text-center">¿Eliminar?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 text-[9px] text-slate-400 rounded">No</button>
                          <button onClick={() => { onDeleteExperiment?.(e.id); setConfirmDeleteId(null) }} className="px-2 py-0.5 text-[9px] bg-red-600 text-white rounded font-semibold">Sí</button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <p className="text-[8px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider">Experimento</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <AssignAvatar itemId={e.id} type="experiment" members={members} assignedMap={assignedMap} onAssign={onAssign} />
                        {onToggleStar && (
                          <button onClick={(ev) => { ev.stopPropagation(); onToggleStar(e.id) }}
                            className={`flex-shrink-0 transition-colors ${starredIds?.has(e.id) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                            <Star size={9} fill={starredIds?.has(e.id) ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        {onDeleteExperiment && (
                          <button onClick={(ev) => { ev.stopPropagation(); setConfirmDeleteId(e.id) }} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={9} /></button>
                        )}
                      </div>
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
                    {/* Ver más tab */}
                    {onOpenExperiment && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onOpenExperiment(e.id) }}
                        className="w-full mt-2 -mb-2 -mx-3 px-3 py-1.5 bg-amber-500/5 border-t border-amber-500/10 rounded-b-lg text-[9px] font-['IBM_Plex_Mono'] text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 transition-colors text-center"
                        style={{ width: 'calc(100% + 24px)' }}
                      >
                        Ver más →
                      </button>
                    )}
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
