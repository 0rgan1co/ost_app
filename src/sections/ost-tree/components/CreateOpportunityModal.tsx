import { useState } from 'react'

interface CreateOpportunityModalProps {
  isOpen: boolean
  parentName?: string | null
  onConfirm: (data: { name: string; description: string }) => void
  onClose: () => void
}

export function CreateOpportunityModal({
  isOpen,
  parentName,
  onConfirm,
  onClose,
}: CreateOpportunityModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    if (submitting) return
    setName('')
    setDescription('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onConfirm({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-6 border-b border-slate-800">
            <div>
              <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base">
                Nueva oportunidad
              </h2>
              {parentName && (
                <p className="font-[Nunito_Sans] text-slate-500 text-xs mt-0.5">
                  Sub-oportunidad de:{' '}
                  <span className="text-slate-400 font-medium">{parentName}</span>
                </p>
              )}
              {!parentName && (
                <p className="font-[Nunito_Sans] text-slate-500 text-xs mt-0.5">
                  Oportunidad raíz del árbol
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="¿Cuál es la oportunidad?"
                autoFocus
                required
                className="
                  w-full bg-slate-900 border border-slate-800 rounded-xl
                  px-4 py-3 text-slate-100 font-[Nunito_Sans] text-sm
                  placeholder:text-slate-600
                  focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20
                  transition-colors
                "
              />
            </div>

            <div>
              <label className="block font-[Nunito_Sans] font-semibold text-slate-300 text-xs uppercase tracking-widest mb-2">
                Descripción
                <span className="text-slate-600 ml-1 normal-case tracking-normal font-normal">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Contexto adicional sobre esta oportunidad..."
                rows={3}
                className="
                  w-full bg-slate-900 border border-slate-800 rounded-xl
                  px-4 py-3 text-slate-100 font-[Nunito_Sans] text-sm
                  placeholder:text-slate-600 resize-none
                  focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20
                  transition-colors
                "
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="
                  flex-1 py-2.5 rounded-xl border border-slate-700
                  text-slate-400 hover:text-slate-200 hover:border-slate-600
                  font-[Nunito_Sans] font-semibold text-sm transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="
                  flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500
                  text-white font-[Nunito_Sans] font-semibold text-sm
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Creando...
                  </>
                ) : (
                  'Crear oportunidad'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
