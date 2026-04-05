import { useState, useEffect, useRef, useCallback } from 'react'
import { X, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import type { SuggestionAction } from '../../../lib/parse-suggestion'

// ─── Type label mapping ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  add_hypothesis: 'Hipotesis',
  add_evidence: 'Evidencia',
  update_description: 'Descripcion',
  suggest_experiment: 'Experimento',
  manual: 'Manual',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface SuggestionConfirmDialogProps {
  isOpen: boolean
  actions: SuggestionAction[]
  onConfirm: (selectedActions: SuggestionAction[]) => void
  onCancel: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SuggestionConfirmDialog({
  isOpen,
  actions,
  onConfirm,
  onCancel,
}: SuggestionConfirmDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const dialogRef = useRef<HTMLDivElement>(null)

  // All-manual check
  const isAllManual = actions.every((a) => a.type === 'manual')

  // Initialize all as selected when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(actions.map((_, i) => i)))
    }
  }, [isOpen, actions])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel()
      }
    },
    [onCancel]
  )

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === actions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(actions.map((_, i) => i)))
    }
  }

  const handleConfirm = () => {
    const selectedActions = actions.filter((_, i) => selected.has(i))
    onConfirm(selectedActions)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar sugerencias"
        className="w-full max-w-lg mx-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-100 font-[Nunito_Sans]">
            {isAllManual ? 'Sugerencia del asistente' : 'Aplicar sugerencias al OST'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {isAllManual ? (
            // ── Manual-only view ──────────────────────────────────────────
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-300 font-[Nunito_Sans]">
                  Esta sugerencia requiere accion manual
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-[Nunito_Sans]">
                  {actions[0]?.description ?? ''}
                </p>
              </div>
            </div>
          ) : (
            // ── Actionable suggestions with checkboxes ────────────────────
            <div className="space-y-3">
              <p className="text-sm text-slate-400 font-[Nunito_Sans]">
                Selecciona las acciones que deseas aplicar:
              </p>

              {/* Select all toggle */}
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors font-[Nunito_Sans]"
                >
                  {selected.size === actions.length ? (
                    <CheckSquare size={14} className="text-red-400" />
                  ) : (
                    <Square size={14} />
                  )}
                  {selected.size === actions.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              )}

              {/* Action list */}
              <ul className="space-y-2">
                {actions.map((action, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => toggleSelection(index)}
                      className={`w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                        selected.has(index)
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="mt-0.5 shrink-0">
                        {selected.has(index) ? (
                          <CheckSquare size={16} className="text-red-400" />
                        ) : (
                          <Square size={16} className="text-slate-600" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="inline-block rounded-md bg-slate-700 px-1.5 py-0.5 font-[IBM_Plex_Mono] text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          {TYPE_LABELS[action.type] ?? action.type}
                        </span>
                        <p className="text-sm text-slate-200 leading-relaxed font-[Nunito_Sans]">
                          {action.description}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors font-[Nunito_Sans]"
          >
            Cancelar
          </button>
          {!isAllManual && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-[Nunito_Sans]"
            >
              Aplicar seleccionados ({selected.size})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
