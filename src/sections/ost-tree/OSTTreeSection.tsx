import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOSTTree } from '../../hooks/use-ost-tree'
import { useBusinessContext } from '../../hooks/use-business-context'
import { OSTListView } from './components/OSTListView'
import { OSTTreeViewCanvas } from './components/OSTTreeView'
import { OpportunityPanel } from './components/OpportunityPanel'
import { CreateOpportunityModal } from './components/CreateOpportunityModal'
import { WorkflowGuide } from './components/WorkflowGuide'
import { AgentGuide } from './components/AgentGuide'
import { ExperimentSeedModal } from '../../components/ExperimentSeedModal'
import type { Project } from '../../types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface OSTTreeSectionProps {
  project: Project
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

type ViewMode = 'list' | 'tree'

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange('list')}
        title="Vista lista"
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          font-[Nunito_Sans] text-xs font-semibold transition-all duration-150
          ${mode === 'list'
            ? 'bg-slate-800 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'
          }
        `}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Lista
      </button>
      <button
        onClick={() => onChange('tree')}
        title="Vista árbol"
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          font-[Nunito_Sans] text-xs font-semibold transition-all duration-150
          ${mode === 'tree'
            ? 'bg-slate-800 text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-300'
          }
        `}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="12" y2="13" />
          <line x1="12" y1="13" x2="5" y2="17" />
          <line x1="12" y1="13" x2="19" y2="17" />
        </svg>
        Árbol
      </button>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-12 rounded-xl bg-slate-900 border border-slate-800" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-slate-300 font-[Nunito_Sans] text-sm font-semibold mb-1">Error al cargar oportunidades</p>
      <p className="text-slate-500 font-[Nunito_Sans] text-xs mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-[Nunito_Sans] text-sm transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OSTTreeSection({ project }: OSTTreeSectionProps) {
  const navigate = useNavigate()

  const {
    opportunities,
    recentEvidence,
    hypothesesSummary,
    experimentsSummary,
    loading,
    error,
    createOpportunity,
    renameOpportunity,
    archiveOpportunity,
    restoreOpportunity,
    refetch,
  } = useOSTTree(project.id)

  const { context: bizContext, refetch: refetchContext } = useBusinessContext(project.id)

  const businessContextSummary = (bizContext.northStar.value || bizContext.targetSegment.value)
    ? {
        northStar: bizContext.northStar.value,
        targetSegment: bizContext.targetSegment.value,
        keyConstraints: bizContext.keyConstraints.value,
      }
    : null

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [openExpId, setOpenExpId] = useState<string | null>(null)
  const [openExpData, setOpenExpData] = useState<any>(null)
  const [assignedMap, setAssignedMap] = useState<Record<string, string | null>>({})

  // Load assigned_to for all items
  useEffect(() => {
    async function loadAssigned() {
      const [{ data: opps }, { data: hyps }, { data: exps }] = await Promise.all([
        supabase.from('opportunities').select('id, assigned_to').eq('project_id', project.id),
        supabase.from('hypotheses').select('id, assigned_to').in('opportunity_id', opportunities.map(o => o.id)),
        supabase.from('experiments').select('id, assigned_to').in('hypothesis_id',
          Object.values(hypothesesSummary).flat().map(h => h.id)
        ),
      ])
      const map: Record<string, string | null> = {}
      for (const o of opps ?? []) if (o.assigned_to) map[o.id] = o.assigned_to
      for (const h of hyps ?? []) if (h.assigned_to) map[h.id] = h.assigned_to
      for (const e of exps ?? []) if (e.assigned_to) map[e.id] = e.assigned_to
      setAssignedMap(map)
    }
    if (opportunities.length > 0) loadAssigned()
  }, [project.id, opportunities, hypothesesSummary])

  const handleAssign = useCallback(async (type: 'opportunity' | 'hypothesis' | 'experiment', id: string, userId: string | null) => {
    const table = type === 'opportunity' ? 'opportunities' : type === 'hypothesis' ? 'hypotheses' : 'experiments'
    await supabase.from(table).update({ assigned_to: userId }).eq('id', id)
    setAssignedMap(prev => ({ ...prev, [id]: userId }))
  }, [])

  const treeMembers = project.members.map(m => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))

  const handleOpenExperiment = useCallback(async (expId: string) => {
    const { data: exp } = await supabase.from('experiments').select('*').eq('id', expId).single()
    if (!exp) return
    const { data: hyp } = await supabase.from('hypotheses').select('id, description, opportunity_id').eq('id', exp.hypothesis_id).single()
    const oppName = hyp ? (opportunities.find(o => o.id === hyp.opportunity_id)?.title ?? '') : ''
    setOpenExpData({
      id: exp.id, description: exp.description, type: exp.type,
      successCriterion: exp.success_criterion, effort: exp.effort, impact: exp.impact,
      status: exp.status, result: exp.result,
      objective: exp.objective ?? '', who: exp.who ?? '', actions: exp.actions ?? '',
      startDate: exp.start_date, endDate: exp.end_date, reviewCycle: exp.review_cycle ?? '',
      projectName: project.name, opportunityName: oppName,
      hypothesisDescription: hyp?.description ?? '',
    })
    setOpenExpId(expId)
  }, [opportunities, project.name])

  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ost-starred') ?? '[]')) } catch { return new Set() }
  })

  const toggleStar = useCallback((id: string) => {
    setStarredIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('ost-starred', JSON.stringify([...next]))
      return next
    })
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────────
  const selectedOpportunity = selectedId
    ? (opportunities.find(o => o.id === selectedId) ?? null)
    : null

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setIsPanelOpen(true)
  }, [])

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedId(null), 300)
  }, [])

  const handleConfirmCreate = useCallback(async (data: { name: string; description: string }) => {
    await createOpportunity({
      name: data.name,
      description: data.description || undefined,
    })
    setIsModalOpen(false)
  }, [createOpportunity])

  const handleConfirmMultiple = useCallback(async (items: { name: string; description: string }[]) => {
    for (const item of items) {
      await createOpportunity({
        name: item.name,
        description: item.description || undefined,
      })
    }
    setIsModalOpen(false)
  }, [createOpportunity])

  const handleNavigateToDetail = useCallback((id: string) => {
    navigate(`/opportunity/${id}`)
  }, [navigate])

  // Edit outcome (saves to business context northStar)
  const handleEditOutcome = useCallback(async (text: string) => {
    if (!text.trim()) return
    const { data: existing } = await supabase.from('business_context').select('id, content').eq('project_id', project.id).maybeSingle()
    const now = new Date().toISOString()
    let prev: any = {}
    if (existing?.content) {
      try { prev = typeof existing.content === 'string' ? JSON.parse(existing.content) : existing.content } catch {}
    }
    const content = JSON.stringify({ ...prev, northStar: { value: text.trim(), updatedAt: now } })
    if (existing) {
      await supabase.from('business_context').update({ content }).eq('id', existing.id)
    } else {
      await supabase.from('business_context').insert({ project_id: project.id, content })
    }
    refetchContext()
  }, [project.id, refetchContext])

  // Rename hypothesis
  const handleRenameHypothesis = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return
    await supabase.from('hypotheses').update({ description: text.trim() }).eq('id', id)
    refetch()
  }, [refetch])

  // Rename experiment
  const handleRenameExperiment = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return
    await supabase.from('experiments').update({ description: text.trim() }).eq('id', id)
    refetch()
  }, [refetch])

  // Delete hypothesis
  const handleDeleteHypothesis = useCallback(async (id: string) => {
    await supabase.from('experiments').delete().eq('hypothesis_id', id)
    await supabase.from('hypotheses').delete().eq('id', id)
    refetch()
  }, [refetch])

  // Delete experiment
  const handleDeleteExperiment = useCallback(async (id: string) => {
    await supabase.from('experiments').delete().eq('id', id)
    refetch()
  }, [refetch])

  // Quick-add hypothesis from tree
  const handleQuickAddHypothesis = useCallback(async (opportunityId: string) => {
    const name = prompt('Escribí la hipótesis: "Si hacemos [acción], vamos a obtener [resultado]"')
    if (!name?.trim()) return
    await supabase.from('hypotheses').insert({
      opportunity_id: opportunityId,
      description: name.trim(),
      status: 'to do',
    })
    refetch()
  }, [refetch])

  // Quick-add experiment from tree
  const handleQuickAddExperiment = useCallback(async (hypothesisId: string) => {
    const name = prompt('Descripción del experimento:')
    if (!name?.trim()) return
    await supabase.from('experiments').insert({
      hypothesis_id: hypothesisId,
      type: 'otro',
      description: name.trim(),
      success_criterion: 'Por definir',
      effort: 'medio',
      impact: 'medio',
      status: 'to do',
    })
    refetch()
  }, [refetch])

  // ── Shared view props ───────────────────────────────────────────────────────
  const sharedViewProps = {
    selectedId,
    onSelect: handleSelect,
    onArchive: archiveOpportunity,
    onRestore: restoreOpportunity,
  }

  const activeOpps = opportunities.filter(o => !o.isArchived)
  const activeCount = activeOpps.length
  const totalHypotheses = Object.values(hypothesesSummary).reduce((sum, arr) => sum + arr.length, 0)
  const totalExperiments = Object.values(experimentsSummary).reduce((sum, arr) => sum + arr.length, 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="dark flex flex-col h-full min-h-0 bg-slate-950">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-[Nunito_Sans] font-bold text-slate-100 text-lg truncate">
            {project.name}
          </h1>
          {!loading && (
            <span className="font-[IBM_Plex_Mono] text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex-shrink-0">
              {activeCount} {activeCount === 1 ? 'oportunidad' : 'oportunidades'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => {
              const firstOpp = activeOpps[0]
              if (firstOpp) navigate(`/ai-evaluation/${firstOpp.id}`)
              else navigate('/ai-evaluation')
            }}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-violet-600 hover:bg-violet-500 text-white
              font-[Nunito_Sans] font-semibold text-sm
              transition-colors shadow-sm shadow-violet-900/30
            "
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.5 4.5H18l-3.5 2.5L16 14.5 12 11.5 8 14.5l1.5-4.5L6 7.5h4.5z" />
            </svg>
            Evaluar OST con IA
          </button>
        </div>
      </div>

      {/* ── Content area ───────────────────────────────────────────────────── */}
      <div className={`flex-1 min-h-0 ${viewMode === 'list' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* Workflow guide */}
        {!loading && !error && (
          <div className="px-6 pt-4">
            <WorkflowGuide
              hasOutcome={!!bizContext.northStar.value}
              opportunityCount={activeCount}
              hypothesisCount={totalHypotheses}
              experimentCount={totalExperiments}
              onGoToContext={() => navigate('/business-context')}
              onCreateOpportunity={() => setIsModalOpen(true)}
              onGoToDetail={() => {
                if (activeOpps[0]) navigate(`/opportunity/${activeOpps[0].id}`)
              }}
            />
          </div>
        )}
        {loading ? (
          <div className="px-6 py-6">
            <LoadingSkeleton />
          </div>
        ) : error ? (
          <div className="px-6 py-6">
            <ErrorState message={error} onRetry={refetch} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="px-6 py-4">
            <OSTListView opportunities={opportunities} {...sharedViewProps} />
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-6">
            <OSTTreeViewCanvas
              projectName={project.name}
              outcome={bizContext.northStar.value}
              opportunities={opportunities}
              hypothesesSummary={hypothesesSummary}
              experimentsSummary={experimentsSummary}
              selectedId={selectedId}
              onSelect={handleSelect}
              onNavigateToDetail={handleNavigateToDetail}
              onRenameOpportunity={renameOpportunity}
              onAddOpportunity={() => setIsModalOpen(true)}
              onAddHypothesis={handleQuickAddHypothesis}
              onAddExperiment={handleQuickAddExperiment}
              onRenameHypothesis={handleRenameHypothesis}
              onRenameExperiment={handleRenameExperiment}
              onEditOutcome={handleEditOutcome}
              starredIds={starredIds}
              onToggleStar={toggleStar}
              onDeleteOpportunity={archiveOpportunity}
              onDeleteHypothesis={handleDeleteHypothesis}
              onDeleteExperiment={handleDeleteExperiment}
              onOpenExperiment={handleOpenExperiment}
              members={treeMembers}
              assignedMap={assignedMap}
              onAssign={handleAssign}
            />
          </div>
        )}
      </div>

      {/* ── Side panel ─────────────────────────────────────────────────────── */}
      <OpportunityPanel
        opportunity={selectedOpportunity}
        recentEvidence={selectedId ? (recentEvidence[selectedId] ?? []) : []}
        hypothesesSummary={selectedId ? (hypothesesSummary[selectedId] ?? []) : []}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        onNavigateToDetail={handleNavigateToDetail}
        onArchive={archiveOpportunity}
        onRestore={restoreOpportunity}
      />

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      <CreateOpportunityModal
        isOpen={isModalOpen}
        parentName={null}
        businessContext={businessContextSummary}
        onConfirm={handleConfirmCreate}
        onConfirmMultiple={handleConfirmMultiple}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Experiment Seed Modal */}
      {openExpId && openExpData && (
        <ExperimentSeedModal
          experiment={openExpData}
          onClose={() => { setOpenExpId(null); setOpenExpData(null) }}
          onRefresh={refetch}
        />
      )}

      {/* Agent Guide — floating chat for incomplete projects */}
      <AgentGuide
        projectId={project.id}
        projectName={project.name}
        hasOutcome={!!bizContext.northStar.value}
        opportunityCount={activeCount}
        hypothesisCount={totalHypotheses}
        experimentCount={totalExperiments}
      />
    </div>
  )
}
