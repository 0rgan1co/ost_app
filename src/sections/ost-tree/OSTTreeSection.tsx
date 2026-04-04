import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOSTTree } from '../../hooks/use-ost-tree'
import { OSTListView } from './components/OSTListView'
import { OSTTreeViewCanvas } from './components/OSTTreeView'
import { OpportunityPanel } from './components/OpportunityPanel'
import { CreateOpportunityModal } from './components/CreateOpportunityModal'
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
      <p className="text-slate-300 font-[Nunito_Sans] text-sm font-semibold mb-1">Error al cargar el árbol</p>
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
    nodes,
    flatOpportunities,
    recentEvidence,
    hypothesesSummary,
    loading,
    error,
    expandedIds,
    toggleExpand,
    createOpportunity,
    archiveOpportunity,
    restoreOpportunity,
    refetch,
  } = useOSTTree(project.id)

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Create modal state: stores the parentId to pre-fill ("" = root)
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined)
  const isModalOpen = createParentId !== undefined

  // ── Derived data ────────────────────────────────────────────────────────────
  const selectedOpportunity = selectedId
    ? (flatOpportunities.find(o => o.id === selectedId) ?? null)
    : null

  const parentOpportunity = isModalOpen && createParentId
    ? flatOpportunities.find(o => o.id === createParentId)
    : null

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setIsPanelOpen(true)
  }, [])

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false)
    // Keep selectedId so it stays highlighted; clear after animation
    setTimeout(() => setSelectedId(null), 300)
  }, [])

  const handleOpenCreateRoot = useCallback(() => {
    setCreateParentId(null)
  }, [])

  const handleOpenCreateChild = useCallback((parentId: string) => {
    setCreateParentId(parentId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setCreateParentId(undefined)
  }, [])

  const handleConfirmCreate = useCallback(async (data: { name: string; description: string }) => {
    await createOpportunity({
      name: data.name,
      description: data.description || undefined,
      parentId: createParentId ?? null,
    })
    setCreateParentId(undefined)
  }, [createOpportunity, createParentId])

  const handleNavigateToDetail = useCallback((id: string) => {
    navigate(`/projects/${project.id}/opportunity/${id}`)
  }, [navigate, project.id])

  // ── Shared event props (passed to both views) ───────────────────────────────
  const sharedViewProps = {
    expandedIds,
    selectedId,
    onToggleExpand: toggleExpand,
    onSelect: handleSelect,
    onArchive: archiveOpportunity,
    onRestore: restoreOpportunity,
    onCreateChild: handleOpenCreateChild,
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-[Nunito_Sans] font-bold text-slate-100 text-lg truncate">
            {project.name}
          </h1>
          {!loading && (
            <span className="font-[IBM_Plex_Mono] text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex-shrink-0">
              {flatOpportunities.filter(o => !o.isArchived).length} activas
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <button
            onClick={handleOpenCreateRoot}
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
            <OSTListView nodes={nodes} {...sharedViewProps} />
          </div>
        ) : (
          <div className="w-full h-full overflow-auto p-6">
            <OSTTreeViewCanvas nodes={nodes} {...sharedViewProps} />
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
        onCreateChild={handleOpenCreateChild}
      />

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      <CreateOpportunityModal
        isOpen={isModalOpen}
        parentName={parentOpportunity?.title ?? null}
        onConfirm={handleConfirmCreate}
        onClose={handleCloseModal}
      />
    </div>
  )
}
