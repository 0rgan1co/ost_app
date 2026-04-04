/**
 * Color system for OST hierarchy levels.
 * Each level has a consistent color used across tree, detail, kanban, and modals.
 */

export const OST_COLORS = {
  outcome: {
    text: 'text-red-400',
    textBright: 'text-red-300',
    bg: 'bg-red-500/10',
    bgSolid: 'bg-red-600',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
    label: 'Outcome',
    hex: '#ef4444',
  },
  opportunity: {
    text: 'text-orange-400',
    textBright: 'text-orange-300',
    bg: 'bg-orange-500/10',
    bgSolid: 'bg-orange-600',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    label: 'Oportunidad',
    hex: '#f97316',
  },
  evidence: {
    text: 'text-cyan-400',
    textBright: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    bgSolid: 'bg-cyan-600',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-500',
    label: 'Evidencia',
    hex: '#06b6d4',
  },
  hypothesis: {
    text: 'text-indigo-400',
    textBright: 'text-indigo-300',
    bg: 'bg-indigo-500/10',
    bgSolid: 'bg-indigo-600',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-500',
    label: 'Hipótesis',
    hex: '#6366f1',
  },
  experiment: {
    text: 'text-amber-400',
    textBright: 'text-amber-300',
    bg: 'bg-amber-500/10',
    bgSolid: 'bg-amber-600',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Experimento',
    hex: '#f59e0b',
  },
  evaluation: {
    text: 'text-violet-400',
    textBright: 'text-violet-300',
    bg: 'bg-violet-500/10',
    bgSolid: 'bg-violet-600',
    border: 'border-violet-500/20',
    dot: 'bg-violet-500',
    label: 'Evaluación IA',
    hex: '#8b5cf6',
  },
} as const
