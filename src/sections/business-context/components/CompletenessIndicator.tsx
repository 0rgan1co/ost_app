import type { BusinessContext } from '../../../types'

interface CompletenessIndicatorProps {
  context: BusinessContext
}

function countCompleted(context: BusinessContext): number {
  return [context.strategicChallenge, context.northStar, context.targetSegment, context.keyConstraints].filter(
    f => f.value.trim().length > 0
  ).length
}

export function CompletenessIndicator({ context }: CompletenessIndicatorProps) {
  const completed = countCompleted(context)
  const total = 4

  // Color scheme: red 0/3 · amber 1-2/3 · green 3/3
  const colorClass =
    completed === 0
      ? 'text-red-400 bg-red-500/10 border-red-500/30'
      : completed < total
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-green-400 bg-green-500/10 border-green-500/30'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colorClass}`}
      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
    >
      <span
        className={`size-1.5 rounded-full ${
          completed === 0
            ? 'bg-red-400'
            : completed < total
              ? 'bg-amber-400'
              : 'bg-green-400'
        }`}
      />
      {completed}/{total} campos completos
    </span>
  )
}
