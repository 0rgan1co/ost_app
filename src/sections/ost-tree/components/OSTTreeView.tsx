import type { Opportunity } from '../../../types'
import { OSTNode } from './OSTNode'

interface OSTTreeViewProps {
  opportunities: Opportunity[]
  selectedId: string | null
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
}


export function OSTTreeViewCanvas({
  opportunities,
  selectedId,
  onSelect,
  onArchive,
  onRestore,
}: OSTTreeViewProps) {
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

  // Simple grid layout — all opportunities at the same level
  return (
    <div className="overflow-auto w-full">
      <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 lg:gap-8 justify-center p-3 sm:p-4">
        {opportunities.map(opp => (
          <div key={opp.id} className="w-40 sm:w-48 lg:w-56">
            <OSTNode
              opportunity={opp}
              isSelected={selectedId === opp.id}
              onSelect={onSelect}
              onArchive={onArchive}
              onRestore={onRestore}
              viewMode="tree"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
