import { Target, Search, Lightbulb, FlaskConical, ChevronRight } from 'lucide-react'

interface WorkflowStep {
  number: number
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  status: 'done' | 'current' | 'upcoming'
  action?: string
}

interface WorkflowGuideProps {
  hasOutcome: boolean
  opportunityCount: number
  hypothesisCount: number
  experimentCount: number
  onGoToContext: () => void
  onCreateOpportunity: () => void
  onGoToDetail: () => void
}

export function WorkflowGuide({
  hasOutcome,
  opportunityCount,
  hypothesisCount,
  experimentCount,
  onGoToContext,
  onCreateOpportunity,
  onGoToDetail,
}: WorkflowGuideProps) {
  // Determine current step
  let currentStep = 0
  if (hasOutcome) currentStep = 1
  if (opportunityCount > 0) currentStep = 2
  if (hypothesisCount > 0) currentStep = 3
  if (experimentCount > 0) currentStep = 4

  const steps: WorkflowStep[] = [
    {
      number: 1,
      icon: <Target size={18} />,
      title: 'Definir Outcome',
      subtitle: 'Aspiración → Dirección',
      description: 'El resultado medible que querés lograr. Tu brújula estratégica.',
      status: currentStep >= 1 ? 'done' : 'current',
      action: 'Ir a Business Context',
    },
    {
      number: 2,
      icon: <Search size={18} />,
      title: 'Descubrir Oportunidades',
      subtitle: 'Dirección → Problemas reales',
      description: 'Problemas y necesidades del usuario que, si resolvés, te acercan al outcome.',
      status: currentStep >= 2 ? 'done' : currentStep >= 1 ? 'current' : 'upcoming',
      action: 'Nueva oportunidad',
    },
    {
      number: 3,
      icon: <Lightbulb size={18} />,
      title: 'Generar Hipótesis',
      subtitle: 'Problemas → Ideas de solución',
      description: 'Supuestos sobre cómo resolver cada oportunidad. Múltiples ideas, no una sola.',
      status: currentStep >= 3 ? 'done' : currentStep >= 2 ? 'current' : 'upcoming',
      action: 'Ver oportunidad',
    },
    {
      number: 4,
      icon: <FlaskConical size={18} />,
      title: 'Diseñar Experimentos',
      subtitle: 'Ideas → Acción en días',
      description: 'La prueba más pequeña que valida o invalida tu hipótesis. Bajo esfuerzo, alto impacto.',
      status: currentStep >= 4 ? 'done' : currentStep >= 3 ? 'current' : 'upcoming',
      action: 'Ver hipótesis',
    },
  ]

  const handleStepClick = (step: WorkflowStep) => {
    if (step.number === 1) onGoToContext()
    else if (step.number === 2) onCreateOpportunity()
    else onGoToDetail()
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-[Nunito_Sans] font-bold text-slate-100 text-sm">
            De aspiraciones a acciones
          </h2>
          <p className="font-[Nunito_Sans] text-slate-400 text-xs mt-0.5">
            4 pasos para pasar de un outcome a experimentos priorizados
          </p>
        </div>
        <div className="flex items-center gap-1 font-['IBM_Plex_Mono'] text-[10px]">
          <span className="text-red-400 font-bold">{currentStep}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500">4</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => (
          <button
            key={step.number}
            onClick={() => handleStepClick(step)}
            className={`
              relative text-left p-4 rounded-xl border transition-all group
              ${step.status === 'done'
                ? 'bg-slate-900 border-green-500/20 hover:border-green-500/40'
                : step.status === 'current'
                  ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50 ring-1 ring-red-500/10'
                  : 'bg-slate-900/30 border-slate-800 opacity-50 hover:opacity-70'
              }
            `}
          >
            {/* Step number + icon */}
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`
                w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                ${step.status === 'done'
                  ? 'bg-green-500/10 text-green-400'
                  : step.status === 'current'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-slate-800 text-slate-500'
                }
              `}>
                {step.icon}
              </div>
              <div>
                <p className={`font-[Nunito_Sans] font-bold text-xs ${
                  step.status === 'done' ? 'text-green-400' : step.status === 'current' ? 'text-red-400' : 'text-slate-500'
                }`}>
                  Paso {step.number}
                </p>
              </div>
            </div>

            {/* Title */}
            <p className={`font-[Nunito_Sans] font-bold text-sm mb-0.5 ${
              step.status === 'upcoming' ? 'text-slate-500' : 'text-slate-100'
            }`}>
              {step.title}
            </p>

            {/* Subtitle — the transformation */}
            <p className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400 mb-2">
              {step.subtitle}
            </p>

            {/* Description */}
            <p className="font-[Nunito_Sans] text-[11px] text-slate-400 leading-relaxed">
              {step.description}
            </p>

            {/* Action hint */}
            {step.status === 'current' && (
              <div className="flex items-center gap-1 mt-3 text-red-400 font-[Nunito_Sans] text-[11px] font-semibold group-hover:gap-2 transition-all">
                {step.action}
                <ChevronRight size={12} />
              </div>
            )}

            {/* Done checkmark */}
            {step.status === 'done' && (
              <div className="absolute top-3 right-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {/* Connector arrow (not on last) */}
            {idx < 3 && (
              <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                <ChevronRight size={14} className="text-slate-700" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Motivational tagline when all done */}
      {currentStep >= 4 && (
        <div className="mt-4 text-center">
          <p className="font-[Nunito_Sans] text-sm text-green-400 font-semibold">
            Tu OST está listo para ejecutar
          </p>
          <p className="font-[Nunito_Sans] text-xs text-slate-400 mt-1">
            Revisá los Top 3 experimentos en el sidebar y empezá a testear
          </p>
        </div>
      )}
    </div>
  )
}
