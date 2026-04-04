import { Target, Search, Lightbulb, FlaskConical, ChevronRight } from 'lucide-react'

interface WorkflowGuideProps {
  hasOutcome: boolean
  opportunityCount: number
  hypothesisCount: number
  experimentCount: number
  onGoToContext: () => void
  onCreateOpportunity: () => void
  onGoToDetail: () => void
}

const STEPS = [
  { icon: Target, label: 'Outcome', short: '1' },
  { icon: Search, label: 'Oportunidades', short: '2' },
  { icon: Lightbulb, label: 'Hipótesis', short: '3' },
  { icon: FlaskConical, label: 'Experimentos', short: '4' },
]

export function WorkflowGuide({
  hasOutcome,
  opportunityCount,
  hypothesisCount,
  experimentCount,
  onGoToContext,
  onCreateOpportunity,
  onGoToDetail,
}: WorkflowGuideProps) {
  let currentStep = 0
  if (hasOutcome) currentStep = 1
  if (opportunityCount > 0) currentStep = 2
  if (hypothesisCount > 0) currentStep = 3
  if (experimentCount > 0) currentStep = 4

  const handlers = [onGoToContext, onCreateOpportunity, onGoToDetail, onGoToDetail]

  return (
    <div className="flex items-center mb-3">
      {STEPS.map((step, idx) => {
        const done = currentStep > idx
        const active = currentStep === idx
        const Icon = step.icon
        return (
          <div key={idx} className="flex items-center">
            <button
              onClick={handlers[idx]}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-[Nunito_Sans] transition-all
                ${done
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : active
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }
              `}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={14} className={`mx-1 flex-shrink-0 ${currentStep > idx ? 'text-green-500/40' : 'text-slate-700'}`} />
            )}
          </div>
        )
      })}
      {currentStep < 4 && (
        <span className="text-[10px] text-slate-500 font-['IBM_Plex_Mono'] ml-2">
          {currentStep + 1}/4
        </span>
      )}
    </div>
  )
}
