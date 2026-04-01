import type { OSTTreeNode } from '../../../hooks/use-ost-tree'
import { OSTNode } from './OSTNode'

interface OSTListViewProps {
  nodes: OSTTreeNode[]
  expandedIds: Set<string>
  selectedId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onCreateChild: (parentId: string) => void
}

function renderNode(
  node: OSTTreeNode,
  props: Omit<OSTListViewProps, 'nodes'>,
  depth: number,
): React.ReactNode {
  const isExpanded = props.expandedIds.has(node.id)
  const hasChildren = node.children.length > 0

  return (
    <div key={node.id}>
      <OSTNode
        opportunity={node}
        isExpanded={isExpanded}
        isSelected={props.selectedId === node.id}
        hasChildren={hasChildren}
        onToggleExpand={props.onToggleExpand}
        onSelect={props.onSelect}
        onArchive={props.onArchive}
        onRestore={props.onRestore}
        onCreateChild={props.onCreateChild}
        depth={depth}
        viewMode="list"
      />
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical guide line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-800"
            style={{ left: `${12 + depth * 24 + 14}px` }}
          />
          {node.children.map(child => renderNode(child, props, depth + 1))}
        </div>
      )}
    </div>
  )
}

export function OSTListView({
  nodes,
  expandedIds,
  selectedId,
  onToggleExpand,
  onSelect,
  onArchive,
  onRestore,
  onCreateChild,
}: OSTListViewProps) {
  if (nodes.length === 0) {
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

  const sharedProps = { expandedIds, selectedId, onToggleExpand, onSelect, onArchive, onRestore, onCreateChild }

  return (
    <div className="space-y-0.5">
      {nodes.map(node => renderNode(node, sharedProps, 0))}
    </div>
  )
}
