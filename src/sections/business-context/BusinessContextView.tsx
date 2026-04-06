import type { BusinessContext, BusinessContextProps } from '../../types'
import { ContextFieldCard } from './components/ContextFieldCard'
import { CompletenessIndicator } from './components/CompletenessIndicator'

// ─── Field definitions ────────────────────────────────────────────────────────

interface FieldDefinition {
  key: keyof BusinessContext
  label: string
  description: string
  placeholder: string
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'strategicChallenge',
    label: 'Desafío estratégico',
    description: '¿Cuál es el desafío estratégico que querés encarar? El problema o la ambición que motiva este proyecto.',
    placeholder:
      'Ej: Necesitamos encontrar un modelo de negocio sostenible que nos permita escalar sin depender de funding externo.',
  },
  {
    key: 'northStar',
    label: 'Norte estratégico',
    description: 'Outcome principal del producto a 12 meses. ¿Qué resultado medible querés lograr?',
    placeholder:
      'Ej: Convertirnos en la app de referencia para equipos de producto en LATAM con 500 equipos activos y NPS > 50.',
  },
  {
    key: 'targetSegment',
    label: 'Segmento objetivo',
    description: 'Usuario o cliente principal con sus jobs, dolores y ganancias.',
    placeholder:
      'Ej: Product managers en startups B2B de 10-50 personas que gestionan discovery con hojas de cálculo y pierden contexto entre sesiones.',
  },
  {
    key: 'keyConstraints',
    label: 'Restricciones clave',
    description: 'Límites técnicos, regulatorios o de negocio que condicionan las decisiones.',
    placeholder:
      'Ej: Solo stack web (no mobile native), presupuesto mensual de IA < $200, cumplimiento GDPR para usuarios europeos.',
  },
]

// ─── InfoBanner ───────────────────────────────────────────────────────────────

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-2 border-red-500 bg-slate-200 dark:bg-slate-800 px-4 py-3">
      {/* Info icon */}
      <svg
        className="mt-0.5 size-4 shrink-0 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      <p
        className="text-sm leading-relaxed text-slate-400"
        style={{ fontFamily: 'Nunito Sans, sans-serif' }}
      >
        El contexto de negocio mejora la calidad de las evaluaciones IA. Cuanto más detallado, mejor
        será el análisis de oportunidades.
      </p>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function BusinessContextView({
  project,
  context,
  isSaving = false,
  onSaveField,
}: BusinessContextProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-xs font-medium uppercase tracking-widest text-slate-500"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              >
                {project.name}
              </p>
              <h1
                className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                Contexto de negocio
              </h1>
              <p
                className="mt-1.5 text-sm text-slate-500"
                style={{ fontFamily: 'Nunito Sans, sans-serif' }}
              >
                Define el desafío, el norte estratégico, el segmento y las restricciones que guían las decisiones del producto.
              </p>
            </div>

            {/* Completeness badge */}
            <div className="shrink-0 pt-1">
              <CompletenessIndicator context={context} />
            </div>
          </div>
        </div>

        {/* ── Info banner ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <InfoBanner />
        </div>

        {/* ── Field cards ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {FIELD_DEFINITIONS.map(def => (
            <ContextFieldCard
              key={def.key}
              label={def.label}
              description={def.description}
              placeholder={def.placeholder}
              field={context[def.key]}
              isSaving={isSaving}
              onSave={value => onSaveField?.(def.key, value)}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
