import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAllExperiments, type KanbanExperiment } from '../hooks/use-all-experiments'
import { ProjectSelector } from '../components/ProjectSelector'
import { Clock, PlayCircle, CheckCircle2, X, ChevronRight, Target, Search, Lightbulb, FlaskConical } from 'lucide-react'

// ─── Status config ───────────────────────────────────────────────────────────

const COLUMNS: { key: 'to do' | 'en curso' | 'terminada'; label: string; icon: React.ReactNode; accent: string }[] = [
  { key: 'to do', label: 'Por hacer', icon: <Clock size={14} />, accent: 'border-slate-600' },
  { key: 'en curso', label: 'En curso', icon: <PlayCircle size={14} />, accent: 'border-blue-500' },
  { key: 'terminada', label: 'Terminada', icon: <CheckCircle2 size={14} />, accent: 'border-green-500' },
]

const EFFORT_IMPACT: Record<string, string> = {
  bajo: 'text-green-400',
  medio: 'text-amber-400',
  alto: 'text-red-400',
}

const TYPE_LABEL: Record<string, string> = {
  entrevista: 'Entrevista',
  prototipo: 'Prototipo',
  smoke_test: 'Smoke test',
  prueba_usabilidad: 'Usabilidad',
  otro: 'Otro',
}

// ─── Experiment Detail Modal ─────────────────────────────────────────────────

function ExperimentModal({
  exp,
  onClose,
  onChangeStatus,
}: {
  exp: KanbanExperiment
  onClose: () => void
  onChangeStatus: (id: string, status: string, result?: string) => void
}) {
  const [resultText, setResultText] = useState('')
  const [showResult, setShowResult] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg max-h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-800">
            <div>
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider mb-1">Experimento</p>
              <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base leading-snug">{exp.description}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Traceability — from experiment back to outcome */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 uppercase tracking-wider mb-3">Trazabilidad al Outcome</p>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded-lg font-[Nunito_Sans] font-semibold">
                  <Target size={10} /> {exp.projectName}
                </span>
                <ChevronRight size={10} className="text-slate-700" />
                <span className="flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-1 rounded-lg font-[Nunito_Sans]">
                  <Search size={10} /> {exp.opportunityName}
                </span>
                <ChevronRight size={10} className="text-slate-700" />
                <span className="flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-1 rounded-lg font-[Nunito_Sans] max-w-[200px] truncate">
                  <Lightbulb size={10} /> {exp.hypothesisDescription}
                </span>
                <ChevronRight size={10} className="text-slate-700" />
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg font-[Nunito_Sans] font-semibold">
                  <FlaskConical size={10} /> Este experimento
                </span>
              </div>
            </div>

            {/* Type + Status + Score */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-['IBM_Plex_Mono'] text-slate-300 bg-slate-800 px-2 py-1 rounded-lg">
                {TYPE_LABEL[exp.type] ?? exp.type}
              </span>
              <span className={`text-[11px] font-['IBM_Plex_Mono'] px-2 py-1 rounded-lg ${
                exp.status === 'terminada' ? 'text-green-400 bg-green-500/10' :
                exp.status === 'en curso' ? 'text-blue-400 bg-blue-500/10' :
                'text-slate-400 bg-slate-800'
              }`}>
                {exp.status}
              </span>
              <span className="text-[11px] font-['IBM_Plex_Mono'] text-red-400 font-bold">
                Score: {exp.score.toFixed(1)}
              </span>
            </div>

            {/* Success criterion */}
            <div className="bg-slate-900/60 border-l-2 border-red-500/50 rounded-r-lg pl-3 pr-3 py-2.5">
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 mb-1">Criterio de éxito</p>
              <p className="text-sm text-slate-200 font-[Nunito_Sans] leading-relaxed">{exp.successCriterion}</p>
            </div>

            {/* Effort / Impact */}
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 mb-1">Esfuerzo</p>
                <span className={`text-sm font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.effort]}`}>
                  {exp.effort}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 mb-1">Impacto</p>
                <span className={`text-sm font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.impact]}`}>
                  {exp.impact}
                </span>
              </div>
            </div>

            {/* Result */}
            {exp.result && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-green-400 mb-1">Resultado</p>
                <p className="text-sm text-slate-200 font-[Nunito_Sans] leading-relaxed">{exp.result}</p>
              </div>
            )}

            {/* Result input for finishing */}
            {showResult && (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={resultText}
                  onChange={e => setResultText(e.target.value)}
                  placeholder="¿Qué aprendiste? ¿Se cumplió el criterio?"
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 resize-none font-[Nunito_Sans]"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowResult(false)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5">Cancelar</button>
                  <button
                    disabled={!resultText.trim()}
                    onClick={() => { onChangeStatus(exp.id, 'terminada', resultText.trim()); onClose() }}
                    className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          {exp.status !== 'terminada' && !showResult && (
            <div className="flex gap-2 p-5 border-t border-slate-800">
              {exp.status === 'to do' && (
                <button
                  onClick={() => { onChangeStatus(exp.id, 'en curso'); onClose() }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold font-[Nunito_Sans]"
                >
                  <PlayCircle size={14} /> Iniciar
                </button>
              )}
              <button
                onClick={() => setShowResult(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold font-[Nunito_Sans]"
              >
                <CheckCircle2 size={14} /> Marcar terminada
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({ exp, onClick }: { exp: KanbanExperiment; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition-all group"
    >
      <p className="text-xs text-slate-200 font-[Nunito_Sans] font-semibold line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
        {exp.description}
      </p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-[9px] font-['IBM_Plex_Mono'] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {TYPE_LABEL[exp.type] ?? exp.type}
        </span>
        <span className="text-[9px] font-['IBM_Plex_Mono'] text-red-400 font-bold">{exp.score.toFixed(1)}</span>
      </div>
      {/* Traceability breadcrumb */}
      <p className="text-[9px] text-slate-600 font-[Nunito_Sans] mt-2 truncate">
        {exp.opportunityName}
      </p>
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ExperimentsPage() {
  const { currentProject } = useProject()
  const { experiments, loading, changeStatus } = useAllExperiments(currentProject?.id)
  const [selectedExp, setSelectedExp] = useState<KanbanExperiment | null>(null)

  if (!currentProject) {
    return <ProjectSelector sectionLabel="el tablero de experimentos" />
  }

  const byStatus = (status: string) => experiments.filter(e => e.status === status)

  return (
    <div className="dark min-h-screen bg-slate-950">
      <div className="px-4 sm:px-6 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-[Nunito_Sans]">Experimentos</h1>
            <p className="text-xs text-slate-500 font-['IBM_Plex_Mono'] mt-0.5">
              {currentProject.name} · {experiments.length} experimentos
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando...</div>
        ) : experiments.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical size={28} className="mx-auto mb-3 text-slate-700" />
            <p className="text-sm text-slate-400 font-[Nunito_Sans]">Sin experimentos aún</p>
            <p className="text-xs text-slate-500 font-[Nunito_Sans] mt-1">Creá hipótesis y experimentos desde el detalle de una oportunidad</p>
          </div>
        ) : (
          /* Kanban columns */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => {
              const items = byStatus(col.key)
              return (
                <div key={col.key} className={`border-t-2 ${col.accent} pt-3`}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-slate-400">{col.icon}</span>
                    <span className="text-xs font-bold text-slate-300 font-[Nunito_Sans] uppercase tracking-wider">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map(exp => (
                      <KanbanCard key={exp.id} exp={exp} onClick={() => setSelectedExp(exp)} />
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-slate-600 font-[Nunito_Sans] px-1 py-4 text-center italic">
                        Sin experimentos
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedExp && (
        <ExperimentModal
          exp={selectedExp}
          onClose={() => setSelectedExp(null)}
          onChangeStatus={changeStatus}
        />
      )}
    </div>
  )
}
