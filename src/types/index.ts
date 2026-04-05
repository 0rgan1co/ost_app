// OST App — Complete Data Shapes
// All TypeScript interfaces for the UI data contracts.

// ─── Shared ──────────────────────────────────────────────────────────────────

export type ProjectRole = 'admin' | 'usuario' | 'viewer'

export type InviteStatus = 'idle' | 'loading' | 'success' | 'error'

export type OpportunityStatus = 'activa' | 'descartada'

export type EvidenceType = 'cita' | 'hecho' | 'observacion'

export type AssumptionCategory = 'deseabilidad' | 'viabilidad' | 'factibilidad' | 'usabilidad'

export type AssumptionStatus = 'pendiente' | 'validado' | 'invalidado'

export type ExperimentType =
  | 'entrevista'
  | 'prototipo'
  | 'smoke_test'
  | 'prueba_usabilidad'
  | 'otro'

export type ExperimentStatus = 'to do' | 'en curso' | 'terminada'

/**
 * Effort and impact values are enums, NOT numeric.
 * Priority score is calculated as: SCORE[impact] / SCORE[effort]
 * where SCORE = { bajo: 1, medio: 2, alto: 3 }
 */
export type EffortImpact = 'bajo' | 'medio' | 'alto'

export type MessageRole = 'user' | 'assistant'

// ─── Projects Section ─────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface ProjectMember extends User {
  role: ProjectRole
}

export interface Project {
  id: string
  name: string
  description: string
  isPublic: boolean
  currentUserRole: ProjectRole
  opportunityCount: number
  lastActivityAt: string // ISO date string
  members: ProjectMember[]
}

export interface InviteState {
  email: string
  role: ProjectRole
  status: InviteStatus
}

export interface AvailableUser {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export interface ProjectsProps {
  currentUser: User
  projects: Project[]
  roleOptions: ProjectRole[]

  /** Navigate to the OST Tree of the selected project */
  onSelectProject: (projectId: string) => void

  /** Create a new project with name and optional description. Returns project ID on success. */
  onCreateProject: (data: { name: string; description: string }) => Promise<string | false> | void

  /** Delete a project (admin only) */
  onDeleteProject: (projectId: string) => void

  /** Toggle project visibility between public and private */
  onToggleVisibility: (projectId: string, isPublic: boolean) => void

  /** Available users that can be added to projects */
  availableUsers: User[]

  /** Add a member to a project by userId and role (admin only) */
  onAddMember: (projectId: string, userId: string, role: ProjectRole) => void

  /** Invite a viewer by email — no account needed */
  onInviteViewer: (projectId: string, email: string) => Promise<boolean>

  /** Change the role of an existing member (admin only) */
  onChangeMemberRole: (projectId: string, memberId: string, role: ProjectRole) => void

  /** Remove a member from a project (admin only) */
  onRemoveMember: (projectId: string, memberId: string) => void
}

// ─── OST Tree Section ─────────────────────────────────────────────────────────

export interface OSTTreeProject {
  id: string
  name: string
}

export interface Opportunity {
  id: string
  title: string
  description: string
  status: OpportunityStatus
  isArchived: boolean
  isExpanded: boolean
  evidenceCount: number
  solutionCount: number
  experimentCount: number
  activeExperimentCount: number
  priorityImpact: EffortImpact | null
  priorityFrequency: EffortImpact | null
  priorityIntensity: EffortImpact | null
  priorityCapacity: EffortImpact | null
  isTarget: boolean
  createdAt: string
}

export interface OSTTreeEvidence {
  id: string
  type: EvidenceType
  content: string
  source: string
}

export interface SolutionSummary {
  id: string
  name: string
  assumptionCount: number
  experimentCount: number
}

export interface OSTTreeProps {
  project: OSTTreeProject
  opportunities: Opportunity[]
  recentEvidence: Record<string, OSTTreeEvidence[]>
  solutionsSummary: Record<string, SolutionSummary[]>
  onViewModeChange?: (mode: 'list' | 'tree') => void
  onSelectOpportunity?: (opportunityId: string) => void
  onCreateOpportunity?: () => void
  onChangeStatus?: (opportunityId: string, status: OpportunityStatus) => void
  onArchiveOpportunity?: (opportunityId: string) => void
  onNavigateToDetail?: (opportunityId: string) => void
}

// ─── Opportunity Detail Section ───────────────────────────────────────────────

export interface DetailProject {
  id: string
  name: string
}

export interface OpportunityDetail {
  id: string
  title: string
  description: string
  outcome: string
  status: OpportunityStatus
  priorityImpact: EffortImpact | null
  priorityFrequency: EffortImpact | null
  priorityIntensity: EffortImpact | null
  priorityCapacity: EffortImpact | null
  isTarget: boolean
  createdAt: string
}

export interface Evidence {
  id: string
  type: EvidenceType
  content: string
  source: string | null // required if type === 'cita'
  createdAt: string
}

export interface Experiment {
  id: string
  assumptionId: string
  type: ExperimentType
  description: string
  successCriterion: string // mandatory, defined before executing
  effort: EffortImpact
  impact: EffortImpact
  status: ExperimentStatus
  result: string | null // recorded when status becomes 'terminada'
  priorityScore: number // SCORE[impact] / SCORE[effort], calculated server-side
}

export interface Assumption {
  id: string
  solutionId: string
  description: string
  category: AssumptionCategory
  status: AssumptionStatus
  result: string | null // recorded when status changes to validado/invalidado
  experiments: Experiment[]
  createdAt: string
}

export interface Solution {
  id: string
  opportunityId: string
  name: string
  description: string
  assumptions: Assumption[]
  createdAt: string
}

export interface TopExperiment {
  experiment: Experiment
  assumptionDescription: string
  solutionName: string
  priorityScore: number
}

export interface OpportunityDetailProps {
  project: DetailProject
  opportunity: OpportunityDetail
  evidence: Evidence[]
  solutions: Solution[]
  topExperiments: TopExperiment[]
  onUpdateOpportunity?: (id: string, data: Partial<OpportunityDetail>) => void
  onAddEvidence?: (data: Omit<Evidence, 'id' | 'createdAt'>) => void
  onDeleteEvidence?: (id: string) => void
  onAddSolution?: (data: { name: string; description?: string }) => void
  onDeleteSolution?: (id: string) => void
  onAddAssumption?: (solutionId: string, data: { description: string; category: AssumptionCategory }) => void
  onChangeAssumptionStatus?: (id: string, status: AssumptionStatus, result?: string) => void
  onDeleteAssumption?: (id: string) => void
  onAddExperiment?: (
    assumptionId: string,
    data: Omit<Experiment, 'id' | 'assumptionId' | 'priorityScore' | 'result' | 'status'>
  ) => void
  onChangeExperimentStatus?: (id: string, status: ExperimentStatus, result?: string) => void
  onUpdatePriority?: (field: string, value: EffortImpact) => void
  onToggleTarget?: () => void
  onNavigateToAIEvaluation?: (opportunityId: string) => void
  onNavigateBack?: () => void
}

// ─── AI Evaluation Section ────────────────────────────────────────────────────

export interface AIEvalProject {
  id: string
  name: string
}

export interface AIEvalOpportunity {
  id: string
  title: string
  status: OpportunityStatus
}

export interface EvaluationSection {
  title: string
  content: string
}

export interface AIEvaluation {
  id: string
  opportunityId: string
  createdAt: string
  model: string // e.g. 'claude-sonnet-4-6'
  sections: EvaluationSection[] // Fortalezas, Brechas, Recomendaciones, Experimentos sugeridos
  rawText: string
}

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  hasSuggestion?: boolean
  suggestionSummary?: string
  createdAt: string
}

export interface AIEvaluationProps {
  project: AIEvalProject
  opportunity: AIEvalOpportunity
  evaluations: AIEvaluation[]
  conversation: ConversationMessage[]
  isEvaluating?: boolean
  isSendingMessage?: boolean
  onEvaluate?: (opportunityId: string) => void
  onSendMessage?: (message: string) => void
  onApplySuggestion?: (messageId: string) => import('../lib/parse-suggestion').SuggestionAction[]
  onExecuteActions?: (actions: import('../lib/parse-suggestion').SuggestionAction[]) => Promise<number>
  onNavigateBack?: () => void
}

// ─── Business Context Section ─────────────────────────────────────────────────

export interface BizContextProject {
  id: string
  name: string
}

export interface ContextField {
  value: string
  updatedAt: string | null
}

export interface BusinessContext {
  strategicChallenge: ContextField // What strategic challenge to tackle
  northStar: ContextField          // Strategic north star / 12-month outcome
  targetSegment: ContextField      // Target user: jobs, pains, gains
  keyConstraints: ContextField     // Technical, regulatory, business constraints
}

export interface BusinessContextProps {
  project: BizContextProject
  context: BusinessContext
  isSaving?: boolean
  onSaveField?: (field: keyof BusinessContext, value: string) => void
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
}

export interface NavItem {
  label: string
  href: string
  isActive?: boolean
}

export interface AppShellUser {
  name: string
  avatarUrl?: string
}

export interface AppShellProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
  user?: AppShellUser
  onNavigate?: (href: string) => void
  onLogout?: () => void
  onNavigateToProjects?: () => void
}
