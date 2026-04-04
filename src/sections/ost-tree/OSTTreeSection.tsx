import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOSTTree } from '../../hooks/use-ost-tree'
import { useBusinessContext } from '../../hooks/use-business-context'
import { OSTListView } from './components/OSTListView'
import { OSTTreeViewCanvas } from './components/OSTTreeView'
import { OpportunityPanel } from './components/OpportunityPanel'
import { CreateOpportunityModal } from './components/CreateOpportunityModal'
import { WorkflowGuide } from './components/WorkflowGuide'
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
            onClick={() => setIsModalOpen(true)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-red-600 hover:bg-red-500 text-white
              font-[Nunito_Sans] font-semibold text-sm
              transition-colors shadow-sm shadow-red-900/30
            "
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva oportunidad
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
    </div>
  )
}
