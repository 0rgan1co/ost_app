import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useAllExperiments, type KanbanExperiment } from '../hooks/use-all-experiments'
import { ProjectSelector } from '../components/ProjectSelector'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import { Clock, PlayCircle, CheckCircle2, X, ChevronRight, FlaskConical, Sparkles, Loader2 } from 'lucide-react'

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
  onUpdateExperiment,
}: {
  exp: KanbanExperiment
  onClose: () => void
  onChangeStatus: (id: string, status: string, result?: string) => void
  onUpdateExperiment: (id: string, fields: any) => void
}) {
  const [resultText, setResultText] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState(exp.status)
  // Editable fields
  const [objective, setObjective] = useState(exp.objective)
  const [who, setWho] = useState(exp.who)
  const [action1, setAction1] = useState(() => parseAction(exp.actions, 0))
  const [action2, setAction2] = useState(() => parseAction(exp.actions, 1))
  const [action3, setAction3] = useState(() => parseAction(exp.actions, 2))
  const [startDate, setStartDate] = useState(exp.startDate ?? '')
  const [endDate, setEndDate] = useState(exp.endDate ?? '')
  const [reviewCycle, setReviewCycle] = useState(exp.reviewCycle)
  const [criterion, setCriterion] = useState(exp.successCriterion)
  const [result, setResult] = useState(exp.result ?? '')

  const saveField = (field: string, value: string | null) => {
    onUpdateExperiment(exp.id, { [field]: value || null })
  }

  const saveActions = () => {
    const combined = [action1, action2, action3].filter(Boolean).join('\n')
    saveField('actions', combined)
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'terminada') {
      setShowResult(true)
    } else {
      setStatus(newStatus as any)
      onChangeStatus(exp.id, newStatus)
    }
  }

  const handleBreakBlank = async () => {
    setGenerating(true)
    try {
      const prompt = `Sos experto en Product Discovery. Completá los 6 campos de este Experimento Semilla:

Contexto:
- Proyecto: ${exp.projectName}
- Oportunidad: ${exp.opportunityName}
- Hipótesis: ${exp.hypothesisDescription}
- Experimento: ${exp.description}
- Tipo: ${exp.type}

Respondé en JSON exacto (sin texto adicional):
{"objective":"...","criterion":"Si ... entonces ...","who":"...","action1":"...","action2":"...","action3":"...","reviewCycle":"..."}`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const data = JSON.parse(match[0])
        if (data.objective) { setObjective(data.objective); saveField('objective', data.objective) }
        if (data.criterion) { setCriterion(data.criterion); saveField('successCriterion', data.criterion) }
        if (data.who) { setWho(data.who); saveField('who', data.who) }
        if (data.action1) setAction1(data.action1)
        if (data.action2) setAction2(data.action2)
        if (data.action3) setAction3(data.action3)
        const actions = [data.action1, data.action2, data.action3].filter(Boolean).join('\n')
        if (actions) saveField('actions', actions)
        if (data.reviewCycle) { setReviewCycle(data.reviewCycle); saveField('reviewCycle', data.reviewCycle) }
      }
    } catch (err) {
      console.error('AI generation error:', err)
    }
    setGenerating(false)
  }

  const fieldClass = "w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none font-[Nunito_Sans]"

  const allEmpty = !objective && !criterion && !who && !action1 && !action2 && !action3

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none">
        <div className="w-full max-w-3xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-800">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">Experimento Semilla</span>
                {/* Status picklist */}
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value)}
                  className={`text-[10px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded appearance-none cursor-pointer border-0 focus:ring-1 focus:ring-amber-400 ${
                    status === 'terminada' ? 'text-green-400 bg-green-500/10' :
                    status === 'en curso' ? 'text-blue-400 bg-blue-500/10' :
                    'text-slate-400 bg-slate-800'
                  }`}
                >
                  <option value="to do">● Por hacer</option>
                  <option value="en curso">● En curso</option>
                  <option value="terminada">● Terminada</option>
                </select>
                <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400 font-bold">×{exp.score.toFixed(1)}</span>
              </div>
              <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base leading-snug">{exp.description}</h2>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                <span className="text-red-400">{exp.projectName}</span>
                <ChevronRight size={8} />
                <span className="text-orange-400 truncate max-w-[120px]">{exp.opportunityName}</span>
                <ChevronRight size={8} />
                <span className="text-indigo-400 truncate max-w-[120px]">{exp.hypothesisDescription}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 flex-shrink-0 ml-3">
              <X size={16} />
            </button>
          </div>

          {/* Break blank button */}
          {allEmpty && (
            <div className="px-5 pt-4">
              <button
                onClick={handleBreakBlank}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 font-[Nunito_Sans] text-sm font-semibold transition-colors"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Generando propuesta...' : 'Romper la hoja en blanco'}
              </button>
            </div>
          )}

          {/* 6-field grid */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* 1. Objetivo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">Objetivo</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Para qué proponemos el experimento?</p>
                <textarea value={objective} onChange={e => setObjective(e.target.value)}
                  onBlur={() => saveField('objective', objective)}
                  placeholder="El propósito de este experimento..." rows={3} className={fieldClass} />
              </div>

              {/* 2. Hipótesis */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-indigo-400 font-bold uppercase tracking-wider">Hipótesis</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">Creemos que si [acción], obtendremos [consecuencia]</p>
                <textarea value={criterion} onChange={e => setCriterion(e.target.value)}
                  onBlur={() => saveField('successCriterion', criterion)}
                  placeholder="Si hacemos X, entonces Y..." rows={3} className={fieldClass} />
              </div>

              {/* 3. ¿Quiénes? */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-cyan-400 font-bold uppercase tracking-wider">¿Quiénes?</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">Personas impulsoras, involucradas, impactadas</p>
                <textarea value={who} onChange={e => setWho(e.target.value)}
                  onBlur={() => saveField('who', who)}
                  placeholder="Equipo, usuarios, stakeholders..." rows={3} className={fieldClass} />
              </div>

              {/* 4. Acciones — 3 campos separados */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">3 Acciones concretas</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Qué vamos a hacer? Máximo 3 cosas.</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400/60 w-3">1.</span>
                    <input value={action1} onChange={e => setAction1(e.target.value)} onBlur={saveActions}
                      placeholder="Primera acción..." className={`${fieldClass} text-xs`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400/60 w-3">2.</span>
                    <input value={action2} onChange={e => setAction2(e.target.value)} onBlur={saveActions}
                      placeholder="Segunda acción..." className={`${fieldClass} text-xs`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400/60 w-3">3.</span>
                    <input value={action3} onChange={e => setAction3(e.target.value)} onBlur={saveActions}
                      placeholder="Tercera acción..." className={`${fieldClass} text-xs`} />
                  </div>
                </div>
              </div>

              {/* 5. Fechas */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">Fechas</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Cuándo inicia? ¿Hasta cuándo?</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={() => saveField('startDate', startDate || null)}
                      className={`${fieldClass} text-xs`} />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onBlur={() => saveField('endDate', endDate || null)}
                      className={`${fieldClass} text-xs`} />
                  </div>
                  <input value={reviewCycle} onChange={e => setReviewCycle(e.target.value)} onBlur={() => saveField('reviewCycle', reviewCycle)}
                    placeholder="Ej: revisión semanal" className={`${fieldClass} text-xs`} />
                </div>
              </div>

              {/* 6. Resultados */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-green-400 font-bold uppercase tracking-wider">Resultados</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Cómo sabremos que fue exitoso?</p>
                <textarea value={result} onChange={e => setResult(e.target.value)}
                  onBlur={() => saveField('result', result)}
                  placeholder={status === 'terminada' ? 'Resultado obtenido...' : '¿Qué queremos lograr?'}
                  rows={3} className={fieldClass} />
              </div>
            </div>

            {/* Effort / Impact / Type */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500">Esfuerzo:</span>
              <span className={`text-xs font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.effort]}`}>{exp.effort}</span>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 ml-2">Impacto:</span>
              <span className={`text-xs font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.impact]}`}>{exp.impact}</span>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 ml-2">Tipo:</span>
              <span className="text-xs font-['IBM_Plex_Mono'] text-slate-300">{TYPE_LABEL[exp.type] ?? exp.type}</span>
            </div>
          </div>

          {/* Result confirmation when marking as done */}
          {showResult && (
            <div className="p-5 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 font-[Nunito_Sans]">Registrá el resultado antes de cerrar:</p>
              <textarea autoFocus value={resultText} onChange={e => setResultText(e.target.value)}
                placeholder="¿Qué aprendiste? ¿Se cumplió el criterio?" rows={3} className={fieldClass} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowResult(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
                <button disabled={!resultText.trim()}
                  onClick={() => { onChangeStatus(exp.id, 'terminada', resultText.trim()); onClose() }}
                  className="text-xs bg-green-600 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg">
                  Confirmar resultado
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function parseAction(actions: string, idx: number): string {
  if (!actions) return ''
  const lines = actions.split('\n').filter(Boolean)
  return lines[idx] ?? ''
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
        <span className="text-[9px] font-['IBM_Plex_Mono'] text-amber-400 font-bold">{exp.score.toFixed(1)}</span>
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
  const { experiments, loading, changeStatus, updateExperiment } = useAllExperiments(currentProject?.id)
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
          onUpdateExperiment={updateExperiment}
        />
      )}
    </div>
  )
}
