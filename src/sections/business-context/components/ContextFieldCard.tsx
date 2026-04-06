import { useState, useRef, useEffect, useCallback } from 'react'
import type { ContextField } from '../../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'ahora mismo'
  if (minutes < 60) return `hace ${minutes} min`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days}d`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContextFieldCardProps {
  label: string
  description: string
  placeholder: string
  field: ContextField
  isSaving?: boolean
  onSave: (value: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContextFieldCard({
  label,
  description,
  placeholder,
  field,
  isSaving = false,
  onSave,
}: ContextFieldCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(field.value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft if external value changes (e.g. after optimistic update)
  useEffect(() => {
    if (!isEditing) {
      setDraft(field.value)
    }
  }, [field.value, isEditing])

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Place cursor at end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    setDraft(field.value)
    setIsEditing(true)
  }, [field.value])

  const handleSave = useCallback(() => {
    onSave(draft)
    setIsEditing(false)
  }, [draft, onSave])

  const handleCancel = useCallback(() => {
    setDraft(field.value)
    setIsEditing(false)
  }, [field.value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd+Enter or Ctrl+Enter to save
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSave()
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const isEmpty = field.value.trim().length === 0
  const hasChanged = draft !== field.value

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-slate-900 transition-colors duration-150 ${
        isEditing ? 'border-red-500/50' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100" style={{ fontFamily: 'Nunito Sans, sans-serif' }}>
            {label}
          </p>
          <p className="mt-0.5 text-xs text-slate-500" style={{ fontFamily: 'Nunito Sans, sans-serif' }}>
            {description}
          </p>
        </div>

        {/* Timestamp */}
        {field.updatedAt && !isEditing && (
          <span
            className="shrink-0 text-xs text-slate-400 mt-0.5"
            style={{ fontFamily: 'IBM Plex Mono, monospace' }}
          >
            {formatRelativeTime(field.updatedAt)}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 mt-3">
        {isEditing ? (
          <>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder={placeholder}
              className="w-full resize-none rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-colors duration-150"
              style={{ fontFamily: 'Nunito Sans, sans-serif' }}
            />
            <p className="mt-1.5 text-xs text-slate-400" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              Cmd+Enter para guardar · Esc para cancelar
            </p>

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                {isSaving ? (
                  <>
                    <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando…
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                Cancelar
              </button>
              {!hasChanged && (
                <span className="ml-1 text-xs text-slate-400" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Sin cambios
                </span>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={handleStartEdit}
            className="w-full text-left group"
            aria-label={`Editar campo ${label}`}
          >
            {isEmpty ? (
              <span
                className="block rounded-lg border border-dashed border-slate-300 dark:border-slate-800 px-3.5 py-3 text-sm text-slate-400 transition-colors group-hover:border-slate-400 dark:group-hover:border-slate-700 group-hover:text-slate-500"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                {placeholder}
              </span>
            ) : (
              <span
                className="block rounded-lg border border-transparent px-3.5 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 transition-colors group-hover:border-slate-200 dark:group-hover:border-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                {field.value}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
