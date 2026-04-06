import { useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useOSTTree } from '../hooks/use-ost-tree'
import { ProjectSelector } from '../components/ProjectSelector'
import { Sparkles, ChevronRight } from 'lucide-react'

export function AIEvaluationSelectPage() {
  const navigate = useNavigate()
  const { currentProject } = useProject()

  if (!currentProject) {
    return <ProjectSelector sectionLabel="la evaluación con IA" />
  }

  return <OppSelector projectId={currentProject.id} projectName={currentProject.name} onSelect={(id) => navigate(`/ai-evaluation/${id}`)} />
}

function OppSelector({ projectId, projectName, onSelect }: { projectId: string; projectName: string; onSelect: (id: string) => void }) {
  const { opportunities, loading } = useOSTTree(projectId)
  const active = opportunities.filter(o => !o.isArchived)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-violet-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-[Nunito_Sans]">Evaluar con IA</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans]">
            Seleccioná una oportunidad de <strong className="text-slate-900 dark:text-slate-200">{projectName}</strong> para que Claude la analice.
          </p>
        </div>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-500 text-sm font-['IBM_Plex_Mono']">Cargando...</p>
        ) : active.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans]">No hay oportunidades para evaluar.</p>
            <p className="text-xs text-slate-500 font-[Nunito_Sans] mt-1">Creá oportunidades desde el OST Tree primero.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map(opp => (
              <button
                key={opp.id}
                onClick={() => onSelect(opp.id)}
                className="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/30 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-['IBM_Plex_Mono'] text-xs font-bold">
                    {opp.evidenceCount}ev
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-[Nunito_Sans] text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-violet-400 transition-colors truncate">
                    {opp.title}
                  </p>
                  <p className="text-xs text-slate-500 font-['IBM_Plex_Mono'] mt-0.5">
                    {opp.evidenceCount} evidencias · {opp.solutionCount} soluciones
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
