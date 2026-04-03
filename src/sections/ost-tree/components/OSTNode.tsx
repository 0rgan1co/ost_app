import type { Opportunity } from '../../../types'

interface OSTNodeProps {
  opportunity: Opportunity
  isSelected: boolean
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  viewMode?: 'list' | 'tree'
}

export function OSTNode({
  opportunity,
  isSelected,
  onSelect,
  onArchive,
  onRestore,
  viewMode = 'list',
}: OSTNodeProps) {
  const isArchived = opportunity.isArchived

  const statusBadge = isArchived ? (
    <span className="font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
      Descartada
    </span>
  ) : (
    <span className="font-[IBM_Plex_Mono] text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
      Activa
    </span>
  )

  const counters = (
    <div className="flex items-center gap-2 font-[IBM_Plex_Mono] text-[11px] text-slate-500">
      {opportunity.evidenceCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-slate-600">ev</span>
          <span className="text-slate-400">{opportunity.evidenceCount}</span>
        </span>
      )}
      {opportunity.hypothesisCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-slate-600">hip</span>
          <span className={opportunity.activeHypothesisCount > 0 ? 'text-red-400' : 'text-slate-400'}>
            {opportunity.activeHypothesisCount}/{opportunity.hypothesisCount}
          </span>
        </span>
      )}
    </div>
  )

  const actionButtons = (
    <div
      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      onClick={e => e.stopPropagation()}
    >
      {isArchived ? (
        <button
          onClick={() => onRestore(opportunity.id)}
          title="Restaurar oportunidad"
          className="p-1 rounded text-slate-500 hover:text-green-400 hover:bg-slate-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => onArchive(opportunity.id)}
          title="Archivar oportunidad"
          className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
      )}
    </div>
  )

  if (viewMode === 'tree') {
    return (
      <div
        className={`
          group relative cursor-pointer select-none
          rounded-xl border transition-all duration-200
          px-4 py-3 w-56
          ${isArchived
            ? 'bg-slate-900/50 border-slate-800/50 opacity-60'
            : isSelected
              ? 'bg-slate-900 border-red-500/60 shadow-lg shadow-red-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md hover:shadow-black/20'
          }
        `}
        onClick={() => onSelect(opportunity.id)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-slate-100 text-sm font-medium font-[Nunito_Sans] leading-snug line-clamp-2 flex-1">
            {opportunity.title}
          </span>
          {actionButtons}
        </div>

        {opportunity.description && (
          <p className="text-slate-500 text-xs font-[Nunito_Sans] line-clamp-2 mb-2 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {statusBadge}
          {counters}
        </div>
      </div>
    )
  }

  // List mode
  return (
    <div
      className={`
        group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer
        transition-all duration-150
        ${isArchived ? 'opacity-50' : ''}
        ${isSelected
          ? 'bg-slate-800/80 border border-slate-700'
          : 'border border-transparent hover:bg-slate-900 hover:border-slate-800'
        }
      `}
      onClick={() => onSelect(opportunity.id)}
    >
      {/* Bullet */}
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-[Nunito_Sans] text-sm font-semibold ${isArchived ? 'text-slate-500' : 'text-slate-100'}`}>
            {opportunity.title}
          </span>
          {statusBadge}
          {counters}
        </div>
        {opportunity.description && (
          <p className="text-slate-500 text-xs font-[Nunito_Sans] mt-0.5 truncate leading-relaxed">
            {opportunity.description}
          </p>
        )}
      </div>

      {actionButtons}
    </div>
  )
}
