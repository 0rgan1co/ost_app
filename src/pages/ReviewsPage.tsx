import { useState } from 'react'
import { useProject } from '../contexts/ProjectContext'
import { useReviews, type OutcomeReview } from '../hooks/use-reviews'
import { useBusinessContext } from '../hooks/use-business-context'
import { ProjectSelector } from '../components/ProjectSelector'
import { Plus, X, Trash2, Download, Trophy, AlertTriangle, Lightbulb, ArrowRight, FileText } from 'lucide-react'

// ─── Review Form ─────────────────────────────────────────────────────────────

function ReviewForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [cycleName, setCycleName] = useState(`Semana ${new Date().toISOString().slice(0, 10)}`)
  const [achievements, setAchievements] = useState('')
  const [obstacles, setObstacles] = useState('')
  const [learnings, setLearnings] = useState('')
  const [nextSteps, setNextSteps] = useState('')

  const fieldClass = "w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none font-[Nunito_Sans]"

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-[Nunito_Sans] font-bold text-slate-900 dark:text-slate-100 text-base">Nueva revisión</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"><X size={16} /></button>
      </div>

      <div>
        <label className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Nombre del ciclo</label>
        <input value={cycleName} onChange={e => setCycleName(e.target.value)} className={fieldClass} placeholder="Ej: Sprint 12, Semana 2024-03-15" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-['IBM_Plex_Mono'] text-green-400 uppercase tracking-wider mb-1">
            <Trophy size={11} /> Logros
          </label>
          <textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={4} className={fieldClass}
            placeholder="¿Qué conseguimos en este ciclo?" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-['IBM_Plex_Mono'] text-amber-400 uppercase tracking-wider mb-1">
            <AlertTriangle size={11} /> Obstáculos
          </label>
          <textarea value={obstacles} onChange={e => setObstacles(e.target.value)} rows={4} className={fieldClass}
            placeholder="¿Qué nos frenó o bloqueó?" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-['IBM_Plex_Mono'] text-indigo-400 uppercase tracking-wider mb-1">
            <Lightbulb size={11} /> Aprendizajes
          </label>
          <textarea value={learnings} onChange={e => setLearnings(e.target.value)} rows={4} className={fieldClass}
            placeholder="¿Qué aprendimos? ¿Qué cambió nuestra perspectiva?" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-['IBM_Plex_Mono'] text-red-400 uppercase tracking-wider mb-1">
            <ArrowRight size={11} /> Próximos pasos
          </label>
          <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)} rows={4} className={fieldClass}
            placeholder="¿Qué hacemos en el próximo ciclo?" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-[Nunito_Sans]">Cancelar</button>
        <button
          onClick={() => onSubmit({ cycleName, achievements, obstacles, learnings, nextSteps })}
          disabled={!cycleName.trim()}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl font-[Nunito_Sans]"
        >
          Guardar revisión
        </button>
      </div>
    </div>
  )
}

// ─── Review Card ─────────────────────────────────────────────────────────────

function ReviewCard({ review, onDelete }: { review: OutcomeReview; onDelete: () => void }) {
  const sections = [
    { label: 'Logros', icon: <Trophy size={12} />, color: 'text-green-400 border-green-500/20', content: review.achievements },
    { label: 'Obstáculos', icon: <AlertTriangle size={12} />, color: 'text-amber-400 border-amber-500/20', content: review.obstacles },
    { label: 'Aprendizajes', icon: <Lightbulb size={12} />, color: 'text-indigo-400 border-indigo-500/20', content: review.learnings },
    { label: 'Próximos pasos', icon: <ArrowRight size={12} />, color: 'text-red-400 border-red-500/20', content: review.nextSteps },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 review-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-[Nunito_Sans] font-bold text-slate-900 dark:text-slate-100 text-sm">{review.cycleName}</h3>
          <p className="text-[10px] font-['IBM_Plex_Mono'] text-slate-500 mt-0.5">
            {new Date(review.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors no-print" title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map(s => (
          <div key={s.label} className={`border-l-2 ${s.color} pl-3 py-1`}>
            <p className={`text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-wider mb-1 flex items-center gap-1 ${s.color.split(' ')[0]}`}>
              {s.icon} {s.label}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-[Nunito_Sans] leading-relaxed whitespace-pre-line">
              {s.content || <span className="text-slate-400 dark:text-slate-600 italic">Sin completar</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function generatePDF(reviews: OutcomeReview[], projectName: string, outcome: string) {
  const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Revisión de Outcomes — ${projectName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 landscape; margin: 40px; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; }
  .slide { page-break-after: always; padding: 40px; min-height: 100vh; display: flex; flex-direction: column; }
  .slide:last-child { page-break-after: avoid; }
  .header { margin-bottom: 32px; }
  .project { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
  .title { font-size: 28px; font-weight: 800; color: #0f172a; margin: 8px 0; }
  .outcome { font-size: 14px; color: #64748b; }
  .cycle { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .date { font-size: 11px; color: #94a3b8; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; }
  .section { border-left: 3px solid; padding: 12px 16px; border-radius: 0 8px 8px 0; background: #f8fafc; }
  .section.green { border-color: #22c55e; }
  .section.amber { border-color: #f59e0b; }
  .section.indigo { border-color: #6366f1; }
  .section.red { border-color: #ef4444; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px; }
  .section.green .section-title { color: #16a34a; }
  .section.amber .section-title { color: #d97706; }
  .section.indigo .section-title { color: #4f46e5; }
  .section.red .section-title { color: #dc2626; }
  .section-content { font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-line; }
  .footer { text-align: center; color: #cbd5e1; font-size: 10px; margin-top: 24px; }
</style>
</head><body>
  <!-- Cover slide -->
  <div class="slide" style="justify-content:center;align-items:center;text-align:center;">
    <p class="project">${projectName}</p>
    <h1 class="title">Revisión de Outcomes</h1>
    <p class="outcome">${outcome}</p>
    <p style="margin-top:32px;color:#94a3b8;font-size:12px;">${reviews.length} revisiones · ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
  ${reviews.map(r => `
  <div class="slide">
    <div class="header">
      <p class="project">${projectName}</p>
      <p class="cycle">${r.cycleName}</p>
      <p class="date">${new Date(r.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <div class="grid">
      <div class="section green"><p class="section-title">Logros</p><p class="section-content">${r.achievements || '—'}</p></div>
      <div class="section amber"><p class="section-title">Obstáculos</p><p class="section-content">${r.obstacles || '—'}</p></div>
      <div class="section indigo"><p class="section-title">Aprendizajes</p><p class="section-content">${r.learnings || '—'}</p></div>
      <div class="section red"><p class="section-title">Próximos pasos</p><p class="section-content">${r.nextSteps || '—'}</p></div>
    </div>
    <p class="footer">OST App — Opportunity Solution Tree</p>
  </div>`).join('')}
</body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ReviewsPage() {
  const { currentProject } = useProject()
  const { reviews, loading, createReview, deleteReview } = useReviews(currentProject?.id)
  const { context } = useBusinessContext(currentProject?.id ?? '')
  const [showForm, setShowForm] = useState(false)

  if (!currentProject) {
    return <ProjectSelector sectionLabel="las revisiones de outcomes" />
  }

  const outcome = context.northStar.value || context.strategicChallenge.value || currentProject.name

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-[Nunito_Sans]">Revisión de Outcomes</h1>
            <p className="text-xs text-slate-500 font-['IBM_Plex_Mono'] mt-0.5">
              {currentProject.name} · LOAP en ciclos cortos
            </p>
          </div>
          <div className="flex gap-2">
            {reviews.length > 0 && (
              <button
                onClick={() => generatePDF(reviews, currentProject.name, outcome)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 text-sm font-[Nunito_Sans] font-semibold transition-colors"
              >
                <Download size={14} />
                Exportar PDF
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-[Nunito_Sans] font-semibold transition-colors"
            >
              <Plus size={14} />
              Nueva revisión
            </button>
          </div>
        </div>

        {/* Outcome context */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
          <p className="text-[10px] font-['IBM_Plex_Mono'] text-red-400 uppercase tracking-wider mb-1">Outcome del proyecto</p>
          <p className="text-sm text-slate-800 dark:text-slate-200 font-[Nunito_Sans]">{outcome}</p>
        </div>

        {/* New review form */}
        {showForm && (
          <div className="mb-6">
            <ReviewForm
              onSubmit={data => { createReview(data); setShowForm(false) }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Reviews list */}
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando...</p>
        ) : reviews.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <FileText size={28} className="mx-auto mb-3 text-slate-400 dark:text-slate-700" />
            <p className="text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans]">Sin revisiones aún</p>
            <p className="text-xs text-slate-500 font-[Nunito_Sans] mt-1">
              Creá tu primera revisión LOAP para documentar el progreso hacia el outcome
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <ReviewCard key={r.id} review={r} onDelete={() => deleteReview(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
