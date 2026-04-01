import type { OSTTreeNode } from '../../../hooks/use-ost-tree'
import { OSTNode } from './OSTNode'

interface OSTTreeViewProps {
  nodes: OSTTreeNode[]
  expandedIds: Set<string>
  selectedId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onCreateChild: (parentId: string) => void
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W = 224   // w-56
const NODE_H = 100   // approximate height
const H_GAP = 40     // horizontal gap between siblings
const V_GAP = 72     // vertical gap between levels

// ─── Position map ─────────────────────────────────────────────────────────────

interface NodePosition {
  x: number
  y: number
  node: OSTTreeNode
}

function computePositions(
  nodes: OSTTreeNode[],
  expandedIds: Set<string>,
): { positions: Map<string, NodePosition>; totalWidth: number; totalHeight: number } {
  const positions = new Map<string, NodePosition>()
  let maxX = 0
  let maxY = 0

  function subtreeWidth(node: OSTTreeNode): number {
    const isExpanded = expandedIds.has(node.id)
    if (!isExpanded || node.children.length === 0) return NODE_W
    const childrenWidth = node.children.reduce((acc, child, i) => {
      return acc + subtreeWidth(child) + (i > 0 ? H_GAP : 0)
    }, 0)
    return Math.max(NODE_W, childrenWidth)
  }

  function place(node: OSTTreeNode, x: number, y: number) {
    const cx = x + subtreeWidth(node) / 2 - NODE_W / 2
    positions.set(node.id, { x: cx, y, node })
    maxX = Math.max(maxX, cx + NODE_W)
    maxY = Math.max(maxY, y + NODE_H)

    const isExpanded = expandedIds.has(node.id)
    if (isExpanded && node.children.length > 0) {
      let childX = x
      node.children.forEach((child, i) => {
        place(child, childX, y + NODE_H + V_GAP)
        childX += subtreeWidth(child) + (i < node.children.length - 1 ? H_GAP : 0)
      })
    }
  }

  let offsetX = 0
  nodes.forEach((root, i) => {
    place(root, offsetX, 0)
    offsetX += subtreeWidth(root) + (i < nodes.length - 1 ? H_GAP * 2 : 0)
  })

  return {
    positions,
    totalWidth: maxX + 24,
    totalHeight: maxY + 24,
  }
}

// ─── SVG connector lines ──────────────────────────────────────────────────────

interface SVGConnectorsProps {
  positions: Map<string, NodePosition>
  nodes: OSTTreeNode[]
  expandedIds: Set<string>
}

function renderConnectors(
  positions: Map<string, NodePosition>,
  node: OSTTreeNode,
  expandedIds: Set<string>,
  paths: string[],
) {
  const parentPos = positions.get(node.id)
  if (!parentPos) return

  const isExpanded = expandedIds.has(node.id)
  if (!isExpanded) return

  node.children.forEach(child => {
    const childPos = positions.get(child.id)
    if (!childPos) return

    const x1 = parentPos.x + NODE_W / 2
    const y1 = parentPos.y + NODE_H
    const x2 = childPos.x + NODE_W / 2
    const y2 = childPos.y

    const midY = (y1 + y2) / 2

    paths.push(`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`)

    renderConnectors(positions, child, expandedIds, paths)
  })
}

function SVGConnectors({ positions, nodes, expandedIds }: SVGConnectorsProps) {
  const paths: string[] = []
  nodes.forEach(node => renderConnectors(positions, node, expandedIds, paths))

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
      overflow="visible"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgb(51 65 85)"  /* slate-700 */
          strokeWidth="1.5"
          strokeDasharray="none"
        />
      ))}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OSTTreeViewCanvas({
  nodes,
  expandedIds,
  selectedId,
  onToggleExpand,
  onSelect,
  onArchive,
  onRestore,
  onCreateChild,
}: OSTTreeViewProps) {
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

  const { positions, totalWidth, totalHeight } = computePositions(nodes, expandedIds)

  return (
    <div className="overflow-auto w-full">
      <div
        className="relative"
        style={{ width: `${Math.max(totalWidth, 600)}px`, height: `${Math.max(totalHeight, 300)}px` }}
      >
        <SVGConnectors positions={positions} nodes={nodes} expandedIds={expandedIds} />

        {Array.from(positions.values()).map(({ x, y, node }) => (
          <div
            key={node.id}
            className="absolute"
            style={{ left: `${x}px`, top: `${y}px`, width: `${NODE_W}px` }}
          >
            <OSTNode
              opportunity={node}
              isExpanded={expandedIds.has(node.id)}
              isSelected={selectedId === node.id}
              hasChildren={node.children.length > 0}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onArchive={onArchive}
              onRestore={onRestore}
              onCreateChild={onCreateChild}
              viewMode="tree"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
