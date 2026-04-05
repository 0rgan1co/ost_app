import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Plus,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type {
  OpportunityDetailProps,
  OpportunityDetail,
} from '../../types'
import { EvidenceSection } from './components/EvidenceSection'
import { SolutionCard } from './components/SolutionCard'
import { TopExperimentsCard } from './components/TopExperimentsCard'
import { PrioritizationPanel } from './components/PrioritizationPanel'

// ─── Inline editable field ────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  placeholder?: string
  multiline?: boolean
  className?: string
  onSave: (value: string) => void
}

function InlineEdit({ value, placeholder = '—', multiline = false, className = '', onSave }: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      ref.current?.focus()
    }
  }, [editing, value])

  function handleSave() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setEditing(false); setDraft(value) }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    if (!multiline && e.key === 'Enter') handleSave()
  }

  if (editing) {
    const sharedClass = `
      w-full bg-slate-800 border border-red-500/40 rounded-lg px-2 py-1
      text-inherit placeholder:text-slate-400 font-inherit
      focus:outline-none focus:border-red-500/70 focus:ring-1 focus:ring-red-500/20
      resize-none transition-all
      ${className}
    `
    return multiline ? (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        rows={3}
        className={sharedClass}
        placeholder={placeholder}
      />
    ) : (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={sharedClass}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click para editar"
      className={`cursor-text hover:bg-slate-800/60 rounded px-1 -mx-1 transition-colors group ${className}`}
    >
      {value || <span className="text-slate-400 italic">{placeholder}</span>}
    </span>
  )
}

// ─── Add solution form ───────────────────────────────────────────────────────

interface AddSolutionFormProps {
  onAdd: (data: { name: string; description?: string }) => void
  onCancel: () => void
}

function AddSolutionForm({ onAdd, onCancel }: AddSolutionFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({ name: name.trim(), description: description.trim() || undefined })
    setName('')
    setDescription('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3"
    >
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Nombre de la solucion</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: App movil de registro rapido"
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            font-['Nunito_Sans']
          "
        />
      </div>
      <div>
        <label className="block text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Descripcion (opcional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Breve descripcion de la solucion propuesta..."
          rows={2}
          className="
            w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
            text-sm text-slate-200 placeholder:text-slate-400
            focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30
            resize-none font-['Nunito_Sans']
          "
        />
      </div>
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
          disabled={!name.trim()}
          className="
            px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed
            text-white text-sm font-semibold rounded-lg transition-colors font-['Nunito_Sans']
          "
        >
          Anadir solucion
        </button>
      </div>
    </form>
  )
}

// ─── OpportunityDetailView ────────────────────────────────────────────────────

export function OpportunityDetailView({
  project,
  opportunity,
  evidence,
  solutions,
  topExperiments,
  onUpdateOpportunity,
  onAddEvidence,
  onDeleteEvidence,
  onAddSolution,
  onDeleteSolution,
  onAddAssumption,
  onChangeAssumptionStatus,
  onDeleteAssumption,
  onAddExperiment,
  onChangeExperimentStatus,
  onUpdatePriority,
  onToggleTarget,
  onNavigateToAIEvaluation,
  onNavigateBack,
}: OpportunityDetailProps) {
  const [showSolutionForm, setShowSolutionForm] = useState(false)

  const handleUpdateField = useCallback(
    (field: keyof OpportunityDetail) => (value: string) => {
      onUpdateOpportunity?.(opportunity.id, { [field]: value })
    },
    [opportunity.id, onUpdateOpportunity]
  )

  function handleToggleStatus() {
    const next = opportunity.status === 'activa' ? 'descartada' : 'activa'
    onUpdateOpportunity?.(opportunity.id, { status: next })
  }

  function handleAddSolution(data: { name: string; description?: string }) {
    onAddSolution?.(data)
    setShowSolutionForm(false)
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 font-['Nunito_Sans']">
      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 sm:pb-32 space-y-4 sm:space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 font-['IBM_Plex_Mono']">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={13} />
            {project.name}
          </button>
          <ChevronRight size={13} />
          <span className="text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">{opportunity.title}</span>
        </nav>

        {/* ── Header ── */}
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Title + status */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-50 leading-snug flex-1">
              <InlineEdit
                value={opportunity.title}
                placeholder="Nombre de la oportunidad"
                className="text-xl font-bold text-slate-50"
                onSave={handleUpdateField('title')}
              />
            </h1>
            <button
              onClick={handleToggleStatus}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                font-['IBM_Plex_Mono'] transition-all
                ${opportunity.status === 'activa'
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }
              `}
              title="Cambiar estado"
            >
              {opportunity.status === 'activa'
                ? <><CheckCircle2 size={12} /> Activa</>
                : <><XCircle size={12} /> Descartada</>
              }
            </button>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] font-['IBM_Plex_Mono'] text-slate-500 mb-1.5">Descripcion</p>
            <div className="text-sm text-slate-300 leading-relaxed">
              <InlineEdit
                value={opportunity.description}
                placeholder="Describe la oportunidad..."
                multiline
                className="text-sm text-slate-300"
                onSave={handleUpdateField('description')}
              />
            </div>
          </div>

          {/* Outcome */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <p className="text-[11px] font-['IBM_Plex_Mono'] text-red-400/70 mb-1.5 uppercase tracking-wide">
              Outcome esperado
            </p>
            <div className="text-sm text-slate-200 leading-relaxed">
              <InlineEdit
                value={opportunity.outcome}
                placeholder="Que resultado esperas lograr?"
                multiline
                className="text-sm text-slate-200"
                onSave={handleUpdateField('outcome')}
              />
            </div>
          </div>
        </header>

        {/* ── Prioritization ── */}
        {onUpdatePriority && onToggleTarget && (
          <PrioritizationPanel
            priorityImpact={opportunity.priorityImpact}
            priorityFrequency={opportunity.priorityFrequency}
            priorityIntensity={opportunity.priorityIntensity}
            priorityCapacity={opportunity.priorityCapacity}
            isTarget={opportunity.isTarget}
            onUpdatePriority={onUpdatePriority}
            onToggleTarget={onToggleTarget}
          />
        )}

        {/* ── Evidence ── */}
        <EvidenceSection
          evidence={evidence}
          onAddEvidence={onAddEvidence}
          onDeleteEvidence={onDeleteEvidence}
        />

        {/* ── Solutions ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-indigo-400 font-['Nunito_Sans']">Soluciones</h2>
              <span className="text-xs font-['IBM_Plex_Mono'] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                {solutions.length}
              </span>
              {solutions.length >= 3 && (
                <span className="text-xs text-green-400 font-['IBM_Plex_Mono']">{'✓'} 3+ soluciones</span>
              )}
            </div>
            {onAddSolution && !showSolutionForm && (
              <button
                onClick={() => setShowSolutionForm(true)}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-['Nunito_Sans']"
              >
                <Plus size={14} />
                Anadir
              </button>
            )}
          </div>

          {/* Torres nudge */}
          {solutions.length < 3 && solutions.length > 0 && (
            <div className="border border-dashed border-amber-500/30 rounded-xl px-4 py-3 bg-amber-500/5">
              <p className="text-xs text-amber-400/90 font-[Nunito_Sans] leading-relaxed">
                Teresa Torres recomienda generar al menos 3 soluciones por oportunidad para evitar sesgos
              </p>
            </div>
          )}

          {/* Form */}
          {showSolutionForm && (
            <AddSolutionForm
              onAdd={handleAddSolution}
              onCancel={() => setShowSolutionForm(false)}
            />
          )}

          {/* Empty state */}
          {solutions.length === 0 && !showSolutionForm ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl py-10 text-center">
              <p className="text-slate-500 text-sm font-['Nunito_Sans']">Sin soluciones</p>
              <p className="text-slate-400 text-xs mt-1 font-['Nunito_Sans']">
                Idea al menos 3 soluciones para cada oportunidad
              </p>
              {onAddSolution && (
                <button
                  onClick={() => setShowSolutionForm(true)}
                  className="mt-4 flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-['Nunito_Sans'] mx-auto"
                >
                  <Plus size={14} />
                  Anadir primera solucion
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {solutions.map(s => (
                <SolutionCard
                  key={s.id}
                  solution={s}
                  onDeleteSolution={onDeleteSolution}
                  onAddAssumption={onAddAssumption}
                  onChangeAssumptionStatus={onChangeAssumptionStatus}
                  onDeleteAssumption={onDeleteAssumption}
                  onAddExperiment={onAddExperiment}
                  onChangeExperimentStatus={onChangeExperimentStatus}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Top 3 Experiments ── */}
        <TopExperimentsCard topExperiments={topExperiments} />
      </div>

      {/* ── Sticky CTA ── */}
      {onNavigateToAIEvaluation && (
        <div className="fixed bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto px-1 sm:px-0">
            <button
              onClick={() => onNavigateToAIEvaluation(opportunity.id)}
              className="
                w-full flex items-center justify-center gap-2.5
                bg-red-500 hover:bg-red-600 active:bg-red-700
                text-white font-semibold text-sm py-3 sm:py-3.5 rounded-2xl
                shadow-lg shadow-red-500/25 transition-all duration-200
                font-['Nunito_Sans']
              "
            >
              <Sparkles size={16} />
              Evaluar con IA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
