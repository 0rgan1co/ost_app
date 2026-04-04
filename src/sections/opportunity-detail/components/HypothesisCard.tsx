import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import type {
  Hypothesis,
  HypothesisStatus,
  Experiment,
  ExperimentStatus,
  ExperimentType,
  EffortImpact,
} from '../../../types'
import { ExperimentCard } from './ExperimentCard'
import { ConfirmDialog } from '../../../components/ConfirmDialog'

// ─── Status config ────────────────────────────────────────────────────────────

const HYPOTHESIS_STATUS_CONFIG: Record<
  HypothesisStatus,
  { label: string; color: string; icon: React.ReactNode; next: HypothesisStatus | null }
> = {
  'to do': {
    label: 'Pendiente',
    color: 'text-slate-400 bg-slate-700',
    icon: <Clock size={11} />,
    next: 'en curso',
  },
  'en curso': {
    label: 'En curso',
    color: 'text-amber-400 bg-amber-500/15',
    icon: <PlayCircle size={11} />,
    next: 'terminada',
  },
  'terminada': {
    label: 'Terminada',
    color: 'text-green-400 bg-green-500/15',
    icon: <CheckCircle2 size={11} />,
    next: null,
  },
}

const EFFORT_IMPACT_OPTIONS: EffortImpact[] = ['bajo', 'medio', 'alto']
const EXPERIMENT_TYPES: ExperimentType[] = [
  'entrevista',
  'prototipo',
  'smoke_test',
  'prueba_usabilidad',
  'otro',
]
const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  entrevista:        'Entrevista',
  prototipo:         'Prototipo',
  smoke_test:        'Smoke test',
  prueba_usabilidad: 'Usabilidad',
  otro:              'Otro',
}

// ─── Add Experiment Form ──────────────────────────────────────────────────────

interface AddExperimentFormProps {
  onAdd: (data: Omit<Experiment, 'id' | 'hypothesisId' | 'priorityScore' | 'result' | 'status'>) => void
  onCancel: () => void
}

function AddExperimentForm({ onAdd, onCancel }: AddExperimentFormProps) {
  const [type, setType] = useState<ExperimentType>('entrevista')
  const [description, setDescription] = useState('')
  const [successCriterion, setSuccessCriterion] = useState('')
  const [effort, setEffort] = useState<EffortImpact>('medio')
  const [impact, setImpact] = useState<EffortImpact>('medio')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !successCriterion.trim()) return
    onAdd({ type, description: description.trim(), successCriterion: successCriterion.trim(), effort, impact })
  }

  const pillBase = 'text-[11px] font-["IBM_Plex_Mono"] px-2.5 py-1 rounded-lg cursor-pointer transition-all'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4"
    >
      {/* Type */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-2">Tipo de experimento</label>
        <div className="flex flex-wrap gap-2">
          {EXPERIMENT_TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`${pillBase} ${
                type === t
                  ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {EXPERIMENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Descripción</label>
        <textarea
          autoFocus
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="¿Qué vas a hacer y por qué?"
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-500
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-sans
          "
        />
      </div>

      {/* Success criterion */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Criterio de éxito</label>
        <textarea
          value={successCriterion}
          onChange={e => setSuccessCriterion(e.target.value)}
          placeholder="¿Cómo sabrás que el experimento tuvo éxito?"
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-500
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-sans
          "
        />
      </div>

      {/* Effort / Impact */}
      <div className="grid grid-cols-2 gap-4">
        {/* Effort */}
        <div>
          <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-2">Esfuerzo</label>
          <div className="flex gap-1.5">
            {EFFORT_IMPACT_OPTIONS.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => setEffort(o)}
                className={`flex-1 ${pillBase} ${
                  effort === o
                    ? o === 'bajo'
                      ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/40'
                      : o === 'medio'
                      ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40'
                      : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/40'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        {/* Impact */}
        <div>
          <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-2">Impacto</label>
          <div className="flex gap-1.5">
            {EFFORT_IMPACT_OPTIONS.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => setImpact(o)}
                className={`flex-1 ${pillBase} ${
                  impact === o
                    ? o === 'bajo'
                      ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/40'
                      : o === 'medio'
                      ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40'
                      : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/40'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

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
          disabled={!description.trim() || !successCriterion.trim()}
          className="
            px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-sans
          "
        >
          Añadir experimento
        </button>
      </div>
    </form>
  )
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

interface ResultModalProps {
  onConfirm: (result: string) => void
  onCancel: () => void
}

function ResultModal({ onConfirm, onCancel }: ResultModalProps) {
  const [result, setResult] = useState('')
  return (
    <div className="mt-3 bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <p className="text-sm text-slate-300 font-sans">
        Registra el resultado de la hipótesis:
      </p>
      <textarea
        autoFocus
        value={result}
        onChange={e => setResult(e.target.value)}
        placeholder="¿Qué aprendiste? ¿Se validó la hipótesis?"
        rows={3}
        className="
          w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2
          text-sm text-slate-200 placeholder:text-slate-500
          focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
          resize-none font-sans
        "
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors font-sans"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!result.trim()}
          onClick={() => onConfirm(result.trim())}
          className="
            px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-sans
          "
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}

// ─── HypothesisCard ───────────────────────────────────────────────────────────

interface HypothesisCardProps {
  hypothesis: Hypothesis
  onChangeStatus?: (id: string, status: HypothesisStatus, result?: string) => void
  onDelete?: (id: string) => void
  onAddExperiment?: (
    hypothesisId: string,
    data: Omit<Experiment, 'id' | 'hypothesisId' | 'priorityScore' | 'result' | 'status'>
  ) => void
  onChangeExperimentStatus?: (id: string, status: ExperimentStatus, result?: string) => void
}

export function HypothesisCard({
  hypothesis,
  onChangeStatus,
  onDelete,
  onAddExperiment,
  onChangeExperimentStatus,
}: HypothesisCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showExperimentForm, setShowExperimentForm] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const statusCfg = HYPOTHESIS_STATUS_CONFIG[hypothesis.status]

  function handleStatusAdvance() {
    if (!statusCfg.next) return
    if (statusCfg.next === 'terminada') {
      setShowResultModal(true)
    } else {
      onChangeStatus?.(hypothesis.id, statusCfg.next)
    }
  }

  function handleResultConfirm(result: string) {
    onChangeStatus?.(hypothesis.id, 'terminada', result)
    setShowResultModal(false)
  }

  function handleAddExperiment(
    data: Omit<Experiment, 'id' | 'hypothesisId' | 'priorityScore' | 'result' | 'status'>
  ) {
    onAddExperiment?.(hypothesis.id, data)
    setShowExperimentForm(false)
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
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            {hypothesis.description}
          </p>

          {/* Status + experiment count */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`flex items-center gap-1 text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md ${statusCfg.color}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-600">
              {hypothesis.experiments.length} experimento{hypothesis.experiments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Advance status */}
          {onChangeStatus && statusCfg.next && (
            <button
              onClick={handleStatusAdvance}
              title={`Pasar a ${statusCfg.next}`}
              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
            >
              <ChevronRight size={14} />
            </button>
          )}
          {/* Add experiment */}
          {onAddExperiment && (
            <button
              onClick={() => {
                setShowExperimentForm(f => !f)
                if (!expanded) setExpanded(true)
              }}
              title="Añadir experimento"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          )}
          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Eliminar hipótesis"
              className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Result (if finished) */}
      {hypothesis.status === 'terminada' && hypothesis.result && (
        <div className="mx-4 mb-3 bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <p className="text-[11px] font-['IBM_Plex_Mono'] text-green-500/70 mb-1">Resultado</p>
          <p className="text-sm text-slate-300 font-sans">{hypothesis.result}</p>
        </div>
      )}

      {/* Result modal */}
      {showResultModal && (
        <div className="mx-4 mb-4">
          <ResultModal
            onConfirm={handleResultConfirm}
            onCancel={() => setShowResultModal(false)}
          />
        </div>
      )}

      {/* Experiments (expanded) */}
      {expanded && (
        <div className="border-t border-slate-800">
          {/* Add experiment form */}
          {showExperimentForm && (
            <div className="p-4 border-b border-slate-800">
              <AddExperimentForm
                onAdd={handleAddExperiment}
                onCancel={() => setShowExperimentForm(false)}
              />
            </div>
          )}

          {/* Experiment list */}
          {hypothesis.experiments.length === 0 && !showExperimentForm ? (
            <div className="py-6 text-center">
              <p className="text-slate-500 text-sm font-sans">Sin experimentos</p>
              {onAddExperiment && (
                <button
                  onClick={() => setShowExperimentForm(true)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto font-sans"
                >
                  <Plus size={12} />
                  Añadir el primer experimento
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {hypothesis.experiments.map(exp => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  onChangeStatus={onChangeExperimentStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Eliminar hipótesis"
        message="Se eliminarán también todos los experimentos asociados. ¿Continuar?"
        variant="danger"
        confirmLabel="Eliminar"
        onConfirm={() => {
          onDelete?.(hypothesis.id)
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
