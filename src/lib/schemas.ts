import { z } from 'zod'

// ─── Shared Enums ────────────────────────────────────────────────────────────

export const ProjectRoleSchema = z.enum(['admin', 'usuario', 'viewer'])

export const EvidenceTypeSchema = z.enum(['cita', 'hecho', 'observacion'])

export const AssumptionCategorySchema = z.enum([
  'deseabilidad',
  'viabilidad',
  'factibilidad',
  'usabilidad',
])

export const AssumptionStatusSchema = z.enum(['pendiente', 'validado', 'invalidado'])

export const ExperimentTypeSchema = z.enum([
  'entrevista',
  'prototipo',
  'smoke_test',
  'prueba_usabilidad',
  'otro',
])

export const ExperimentStatusSchema = z.enum(['to do', 'en curso', 'terminada'])

export const EffortImpactSchema = z.enum(['bajo', 'medio', 'alto'])

// ─── Evidence ────────────────────────────────────────────────────────────────

export const OpportunityEvidenceSchema = z
  .object({
    type: EvidenceTypeSchema,
    content: z.string().min(1, 'El contenido de la evidencia es obligatorio'),
    source: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'cita' && (!data.source || data.source.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fuente es obligatoria cuando el tipo es "cita"',
        path: ['source'],
      })
    }
  })

export type OpportunityEvidenceInput = z.infer<typeof OpportunityEvidenceSchema>

// ─── Experiment ──────────────────────────────────────────────────────────────

export const ExperimentSchema = z.object({
  type: ExperimentTypeSchema,
  description: z.string().min(1, 'La descripción del experimento es obligatoria'),
  success_criterion: z.string().min(1, 'El criterio de éxito es obligatorio'),
  effort: EffortImpactSchema,
  impact: EffortImpactSchema,
  status: ExperimentStatusSchema,
  result: z.string().optional(),
})

export type ExperimentInput = z.infer<typeof ExperimentSchema>

/**
 * Schema for creating a new experiment (status defaults to 'to do', result omitted).
 */
export const ExperimentCreateSchema = z.object({
  type: ExperimentTypeSchema,
  description: z.string().min(1, 'La descripción del experimento es obligatoria'),
  successCriterion: z.string().min(1, 'El criterio de éxito es obligatorio'),
  effort: EffortImpactSchema,
  impact: EffortImpactSchema,
})

export type ExperimentCreateInput = z.infer<typeof ExperimentCreateSchema>

// ─── Assumption ──────────────────────────────────────────────────────────────

export const HypothesisSchema = z.object({
  description: z.string().min(1, 'La descripción del supuesto es obligatoria'),
  category: AssumptionCategorySchema,
  status: AssumptionStatusSchema,
  result: z.string().optional(),
})

export type HypothesisInput = z.infer<typeof HypothesisSchema>

/**
 * Schema for creating a new assumption (status defaults to 'pendiente').
 */
export const HypothesisCreateSchema = z.object({
  description: z.string().min(1, 'La descripción del supuesto es obligatoria'),
  category: AssumptionCategorySchema,
})

export type HypothesisCreateInput = z.infer<typeof HypothesisCreateSchema>

// ─── Business Context ────────────────────────────────────────────────────────

export const BusinessContextSchema = z.object({
  strategicChallenge: z.string().min(1, 'El reto estratégico es obligatorio'),
  northStar: z.string().optional(),
  targetSegment: z.string().optional(),
  keyConstraints: z.string().optional(),
})

export type BusinessContextInput = z.infer<typeof BusinessContextSchema>

/**
 * Schema for saving a single business context field.
 * strategicChallenge must be non-empty; other fields accept empty strings.
 */
export const BusinessContextFieldSchema = z.object({
  field: z.enum(['strategicChallenge', 'northStar', 'targetSegment', 'keyConstraints']),
  value: z.string(),
})

export type BusinessContextFieldInput = z.infer<typeof BusinessContextFieldSchema>

// ─── Priority Score Helper ───────────────────────────────────────────────────

const SCORE: Record<string, number> = { bajo: 1, medio: 2, alto: 3 }

/**
 * Calculate priority score: higher impact + lower effort = higher priority.
 * Returns SCORE[impact] / SCORE[effort].
 */
export function priorityScore(impact: string, effort: string): number {
  const impactVal = SCORE[impact]
  const effortVal = SCORE[effort]
  if (!impactVal || !effortVal) return 0
  return impactVal / effortVal
}
