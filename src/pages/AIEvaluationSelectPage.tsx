import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'

export function AIEvaluationSelectPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <Sparkles size={32} className="text-violet-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-[Nunito_Sans] mb-3">
          Evaluación con IA
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans] leading-relaxed mb-2">
          Claude analizará tus oportunidades, evidencia e hipótesis para darte feedback accionable sobre tu OST.
        </p>

        {/* Coming soon badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-sm font-semibold text-violet-400 font-['IBM_Plex_Mono']">
            Próximamente
          </span>
        </div>

        {/* What it will do */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-['IBM_Plex_Mono'] mb-3">
            Lo que viene
          </p>
          <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400 font-[Nunito_Sans]">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-0.5">1.</span>
              Evaluación automática de cada oportunidad con Claude
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-0.5">2.</span>
              Conversación de refinamiento para profundizar el análisis
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-0.5">3.</span>
              "Aplicar sugerencia" para llevar el feedback directo al OST
            </li>
          </ul>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-violet-400 transition-colors font-[Nunito_Sans]"
        >
          <ArrowLeft size={14} />
          Volver
        </button>
      </div>
    </div>
  )
}
