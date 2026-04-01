import { useState } from 'react'
import { Quote, BarChart2, Eye, Plus, Trash2, X } from 'lucide-react'
import type { Evidence, EvidenceType } from '../../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const EVIDENCE_ICONS: Record<EvidenceType, React.ReactNode> = {
  cita:        <Quote size={14} />,
  hecho:       <BarChart2 size={14} />,
  observacion: <Eye size={14} />,
}

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  cita:        'Cita',
  hecho:       'Hecho',
  observacion: 'Observación',
}

const EVIDENCE_COLORS: Record<EvidenceType, string> = {
  cita:        'text-rose-400 bg-rose-500/10',
  hecho:       'text-amber-400 bg-amber-500/10',
  observacion: 'text-sky-400 bg-sky-500/10',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Form inline ──────────────────────────────────────────────────────────────

interface AddEvidenceFormProps {
  onAdd: (data: Omit<Evidence, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

function AddEvidenceForm({ onAdd, onCancel }: AddEvidenceFormProps) {
  const [type, setType] = useState<EvidenceType>('hecho')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    onAdd({
      type,
      content: content.trim(),
      source: type === 'cita' && source.trim() ? source.trim() : null,
    })
    setContent('')
    setSource('')
    setType('hecho')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
    >
      {/* Type selector */}
      <div className="flex gap-2">
        {(['cita', 'hecho', 'observacion'] as EvidenceType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['IBM_Plex_Mono'] transition-all
              ${type === t
                ? EVIDENCE_COLORS[t] + ' ring-1 ring-current'
                : 'text-slate-500 bg-slate-800 hover:bg-slate-700'
              }
            `}
          >
            {EVIDENCE_ICONS[t]}
            {EVIDENCE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Contenido de la evidencia..."
        rows={3}
        autoFocus
        className="
          w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
          text-sm text-slate-200 placeholder:text-slate-500
          focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
          resize-none font-sans
        "
      />

      {/* Source — only for cita */}
      {type === 'cita' && (
        <input
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Fuente (entrevista, documento, etc.)"
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-500
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            font-sans
          "
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors font-sans"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="
            px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-sans
          "
        >
          Añadir
        </button>
      </div>
    </form>
  )
}

// ─── Evidence Item ────────────────────────────────────────────────────────────

interface EvidenceItemProps {
  evidence: Evidence
  onDelete?: (id: string) => void
}

function EvidenceItem({ evidence, onDelete }: EvidenceItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group flex gap-3 py-3 border-b border-slate-800 last:border-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Type icon */}
      <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center ${EVIDENCE_COLORS[evidence.type]}`}>
        {EVIDENCE_ICONS[evidence.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          {evidence.content}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className={`text-[11px] font-['IBM_Plex_Mono'] ${EVIDENCE_COLORS[evidence.type]}`}>
            {EVIDENCE_LABELS[evidence.type]}
          </span>
          {evidence.type === 'cita' && evidence.source && (
            <span className="text-[11px] text-slate-500 font-['IBM_Plex_Mono']">
              — {evidence.source}
            </span>
          )}
          <span className="text-[11px] text-slate-600 font-['IBM_Plex_Mono']">
            {formatDate(evidence.createdAt)}
          </span>
        </div>
      </div>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(evidence.id)}
          className={`
            flex-shrink-0 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-150
            ${hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          title="Eliminar evidencia"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface EvidenceSectionProps {
  evidence: Evidence[]
  onAddEvidence?: (data: Omit<Evidence, 'id' | 'createdAt'>) => void
  onDeleteEvidence?: (id: string) => void
}

export function EvidenceSection({ evidence, onAddEvidence, onDeleteEvidence }: EvidenceSectionProps) {
  const [showForm, setShowForm] = useState(false)

  function handleAdd(data: Omit<Evidence, 'id' | 'createdAt'>) {
    onAddEvidence?.(data)
    setShowForm(false)
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-100 font-sans">Evidencia</h2>
          <span className="text-xs font-['IBM_Plex_Mono'] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {evidence.length}
          </span>
        </div>
        {onAddEvidence && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-sans"
          >
            <Plus size={14} />
            Añadir
          </button>
        )}
        {showForm && (
          <button
            onClick={() => setShowForm(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-4">
          <AddEvidenceForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* List */}
      {evidence.length === 0 && !showForm ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 text-sm font-sans">Sin evidencia registrada</p>
          <p className="text-slate-600 text-xs mt-1 font-sans">
            Añade citas, hechos u observaciones para sustentar esta oportunidad
          </p>
        </div>
      ) : (
        <div>
          {evidence.map(e => (
            <EvidenceItem
              key={e.id}
              evidence={e}
              onDelete={onDeleteEvidence}
            />
          ))}
        </div>
      )}
    </section>
  )
}
