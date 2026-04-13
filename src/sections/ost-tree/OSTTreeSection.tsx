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
import { Target } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { Project } from '../../types'

// ─── Outcome Editor ──────────────────────────────────────────────────────────

function OutcomeEditor({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-2xl p-6 text-center hover:bg-red-500/15 hover:border-red-500/50 transition-all group"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <Target size={20} className="text-red-400" />
          </div>
          <p className="text-sm font-bold text-red-400 font-[Nunito_Sans]">
            Define el Outcome esperado
          </p>
          <p className="text-xs text-slate-500 font-[Nunito_Sans] max-w-md">
            El outcome es el resultado de negocio que quieres impactar. No es un feature ni un output.
            Ejemplo: "Reducir churn en un 5%" o "Aumentar activacion de nuevos usuarios a 60%"
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-red-400" />
        <p className="text-xs font-bold text-red-400 font-['IBM_Plex_Mono'] uppercase tracking-wider">
          Outcome
        </p>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ej: Reducir churn en un 5% en los proximos 6 meses"
        rows={2}
        className="w-full bg-slate-900 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 font-[Nunito_Sans] focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsEditing(false)}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 font-[Nunito_Sans] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => { if (text.trim()) { onSave(text.trim()); setIsEditing(false) } }}
          disabled={!text.trim()}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl font-[Nunito_Sans] transition-colors"
        >
          Guardar Outcome
        </button>
      </div>
    </div>
  )
}

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
    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl p-1">
      <button
        onClick={() => onChange('list')}
        title="Vista lista"
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          font-[Nunito_Sans] text-xs font-semibold transition-all duration-150
          ${mode === 'list'
            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
        <div key={i} className="h-12 rounded-xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800" style={{ opacity: 1 - i * 0.15 }} />
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
      <p className="text-slate-700 dark:text-slate-300 font-[Nunito_Sans] text-sm font-semibold mb-1">Error al cargar oportunidades</p>
      <p className="text-slate-500 font-[Nunito_Sans] text-xs mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-[Nunito_Sans] text-sm transition-colors"
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
    solutionsSummary,
    experimentsSummary,
    loading,
    error,
    createOpportunity,
    renameOpportunity,
    archiveOpportunity,
    restoreOpportunity,
    refetch,
  } = useOSTTree(project.id)

  const { context: bizContext } = useBusinessContext(project.id)

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
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)
  const [openExpId, setOpenExpId] = useState<string | null>(null)
  const [openExpData, setOpenExpData] = useState<any>(null)
  const [assignedMap, setAssignedMap] = useState<Record<string, string | null>>({})

  // Load assigned_to for all items
  useEffect(() => {
    async function loadAssigned() {
      const solIds = Object.values(solutionsSummary).flat().map(s => s.id)
      const [{ data: opps }, { data: sols }, { data: exps }] = await Promise.all([
        supabase.from('opportunities').select('id, assigned_to').eq('project_id', project.id),
        supabase.from('solutions').select('id, assigned_to').in('opportunity_id', opportunities.map(o => o.id)),
        solIds.length > 0
          ? supabase.from('assumptions').select('id').in('solution_id', solIds).then(async ({ data: assumptions }) => {
              const assIds = (assumptions ?? []).map((a: any) => a.id)
              if (assIds.length > 0) {
                return supabase.from('experiments').select('id, assigned_to').in('assumption_id', assIds)
              }
              return { data: [] as any[], error: null }
            })
          : Promise.resolve({ data: [] as any[], error: null }),
      ])
      const map: Record<string, string | null> = {}
      for (const o of (opps ?? []) as any[]) if (o.assigned_to) map[o.id] = o.assigned_to
      for (const s of (sols ?? []) as any[]) if (s.assigned_to) map[s.id] = s.assigned_to
      for (const e of (exps ?? []) as any[]) if (e.assigned_to) map[e.id] = e.assigned_to
      setAssignedMap(map)
    }
    if (opportunities.length > 0) loadAssigned()
  }, [project.id, opportunities, solutionsSummary])

  const handleAssign = useCallback(async (type: 'opportunity' | 'solution' | 'experiment', id: string, userId: string | null) => {
    const table = type === 'opportunity' ? 'opportunities' : type === 'solution' ? 'solutions' : 'experiments'
    await supabase.from(table).update({ assigned_to: userId }).eq('id', id)
    setAssignedMap(prev => ({ ...prev, [id]: userId }))
  }, [])

  const treeMembers = project.members.map(m => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))

  const handleOpenExperiment = useCallback(async (expId: string) => {
    const { data: exp } = await supabase.from('experiments').select('*').eq('id', expId).single()
    if (!exp) return
    // Navigate: experiment -> assumption -> solution -> opportunity
    const { data: assumption } = await supabase.from('assumptions').select('id, description, solution_id').eq('id', exp.assumption_id).single()
    let oppName = ''
    let solutionName = ''
    if (assumption) {
      const { data: sol } = await supabase.from('solutions').select('id, name, opportunity_id').eq('id', assumption.solution_id).single()
      if (sol) {
        solutionName = sol.name
        oppName = opportunities.find(o => o.id === sol.opportunity_id)?.title ?? ''
      }
    }
    setOpenExpData({
      id: exp.id, description: exp.description, type: exp.type,
      successCriterion: exp.success_criterion, effort: exp.effort, impact: exp.impact,
      status: exp.status, result: exp.result,
      objective: exp.objective ?? '', who: exp.who ?? '', actions: exp.actions ?? '',
      startDate: exp.start_date, endDate: exp.end_date, reviewCycle: exp.review_cycle ?? '',
      projectName: project.name, opportunityName: oppName,
      assumptionDescription: assumption?.description ?? '',
      solutionName,
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
    navigate(`/projects/${project.id}/opportunity/${id}`)
  }, [navigate, project.id])

  const handleArchiveRequest = useCallback((id: string) => {
    setArchiveTarget(id)
  }, [])

  const handleConfirmArchive = useCallback(() => {
    if (archiveTarget) {
      archiveOpportunity(archiveTarget)
      setArchiveTarget(null)
    }
  }, [archiveTarget, archiveOpportunity])

  const handleCancelArchive = useCallback(() => {
    setArchiveTarget(null)
  }, [])

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
  }, [project.id])

  // Rename solution
  const handleRenameSolution = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return
    await supabase.from('solutions').update({ name: text.trim() }).eq('id', id)
    refetch()
  }, [refetch])

  // Rename experiment
  const handleRenameExperiment = useCallback(async (id: string, text: string) => {
    if (!text.trim()) return
    await supabase.from('experiments').update({ description: text.trim() }).eq('id', id)
    refetch()
  }, [refetch])

  // Delete solution (cascade: delete experiments -> assumptions -> solution)
  const handleDeleteSolution = useCallback(async (id: string) => {
    // Get all assumptions for this solution
    const { data: assumptions } = await supabase.from('assumptions').select('id').eq('solution_id', id)
    const assIds = (assumptions ?? []).map((a: any) => a.id)
    // Delete experiments linked to those assumptions
    if (assIds.length > 0) {
      await supabase.from('experiments').delete().in('assumption_id', assIds)
    }
    // Delete assumptions
    await supabase.from('assumptions').delete().eq('solution_id', id)
    // Delete solution
    await supabase.from('solutions').delete().eq('id', id)
    refetch()
  }, [refetch])

  // Delete experiment
  const handleDeleteExperiment = useCallback(async (id: string) => {
    await supabase.from('experiments').delete().eq('id', id)
    refetch()
  }, [refetch])

  // Quick-add solution from tree
  const handleQuickAddSolution = useCallback(async (opportunityId: string) => {
    const name = prompt('Escribí la solución: "Si hacemos [acción], vamos a obtener [resultado]"')
    if (!name?.trim()) return
    await supabase.from('solutions').insert({
      opportunity_id: opportunityId,
      name: name.trim(),
      description: '',
    })
    refetch()
  }, [refetch])

  // Quick-add experiment from tree (assumes the id passed is an assumption_id)
  const handleQuickAddExperiment = useCallback(async (solutionId: string) => {
    const name = prompt('Descripción del experimento:')
    if (!name?.trim()) return
    const { error } = await supabase.from('experiments').insert({
      solution_id: solutionId,
      assumption_id: null,
      type: 'otro',
      description: name.trim(),
      success_criterion: 'Por definir',
      effort: 'medio',
      impact: 'medio',
      status: 'to do',
    })
    if (error) console.error('[quickAddExperiment]', error)
    refetch()
  }, [refetch])

  // ── Shared view props ───────────────────────────────────────────────────────
  const sharedViewProps = {
    selectedId,
    onSelect: handleSelect,
    onArchive: handleArchiveRequest,
    onRestore: restoreOpportunity,
  }

  const activeOpps = opportunities.filter(o => !o.isArchived)
  const activeCount = activeOpps.length
  const totalSolutions = Object.values(solutionsSummary).reduce((sum, arr) => sum + arr.length, 0)
  const totalExperiments = Object.values(experimentsSummary).reduce((sum, arr) => sum + arr.length, 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-950 relative">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-[Nunito_Sans] font-bold text-slate-900 dark:text-slate-100 text-lg truncate">
            {project.name}
          </h1>
          {!loading && (
            <span className="font-[IBM_Plex_Mono] text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 flex-shrink-0">
              {activeCount} {activeCount === 1 ? 'oportunidad' : 'oportunidades'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={() => navigate(`/projects/${project.id}/ai-evaluation`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-[Nunito_Sans] font-semibold text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75L18 14z"/></svg>
            Evaluar con IA
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
              solutionCount={totalSolutions}
              experimentCount={totalExperiments}
              onGoToContext={() => navigate('/business-context')}
              onCreateOpportunity={() => setIsModalOpen(true)}
              onGoToDetail={() => {
                if (activeOpps[0]) navigate(`/opportunity/${activeOpps[0].id}`)
              }}
            />
          </div>
        )}

        {/* Outcome editor — shows prominently when no outcome is defined */}
        {!loading && !error && !bizContext.northStar.value && (
          <div className="px-6 pt-2 pb-4">
            <OutcomeEditor onSave={handleEditOutcome} />
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
              solutionsSummary={solutionsSummary}
              experimentsSummary={experimentsSummary}
              selectedId={selectedId}
              onSelect={handleSelect}
              onNavigateToDetail={handleNavigateToDetail}
              onRenameOpportunity={renameOpportunity}
              onAddOpportunity={() => setIsModalOpen(true)}
              onAddSolution={handleQuickAddSolution}
              onAddExperiment={handleQuickAddExperiment}
              onRenameSolution={handleRenameSolution}
              onRenameExperiment={handleRenameExperiment}
              onEditOutcome={handleEditOutcome}
              starredIds={starredIds}
              onToggleStar={toggleStar}
              onDeleteOpportunity={archiveOpportunity}
              onDeleteSolution={handleDeleteSolution}
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
        solutionsSummary={selectedId ? (solutionsSummary[selectedId] ?? []) : []}
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
        solutionCount={totalSolutions}
        experimentCount={totalExperiments}
      />

      {/* ── Archive confirmation ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archivar oportunidad"
        message="La oportunidad será archivada. Podrás restaurarla después."
        variant="warning"
        confirmLabel="Archivar"
        onConfirm={handleConfirmArchive}
        onCancel={handleCancelArchive}
      />
    </div>
  )
}
