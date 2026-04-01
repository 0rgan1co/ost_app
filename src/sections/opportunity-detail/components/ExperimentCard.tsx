import { useState } from 'react'
import { ChevronRight, CheckCircle2, Clock, PlayCircle } from 'lucide-react'
import type { Experiment, ExperimentStatus, EffortImpact } from '../../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EFFORT_IMPACT_COLORS: Record<EffortImpact, string> = {
  bajo:  'text-green-400 bg-green-500/10',
  medio: 'text-amber-400 bg-amber-500/10',
  alto:  'text-red-400 bg-red-500/10',
}

const STATUS_CONFIG: Record<ExperimentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  'to do':    { label: 'Pendiente',  color: 'text-slate-400 bg-slate-700',   icon: <Clock size={11} /> },
  'en curso': { label: 'En curso',   color: 'text-amber-400 bg-amber-500/15', icon: <PlayCircle size={11} /> },
  'terminada':{ label: 'Terminada',  color: 'text-green-400 bg-green-500/15', icon: <CheckCircle2 size={11} /> },
}

const TYPE_LABELS: Record<Experiment['type'], string> = {
  entrevista:        'Entrevista',
  prototipo:         'Prototipo',
  smoke_test:        'Smoke test',
  prueba_usabilidad: 'Usabilidad',
  otro:              'Otro',
}

// ─── Result modal (inline) ────────────────────────────────────────────────────

interface ResultModalProps {
  label: string
  onConfirm: (result: string) => void
  onCancel: () => void
}

function ResultModal({ label, onConfirm, onCancel }: ResultModalProps) {
  const [result, setResult] = useState('')
  return (
    <div className="mt-3 bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <p className="text-sm text-slate-300 font-sans">
        Registra el resultado para marcar como <strong>{label}</strong>:
      </p>
      <textarea
        autoFocus
        value={result}
        onChange={e => setResult(e.target.value)}
        placeholder="¿Qué aprendiste? ¿Se cumplió el criterio?"
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

// ─── Component ────────────────────────────────────────────────────────────────

interface ExperimentCardProps {
  experiment: Experiment
  onChangeStatus?: (id: string, status: ExperimentStatus, result?: string) => void
}

export function ExperimentCard({ experiment, onChangeStatus }: ExperimentCardProps) {
  const [pendingStatus, setPendingStatus] = useState<ExperimentStatus | null>(null)

  const statusCfg = STATUS_CONFIG[experiment.status]

  function handleStatusClick(next: ExperimentStatus) {
    if (next === 'terminada') {
      setPendingStatus(next)
    } else {
      onChangeStatus?.(experiment.id, next)
    }
  }

  function handleResultConfirm(result: string) {
    onChangeStatus?.(experiment.id, pendingStatus!, result)
    setPendingStatus(null)
  }

  const score = experiment.priorityScore.toFixed(2)

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type badge */}
          <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-md">
            {TYPE_LABELS[experiment.type]}
          </span>
          {/* Status badge */}
          <span className={`flex items-center gap-1 text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
        {/* Priority score */}
        <span className="flex-shrink-0 text-[11px] font-['IBM_Plex_Mono'] text-slate-500" title="Score: impacto/esfuerzo">
          ×{score}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-200 leading-relaxed font-sans">
        {experiment.description}
      </p>

      {/* Success criterion */}
      <div className="bg-slate-900/60 border-l-2 border-red-500/50 rounded-r-lg pl-3 pr-3 py-2">
        <p className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-0.5">Criterio de éxito</p>
        <p className="text-sm text-slate-300 font-sans">{experiment.successCriterion}</p>
      </div>

      {/* Effort / Impact pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 font-['IBM_Plex_Mono']">Esfuerzo:</span>
        <span className={`text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md capitalize ${EFFORT_IMPACT_COLORS[experiment.effort]}`}>
          {experiment.effort}
        </span>
        <span className="text-[11px] text-slate-500 font-['IBM_Plex_Mono'] ml-2">Impacto:</span>
        <span className={`text-[11px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-md capitalize ${EFFORT_IMPACT_COLORS[experiment.impact]}`}>
          {experiment.impact}
        </span>
      </div>

      {/* Result (if finished) */}
      {experiment.status === 'terminada' && experiment.result && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <p className="text-[11px] font-['IBM_Plex_Mono'] text-green-500/70 mb-1">Resultado</p>
          <p className="text-sm text-slate-300 font-sans">{experiment.result}</p>
        </div>
      )}

      {/* Status transition */}
      {onChangeStatus && experiment.status !== 'terminada' && (
        <div className="flex items-center gap-2 pt-1">
          {experiment.status === 'to do' && (
            <button
              onClick={() => handleStatusClick('en curso')}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-sans"
            >
              <ChevronRight size={13} />
              Iniciar
            </button>
          )}
          <button
            onClick={() => handleStatusClick('terminada')}
            className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-sans"
          >
            <CheckCircle2 size={13} />
            Marcar terminada
          </button>
        </div>
      )}

      {/* Result form when pending */}
      {pendingStatus === 'terminada' && (
        <ResultModal
          label="terminada"
          onConfirm={handleResultConfirm}
          onCancel={() => setPendingStatus(null)}
        />
      )}
    </div>
  )
}
