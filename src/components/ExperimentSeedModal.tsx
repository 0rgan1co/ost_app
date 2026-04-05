import { useState } from 'react'
import { X, ChevronRight, PlayCircle, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import { supabase } from '../lib/supabase'

interface ExperimentData {
  id: string
  description: string
  type: string
  successCriterion: string
  effort: string
  impact: string
  status: string
  result: string | null
  objective: string
  who: string
  actions: string
  startDate: string | null
  endDate: string | null
  reviewCycle: string
  // Traceability
  projectName: string
  opportunityName: string
  assumptionDescription: string
}

interface Props {
  experiment: ExperimentData
  onClose: () => void
  onRefresh: () => void
}

const EFFORT_IMPACT: Record<string, string> = { bajo: 'text-green-400', medio: 'text-amber-400', alto: 'text-red-400' }
const TYPE_LABEL: Record<string, string> = { entrevista: 'Entrevista', prototipo: 'Prototipo', smoke_test: 'Smoke test', prueba_usabilidad: 'Usabilidad', otro: 'Otro' }

function parseAction(actions: string, idx: number): string {
  return actions?.split('\n').filter(Boolean)[idx] ?? ''
}

export function ExperimentSeedModal({ experiment: exp, onClose, onRefresh }: Props) {
  const [generating, setGenerating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultText, setResultText] = useState('')
  const [objective, setObjective] = useState(exp.objective)
  const [who, setWho] = useState(exp.who)
  const [action1, setAction1] = useState(parseAction(exp.actions, 0))
  const [action2, setAction2] = useState(parseAction(exp.actions, 1))
  const [action3, setAction3] = useState(parseAction(exp.actions, 2))
  const [startDate, setStartDate] = useState(exp.startDate ?? '')
  const [endDate, setEndDate] = useState(exp.endDate ?? '')
  const [reviewCycle, setReviewCycle] = useState(exp.reviewCycle)
  const [criterion, setCriterion] = useState(exp.successCriterion)
  const [result, setResult] = useState(exp.result ?? '')
  const [status, setStatus] = useState(exp.status)

  const save = async (field: string, value: string | null) => {
    const map: Record<string, string> = { objective: 'objective', who: 'who', actions: 'actions', startDate: 'start_date', endDate: 'end_date', reviewCycle: 'review_cycle', successCriterion: 'success_criterion', result: 'result' }
    await supabase.from('experiments').update({ [map[field] ?? field]: value }).eq('id', exp.id)
  }

  const saveActions = () => save('actions', [action1, action2, action3].filter(Boolean).join('\n'))

  const handleStatus = async (s: string) => {
    if (s === 'terminada') { setShowResult(true); return }
    setStatus(s)
    await supabase.from('experiments').update({ status: s }).eq('id', exp.id)
    onRefresh()
  }

  const handleBreakBlank = async () => {
    setGenerating(true)
    try {
      const prompt = `Completá los campos de este Experimento Semilla:\nProyecto: ${exp.projectName}\nOportunidad: ${exp.opportunityName}\nSupuesto: ${exp.assumptionDescription}\nExperimento: ${exp.description}\nTipo: ${exp.type}\n\nRespondé SOLO JSON:\n{"objective":"...","criterion":"Si...entonces...","who":"...","action1":"...","action2":"...","action3":"...","reviewCycle":"..."}`
      const r = await anthropic.messages.create({ model: AI_MODEL, max_tokens: 512, messages: [{ role: 'user', content: prompt }] })
      const text = r.content[0].type === 'text' ? r.content[0].text : '{}'
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const d = JSON.parse(match[0])
        if (d.objective) { setObjective(d.objective); save('objective', d.objective) }
        if (d.criterion) { setCriterion(d.criterion); save('successCriterion', d.criterion) }
        if (d.who) { setWho(d.who); save('who', d.who) }
        if (d.action1) setAction1(d.action1)
        if (d.action2) setAction2(d.action2)
        if (d.action3) setAction3(d.action3)
        const acts = [d.action1, d.action2, d.action3].filter(Boolean).join('\n')
        if (acts) save('actions', acts)
        if (d.reviewCycle) { setReviewCycle(d.reviewCycle); save('reviewCycle', d.reviewCycle) }
      }
    } catch (err) { console.error(err) }
    setGenerating(false)
  }

  const allEmpty = !objective && !criterion && !who && !action1

  const fc = "w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 resize-none font-[Nunito_Sans]"

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
                <select value={status} onChange={e => handleStatus(e.target.value)}
                  className={`text-[10px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded appearance-none cursor-pointer border-0 focus:ring-1 focus:ring-amber-400 ${
                    status === 'terminada' ? 'text-green-400 bg-green-500/10' : status === 'en curso' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 bg-slate-800'
                  }`}>
                  <option value="to do">● Por hacer</option>
                  <option value="en curso">● En curso</option>
                  <option value="terminada">● Terminada</option>
                </select>
              </div>
              <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-base leading-snug">{exp.description}</h2>
              <div className="flex items-center gap-1 mt-2 text-[9px] font-['IBM_Plex_Mono'] text-slate-500">
                <span className="text-red-400">{exp.projectName}</span>
                <ChevronRight size={8} />
                <span className="text-orange-400 truncate max-w-[120px]">{exp.opportunityName}</span>
                <ChevronRight size={8} />
                <span className="text-indigo-400 truncate max-w-[120px]">{exp.assumptionDescription}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 flex-shrink-0 ml-3"><X size={16} /></button>
          </div>

          {/* Break blank */}
          {allEmpty && (
            <div className="px-5 pt-4">
              <button onClick={handleBreakBlank} disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 font-[Nunito_Sans] text-sm font-semibold transition-colors">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating ? 'Generando propuesta...' : 'Romper la hoja en blanco'}
              </button>
            </div>
          )}

          {/* 6-field grid */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">Objetivo</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Para qué proponemos el experimento?</p>
                <textarea value={objective} onChange={e => setObjective(e.target.value)} onBlur={() => save('objective', objective)} placeholder="El propósito..." rows={3} className={fc} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-indigo-400 font-bold uppercase tracking-wider">Criterio de éxito</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">Si [acción], obtendremos [consecuencia]</p>
                <textarea value={criterion} onChange={e => setCriterion(e.target.value)} onBlur={() => save('successCriterion', criterion)} placeholder="Si hacemos X..." rows={3} className={fc} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-cyan-400 font-bold uppercase tracking-wider">¿Quiénes?</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">Impulsoras, involucradas, impactadas</p>
                <textarea value={who} onChange={e => setWho(e.target.value)} onBlur={() => save('who', who)} placeholder="Equipo, usuarios..." rows={3} className={fc} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">3 Acciones</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Qué vamos a hacer?</p>
                <div className="space-y-1.5">
                  {[action1, action2, action3].map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-['IBM_Plex_Mono'] text-amber-400/60 w-3">{i+1}.</span>
                      <input value={a} onChange={e => [setAction1, setAction2, setAction3][i](e.target.value)} onBlur={saveActions} placeholder={`Acción ${i+1}...`} className={`${fc} text-xs`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-amber-400 font-bold uppercase tracking-wider">Fechas</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">Inicio, fin, ciclos</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={() => save('startDate', startDate || null)} className={`${fc} text-xs`} />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onBlur={() => save('endDate', endDate || null)} className={`${fc} text-xs`} />
                  </div>
                  <input value={reviewCycle} onChange={e => setReviewCycle(e.target.value)} onBlur={() => save('reviewCycle', reviewCycle)} placeholder="Ej: revisión semanal" className={`${fc} text-xs`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-['IBM_Plex_Mono'] text-green-400 font-bold uppercase tracking-wider">Resultados</label>
                <p className="text-[10px] text-slate-500 font-[Nunito_Sans]">¿Cómo sabremos que fue exitoso?</p>
                <textarea value={result} onChange={e => setResult(e.target.value)} onBlur={() => save('result', result)} placeholder="¿Qué queremos lograr?" rows={3} className={fc} />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500">Esfuerzo:</span>
              <span className={`text-xs font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.effort]}`}>{exp.effort}</span>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 ml-2">Impacto:</span>
              <span className={`text-xs font-['IBM_Plex_Mono'] font-bold capitalize ${EFFORT_IMPACT[exp.impact]}`}>{exp.impact}</span>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 ml-2">Tipo:</span>
              <span className="text-xs font-['IBM_Plex_Mono'] text-slate-300">{TYPE_LABEL[exp.type] ?? exp.type}</span>
            </div>
          </div>

          {showResult && (
            <div className="p-5 border-t border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 font-[Nunito_Sans]">Registrá el resultado:</p>
              <textarea autoFocus value={resultText} onChange={e => setResultText(e.target.value)} placeholder="¿Qué aprendiste?" rows={3} className={fc} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowResult(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
                <button disabled={!resultText.trim()} onClick={async () => {
                  await supabase.from('experiments').update({ status: 'terminada', result: resultText.trim() }).eq('id', exp.id)
                  onRefresh(); onClose()
                }} className="text-xs bg-green-600 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg">Confirmar</button>
              </div>
            </div>
          )}

          {status !== 'terminada' && !showResult && (
            <div className="flex gap-2 p-5 border-t border-slate-800">
              {status === 'to do' && (
                <button onClick={() => handleStatus('en curso')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold font-[Nunito_Sans]">
                  <PlayCircle size={14} /> Iniciar
                </button>
              )}
              <button onClick={() => setShowResult(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold font-[Nunito_Sans]">
                <CheckCircle2 size={14} /> Marcar terminada
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
