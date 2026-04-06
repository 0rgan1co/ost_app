import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { anthropic, AI_MODEL } from '../lib/anthropic'
import { useProjects } from '../hooks/use-projects'
import { Pencil, Check, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface ProjectContext {
  projectId: string
  projectName: string
  strategicChallenge: string
  northStar: string
  targetSegment: string
  keyConstraints: string
}

const FIELDS = [
  { key: 'strategicChallenge', label: 'Desafío estratégico', color: 'text-red-400' },
  { key: 'northStar', label: 'Norte estratégico', color: 'text-red-400' },
  { key: 'targetSegment', label: 'Segmento objetivo', color: 'text-orange-400' },
  { key: 'keyConstraints', label: 'Restricciones', color: 'text-slate-400' },
] as const

export function BusinessContextPage() {
  const { user } = useAuth()
  const { projects } = useProjects(user?.id ?? '')
  const [contexts, setContexts] = useState<ProjectContext[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ projectId: string; field: string } | null>(null)
  const [editText, setEditText] = useState('')
  const [enchulando, setEnchulando] = useState<string | null>(null)

  // Fetch all contexts
  useEffect(() => {
    async function load() {
      if (!projects.length) { setLoading(false); return }
      const { data } = await supabase
        .from('business_context')
        .select('project_id, content')
        .in('project_id', projects.map(p => p.id))

      const mapped: ProjectContext[] = projects.map(p => {
        const row = data?.find(d => d.project_id === p.id)
        let parsed: any = {}
        if (row?.content) {
          try { parsed = typeof row.content === 'string' ? JSON.parse(row.content) : row.content } catch {}
        }
        const val = (f: any) => typeof f === 'string' ? f : f?.value ?? ''
        return {
          projectId: p.id,
          projectName: p.name,
          strategicChallenge: val(parsed.strategicChallenge),
          northStar: val(parsed.northStar),
          targetSegment: val(parsed.targetSegment),
          keyConstraints: val(parsed.keyConstraints),
        }
      })
      setContexts(mapped)
      setLoading(false)
    }
    load()
  }, [projects])

  const saveField = async (projectId: string, field: string, value: string) => {
    const ctx = contexts.find(c => c.projectId === projectId)
    if (!ctx) return
    const now = new Date().toISOString()
    const content = JSON.stringify({
      strategicChallenge: { value: field === 'strategicChallenge' ? value : ctx.strategicChallenge, updatedAt: now },
      northStar: { value: field === 'northStar' ? value : ctx.northStar, updatedAt: now },
      targetSegment: { value: field === 'targetSegment' ? value : ctx.targetSegment, updatedAt: now },
      keyConstraints: { value: field === 'keyConstraints' ? value : ctx.keyConstraints, updatedAt: now },
    })
    const { data: existing } = await supabase.from('business_context').select('id').eq('project_id', projectId).maybeSingle()
    if (existing) {
      await supabase.from('business_context').update({ content }).eq('id', existing.id)
    } else {
      await supabase.from('business_context').insert({ project_id: projectId, content })
    }
    setContexts(prev => prev.map(c => c.projectId === projectId ? { ...c, [field]: value } : c))
  }

  const handleEnchular = async (projectId: string, field: string) => {
    const ctx = contexts.find(c => c.projectId === projectId)
    if (!ctx) return
    const current = (ctx as any)[field]
    if (!current) return

    setEnchulando(`${projectId}-${field}`)
    try {
      const prompt = `Mejorá este texto de contexto de negocio para que sea más claro, específico y accionable. Mantené la esencia pero hacelo más profesional y conciso.

Campo: ${FIELDS.find(f => f.key === field)?.label}
Texto actual: "${current}"
Proyecto: ${ctx.projectName}

Respondé SOLO con el texto mejorado, sin explicaciones ni comillas.`

      const r = await anthropic.messages.create({ model: AI_MODEL, max_tokens: 256, messages: [{ role: 'user', content: prompt }] })
      const improved = r.content[0].type === 'text' ? r.content[0].text.trim() : current
      await saveField(projectId, field, improved)
    } catch (err) {
      console.error('Enchular error:', err)
    }
    setEnchulando(null)
  }

  const filledCount = (ctx: ProjectContext) => FIELDS.filter(f => (ctx as any)[f.key]).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-[Nunito_Sans] mb-1">Contexto de negocio</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans] mb-8">
          Resumen del contexto estratégico de cada proyecto
        </p>

        {loading ? (
          <p className="text-slate-500 text-sm font-['IBM_Plex_Mono']">Cargando...</p>
        ) : contexts.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-sm font-[Nunito_Sans]">No hay proyectos aún.</p>
        ) : (
          <div className="space-y-3">
            {contexts.map(ctx => {
              const isExpanded = expandedId === ctx.projectId
              const filled = filledCount(ctx)
              return (
                <div key={ctx.projectId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {/* Project header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ctx.projectId)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-slate-500 flex-shrink-0">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Nunito_Sans] font-bold text-slate-900 dark:text-slate-100 text-sm">{ctx.projectName}</p>
                      {!isExpanded && ctx.northStar && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-[Nunito_Sans] truncate mt-0.5">{ctx.northStar}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-['IBM_Plex_Mono'] px-2 py-0.5 rounded-full ${
                      filled === 4 ? 'text-green-400 bg-green-500/10' : filled > 0 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-800'
                    }`}>
                      {filled}/4
                    </span>
                  </button>

                  {/* Expanded fields */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                      {FIELDS.map(f => {
                        const value = (ctx as any)[f.key] as string
                        const isEditing = editingField?.projectId === ctx.projectId && editingField?.field === f.key
                        const isEnchulando = enchulando === `${ctx.projectId}-${f.key}`

                        return (
                          <div key={f.key} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-wider ${f.color}`}>{f.label}</p>
                              <div className="flex items-center gap-1">
                                {value && (
                                  <button
                                    onClick={() => handleEnchular(ctx.projectId, f.key)}
                                    disabled={!!enchulando}
                                    className="flex items-center gap-1 text-[9px] text-violet-400 hover:text-violet-300 font-['IBM_Plex_Mono'] transition-colors disabled:opacity-40"
                                    title="Mejorar con IA"
                                  >
                                    {isEnchulando ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                                    enchular
                                  </button>
                                )}
                                {!isEditing && (
                                  <button
                                    onClick={() => { setEditingField({ projectId: ctx.projectId, field: f.key }); setEditText(value) }}
                                    className="text-slate-600 hover:text-slate-300 transition-colors"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="flex items-start gap-2">
                                <textarea
                                  autoFocus
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveField(ctx.projectId, f.key, editText); setEditingField(null) }
                                    if (e.key === 'Escape') setEditingField(null)
                                  }}
                                  rows={3}
                                  className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 font-[Nunito_Sans] focus:outline-none focus:border-red-500/50 resize-y min-h-[2.5rem] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                  placeholder={`Escribí el ${f.label.toLowerCase()}...`}
                                />
                                <button onClick={() => { saveField(ctx.projectId, f.key, editText); setEditingField(null) }}
                                  className="text-green-400 hover:text-green-300 flex-shrink-0 mt-2"><Check size={14} /></button>
                              </div>
                            ) : value ? (
                              <p className="text-sm text-slate-700 dark:text-slate-300 font-[Nunito_Sans] leading-relaxed">{value}</p>
                            ) : (
                              <button
                                onClick={() => { setEditingField({ projectId: ctx.projectId, field: f.key }); setEditText('') }}
                                className="text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 font-[Nunito_Sans] italic transition-colors"
                              >
                                + Agregar {f.label.toLowerCase()}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
