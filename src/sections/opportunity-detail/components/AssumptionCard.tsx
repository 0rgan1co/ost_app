import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Circle,
  Plus,
  Trash2,
} from 'lucide-react'
import type {
  Assumption,
  AssumptionCategory,
  AssumptionStatus,
  Experiment,
  ExperimentStatus,
  ExperimentType,
  EffortImpact,
} from '../../../types'
import { ExperimentCard } from './ExperimentCard'

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<AssumptionCategory, { label: string; color: string }> = {
  deseabilidad: { label: 'Deseabilidad', color: 'text-blue-400 bg-blue-400/15 ring-1 ring-blue-400/30' },
  viabilidad:   { label: 'Viabilidad',   color: 'text-green-400 bg-green-400/15 ring-1 ring-green-400/30' },
  factibilidad: { label: 'Factibilidad', color: 'text-amber-400 bg-amber-400/15 ring-1 ring-amber-400/30' },
  usabilidad:   { label: 'Usabilidad',   color: 'text-purple-400 bg-purple-400/15 ring-1 ring-purple-400/30' },
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AssumptionStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pendiente:  { label: 'Pendiente',   icon: <Circle size={11} />,        color: 'text-slate-400 bg-slate-700' },
  validado:   { label: 'Validado',    icon: <CheckCircle2 size={11} />,  color: 'text-green-400 bg-green-500/15' },
  invalidado: { label: 'Invalidado',  icon: <XCircle size={11} />,       color: 'text-red-400 bg-red-500/15' },
}

// ─── Add Experiment Form ─────────────────────────────────────────────────────

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

interface AddExperimentFormProps {
  onAdd: (data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>) => void
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
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Descripcion</label>
        <textarea
          autoFocus
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Que vas a hacer y por que?"
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-sans
          "
        />
      </div>

      {/* Success criterion */}
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Criterio de exito</label>
        <textarea
          value={successCriterion}
          onChange={e => setSuccessCriterion(e.target.value)}
          placeholder="Como sabras que el experimento tuvo exito?"
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-sans
          "
        />
      </div>

      {/* Effort / Impact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
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
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
          Anadir experimento
        </button>
      </div>
    </form>
  )
}

// ─── Result Input ────────────────────────────────────────────────────────────

interface ResultInputProps {
  targetStatus: 'validado' | 'invalidado'
  onConfirm: (result: string) => void
  onCancel: () => void
}

function ResultInput({ targetStatus, onConfirm, onCancel }: ResultInputProps) {
  const [result, setResult] = useState('')
  const label = targetStatus === 'validado' ? 'validado' : 'invalidado'
  return (
    <div className="mt-3 bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <p className="text-sm text-slate-300 font-sans">
        Registra el resultado para marcar como <strong className="text-slate-100">{label}</strong>:
      </p>
      <textarea
        autoFocus
        value={result}
        onChange={e => setResult(e.target.value)}
        placeholder={
          targetStatus === 'validado'
            ? 'Que evidencia confirma este supuesto?'
            : 'Que evidencia refuta este supuesto?'
        }
        rows={3}
        className="
          w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2
          text-sm text-slate-200 placeholder:text-slate-400
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
          className={`
            px-4 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-sans
            ${targetStatus === 'validado'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
            }
          `}
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}

// ─── AssumptionCard ──────────────────────────────────────────────────────────

interface AssumptionCardProps {
  assumption: Assumption
  onChangeStatus?: (id: string, status: AssumptionStatus, result?: string) => void
  onDelete?: (id: string) => void
  onAddExperiment?: (
    assumptionId: string,
    data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
  ) => void
  onChangeExperimentStatus?: (id: string, status: ExperimentStatus, result?: string) => void
}

export function AssumptionCard({
  assumption,
  onChangeStatus,
  onDelete,
  onAddExperiment,
  onChangeExperimentStatus,
}: AssumptionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showExperimentForm, setShowExperimentForm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<'validado' | 'invalidado' | null>(null)

  const categoryCfg = CATEGORY_CONFIG[assumption.category]
  const statusCfg = STATUS_CONFIG[assumption.status]

  function handleResultConfirm(result: string) {
    if (!pendingStatus) return
    onChangeStatus?.(assumption.id, pendingStatus, result)
    setPendingStatus(null)
  }

  function handleAddExperiment(
    data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
  ) {
    onAddExperiment?.(assumption.id, data)
    setShowExperimentForm(false)
    setExpanded(true)
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-3">
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 mt-0.5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-relaxed font-['Nunito_Sans']">
            {assumption.description}
          </p>

          {/* Category + Status + experiment count */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md ${categoryCfg.color}`}>
              {categoryCfg.label}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md ${statusCfg.color}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500">
              {assumption.experiments.length} exp.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Status controls — only if pendiente */}
          {onChangeStatus && assumption.status === 'pendiente' && (
            <>
              <button
                onClick={() => setPendingStatus('validado')}
                title="Marcar validado"
                className="p-1.5 text-slate-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
              >
                <CheckCircle2 size={13} />
              </button>
              <button
                onClick={() => setPendingStatus('invalidado')}
                title="Marcar invalidado"
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <XCircle size={13} />
              </button>
            </>
          )}
          {/* Add experiment */}
          {onAddExperiment && (
            <button
              onClick={() => {
                setShowExperimentForm(f => !f)
                if (!expanded) setExpanded(true)
              }}
              title="Anadir experimento"
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Plus size={13} />
            </button>
          )}
          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => onDelete(assumption.id)}
              title="Eliminar supuesto"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Result (if validated/invalidated) */}
      {assumption.status !== 'pendiente' && assumption.result && (
        <div className={`mx-3 mb-3 rounded-lg p-3 ${
          assumption.status === 'validado'
            ? 'bg-green-500/5 border border-green-500/20'
            : 'bg-red-500/5 border border-red-500/20'
        }`}>
          <p className={`text-[10px] font-['IBM_Plex_Mono'] mb-1 ${
            assumption.status === 'validado' ? 'text-green-500/70' : 'text-red-500/70'
          }`}>
            Resultado
          </p>
          <p className="text-sm text-slate-300 font-['Nunito_Sans']">{assumption.result}</p>
        </div>
      )}

      {/* Result input modal */}
      {pendingStatus && (
        <div className="mx-3 mb-3">
          <ResultInput
            targetStatus={pendingStatus}
            onConfirm={handleResultConfirm}
            onCancel={() => setPendingStatus(null)}
          />
        </div>
      )}

      {/* Experiments (expanded) */}
      {expanded && (
        <div className="border-t border-slate-700/50">
          {/* Add experiment form */}
          {showExperimentForm && (
            <div className="p-3 border-b border-slate-700/50">
              <AddExperimentForm
                onAdd={handleAddExperiment}
                onCancel={() => setShowExperimentForm(false)}
              />
            </div>
          )}

          {/* Experiment list */}
          {assumption.experiments.length === 0 && !showExperimentForm ? (
            <div className="py-4 text-center">
              <p className="text-slate-500 text-xs font-['Nunito_Sans']">Sin experimentos</p>
              {onAddExperiment && (
                <button
                  onClick={() => setShowExperimentForm(true)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto font-['Nunito_Sans']"
                >
                  <Plus size={11} />
                  Anadir el primer experimento
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {assumption.experiments.map(exp => (
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
    </div>
  )
}
