import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import type {
  Solution,
  AssumptionCategory,
  AssumptionStatus,
  Experiment,
  ExperimentStatus,
} from '../../../types'
import { AssumptionCard } from './AssumptionCard'

// ─── Category options ────────────────────────────────────────────────────────

const ASSUMPTION_CATEGORIES: { value: AssumptionCategory; label: string; color: string }[] = [
  { value: 'deseabilidad', label: 'Deseabilidad', color: 'bg-blue-400/20 text-blue-400 ring-1 ring-blue-400/30' },
  { value: 'viabilidad',   label: 'Viabilidad',   color: 'bg-green-400/20 text-green-400 ring-1 ring-green-400/30' },
  { value: 'factibilidad', label: 'Factibilidad', color: 'bg-amber-400/20 text-amber-400 ring-1 ring-amber-400/30' },
  { value: 'usabilidad',   label: 'Usabilidad',   color: 'bg-purple-400/20 text-purple-400 ring-1 ring-purple-400/30' },
]

// ─── Add Assumption Form ─────────────────────────────────────────────────────

interface AddAssumptionFormProps {
  onAdd: (data: { description: string; category: AssumptionCategory }) => void
  onCancel: () => void
}

function AddAssumptionForm({ onAdd, onCancel }: AddAssumptionFormProps) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AssumptionCategory>('deseabilidad')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    onAdd({ description: description.trim(), category })
    setDescription('')
  }

  const pillBase = 'text-[11px] font-["IBM_Plex_Mono"] px-2.5 py-1 rounded-lg cursor-pointer transition-all'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
    >
      {/* Category selector */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-2">Categoria</label>
        <div className="flex flex-wrap gap-2">
          {ASSUMPTION_CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`${pillBase} ${
                category === c.value ? c.color : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Descripcion</label>
        <textarea
          autoFocus
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Asumimos que..."
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-['Nunito_Sans']
          "
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors font-['Nunito_Sans']"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!description.trim()}
          className="
            px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-['Nunito_Sans']
          "
        >
          Anadir supuesto
        </button>
      </div>
    </form>
  )
}

// ─── SolutionCard ────────────────────────────────────────────────────────────

interface SolutionCardProps {
  solution: Solution
  onDeleteSolution?: (id: string) => void
  onAddAssumption?: (solutionId: string, data: { description: string; category: AssumptionCategory }) => void
  onChangeAssumptionStatus?: (id: string, status: AssumptionStatus, result?: string) => void
  onDeleteAssumption?: (id: string) => void
  onAddExperiment?: (
    assumptionId: string,
    data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
  ) => void
  onChangeExperimentStatus?: (id: string, status: ExperimentStatus, result?: string) => void
}

export function SolutionCard({
  solution,
  onDeleteSolution,
  onAddAssumption,
  onChangeAssumptionStatus,
  onDeleteAssumption,
  onAddExperiment,
  onChangeExperimentStatus,
}: SolutionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAssumptionForm, setShowAssumptionForm] = useState(false)

  const totalExperiments = solution.assumptions.reduce(
    (sum, a) => sum + a.experiments.length, 0
  )

  const validatedCount = solution.assumptions.filter(a => a.status === 'validado').length
  const invalidatedCount = solution.assumptions.filter(a => a.status === 'invalidado').length

  function handleAddAssumption(data: { description: string; category: AssumptionCategory }) {
    onAddAssumption?.(solution.id, data)
    setShowAssumptionForm(false)
    setExpanded(true)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 mt-0.5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100 leading-snug font-['Nunito_Sans']">
            {solution.name}
          </h3>
          {solution.description && (
            <p className="text-sm text-slate-400 leading-relaxed mt-1 font-['Nunito_Sans']">
              {solution.description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500">
              {solution.assumptions.length} supuesto{solution.assumptions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500">
              {totalExperiments} exp.
            </span>
            {validatedCount > 0 && (
              <span className="text-[11px] font-['IBM_Plex_Mono'] text-green-400">
                {validatedCount} validado{validatedCount !== 1 ? 's' : ''}
              </span>
            )}
            {invalidatedCount > 0 && (
              <span className="text-[11px] font-['IBM_Plex_Mono'] text-red-400">
                {invalidatedCount} invalidado{invalidatedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Add assumption */}
          {onAddAssumption && (
            <button
              onClick={() => {
                setShowAssumptionForm(f => !f)
                if (!expanded) setExpanded(true)
              }}
              title="Agregar supuesto"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          )}
          {/* Delete solution */}
          {onDeleteSolution && (
            <button
              onClick={() => onDeleteSolution(solution.id)}
              title="Eliminar solucion"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Assumptions (expanded) */}
      {expanded && (
        <div className="border-t border-slate-800">
          {/* Add assumption form */}
          {showAssumptionForm && (
            <div className="p-4 border-b border-slate-800">
              <AddAssumptionForm
                onAdd={handleAddAssumption}
                onCancel={() => setShowAssumptionForm(false)}
              />
            </div>
          )}

          {/* Assumption list */}
          {solution.assumptions.length === 0 && !showAssumptionForm ? (
            <div className="py-6 text-center">
              <p className="text-slate-500 text-sm font-['Nunito_Sans']">Sin supuestos</p>
              <p className="text-slate-400 text-xs mt-1 font-['Nunito_Sans']">
                Agrega supuestos de deseabilidad, viabilidad, factibilidad y usabilidad
              </p>
              {onAddAssumption && (
                <button
                  onClick={() => setShowAssumptionForm(true)}
                  className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto font-['Nunito_Sans']"
                >
                  <Plus size={12} />
                  Agregar primer supuesto
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {solution.assumptions.map(assumption => (
                <AssumptionCard
                  key={assumption.id}
                  assumption={assumption}
                  onChangeStatus={onChangeAssumptionStatus}
                  onDelete={onDeleteAssumption}
                  onAddExperiment={onAddExperiment}
                  onChangeExperimentStatus={onChangeExperimentStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
