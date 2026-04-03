import type { Opportunity } from '../../../types'
import { OSTNode } from './OSTNode'

interface OSTListViewProps {
  opportunities: Opportunity[]
  selectedId: string | null
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
}

export function OSTListView({
  opportunities,
  selectedId,
  onSelect,
  onArchive,
  onRestore,
}: OSTListViewProps) {
  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <p className="text-slate-400 font-[Nunito_Sans] text-sm">No hay oportunidades aún</p>
        <p className="text-slate-600 font-[Nunito_Sans] text-xs mt-1">Crea la primera usando el botón superior</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {opportunities.map(opp => (
        <OSTNode
          key={opp.id}
          opportunity={opp}
          isSelected={selectedId === opp.id}
          onSelect={onSelect}
          onArchive={onArchive}
          onRestore={onRestore}
          viewMode="list"
        />
      ))}
    </div>
  )
}
