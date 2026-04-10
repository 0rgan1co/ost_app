import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { AuthGuard } from './components/AuthGuard'
import { ShellWrapper } from './components/ShellWrapper'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectLayout, useProjectFromRoute } from './layouts/ProjectLayout'
import { OSTTreeSection } from './sections/ost-tree/OSTTreeSection'
import { OpportunityDetailView } from './sections/opportunity-detail/OpportunityDetailView'
import { AIEvaluationView } from './sections/ai-evaluation/AIEvaluationView'
// BusinessContextView now used inside BusinessContextPage
import { useOpportunityDetail } from './hooks/use-opportunity-detail'
import { useAIEvaluation } from './hooks/use-ai-evaluation'
import { supabase } from './lib/supabase'
import { SettingsPage } from './pages/SettingsPage'
import { ExperimentsPage } from './pages/ExperimentsPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { AIEvaluationSelectPage } from './pages/AIEvaluationSelectPage'
import { BusinessContextPage } from './pages/BusinessContextPage'
import { InviteAcceptPage } from './pages/InviteAcceptPage'

const Stub = ({ label }: { label: string }) => (
  <div className="p-4 sm:p-8 text-slate-500 dark:text-slate-400 font-sans">{label} — coming soon</div>
)

function OSTTreePage() {
  const { project } = useProjectFromRoute()
  return <OSTTreeSection project={project} />
}

function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useProjectFromRoute()
  const navigate = useNavigate()
  const {
    opportunity, evidence, solutions, topExperiments,
    updateOpportunity, addEvidence, deleteEvidence,
    addSolution, deleteSolution,
    addAssumption, changeAssumptionStatus, deleteAssumption,
    addExperiment, changeExperimentStatus,
    updatePriority, toggleTarget,
  } = useOpportunityDetail(id ?? '')

  if (!opportunity) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  }

  return (
    <OpportunityDetailView
      project={{ id: project.id, name: project.name }}
      opportunity={opportunity}
      evidence={evidence}
      solutions={solutions}
      topExperiments={topExperiments}
      onUpdateOpportunity={updateOpportunity}
      onAddEvidence={addEvidence}
      onDeleteEvidence={deleteEvidence}
      onAddSolution={addSolution}
      onDeleteSolution={deleteSolution}
      onAddAssumption={addAssumption}
      onChangeAssumptionStatus={changeAssumptionStatus}
      onDeleteAssumption={deleteAssumption}
      onAddExperiment={addExperiment}
      onChangeExperimentStatus={changeExperimentStatus}
      onUpdatePriority={(field, value) => updatePriority(field, value)}
      onToggleTarget={() => toggleTarget()}
      onNavigateToAIEvaluation={(oppId) => navigate(`/projects/${project.id}/ai-evaluation/${oppId}`)}
      onNavigateBack={() => navigate(`/projects/${project.id}/ost-tree`)}
    />
  )
}

function AIEvaluationPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { project } = useProjectFromRoute()
  const navigate = useNavigate()
  const [oppTitle, setOppTitle] = useState('')
  const {
    evaluations, conversation, isEvaluating, isSendingMessage,
    evaluate, sendMessage, applySuggestion, executeActions,
  } = useAIEvaluation(opportunityId ?? '', project.id)

  // Load opportunity data for the left column
  const {
    opportunity, evidence, solutions, topExperiments,
  } = useOpportunityDetail(opportunityId ?? '')

  useEffect(() => {
    if (!opportunityId) return
    supabase
      .from('opportunities')
      .select('name')
      .eq('id', opportunityId)
      .single()
      .then(({ data }) => { if (data) setOppTitle(data.name) })
  }, [opportunityId])

  if (!opportunityId) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />
  }

  return (
    <AIEvaluationView
      project={{ id: project.id, name: project.name }}
      opportunity={{ id: opportunityId, title: opportunity?.title ?? oppTitle, status: opportunity?.status ?? 'activa' }}
      evaluations={evaluations}
      conversation={conversation}
      isEvaluating={isEvaluating}
      isSendingMessage={isSendingMessage}
      onEvaluate={evaluate}
      onSendMessage={sendMessage}
      onApplySuggestion={applySuggestion}
      onExecuteActions={executeActions}
      onNavigateBack={() => navigate(`/projects/${project.id}/opportunity/${opportunityId}`)}
      ostSummary={{
        evidenceCount: evidence.length,
        solutions: solutions.map(s => ({
          name: s.name,
          assumptionCount: s.assumptions.length,
          experimentCount: s.assumptions.reduce((sum, a) => sum + a.experiments.length, 0),
        })),
        topExperiments: topExperiments.map(t => ({
          description: t.experiment.description,
          type: t.experiment.type,
          score: t.priorityScore,
        })),
      }}
    />
  )
}

// BusinessContextPage is now imported from pages/BusinessContextPage.tsx

function ProjectIndexRedirect() {
  const { projectId } = useParams<{ projectId: string }>()
  return <Navigate to={`/projects/${projectId}/ost-tree`} replace />
}

export function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <ProjectProvider>
      <BrowserRouter basename="/ost_app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="/" element={<Navigate to="/projects" replace />} />

          {/* Projects list */}
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <ShellWrapper><ProjectsPage /></ShellWrapper>
              </AuthGuard>
            }
          />

          {/* Project-scoped routes */}
          <Route
            path="/projects/:projectId"
            element={
              <AuthGuard>
                <ShellWrapper>
                  <ProjectLayout />
                </ShellWrapper>
              </AuthGuard>
            }
          >
            <Route index element={<ProjectIndexRedirect />} />
            <Route path="ost-tree" element={<OSTTreePage />} />
            <Route path="opportunity/:id" element={<OpportunityDetailPage />} />
            <Route path="ai-evaluation/:opportunityId" element={<AIEvaluationPage />} />
            <Route path="business-context" element={<BusinessContextPage />} />
            <Route path="experiments" element={<ExperimentsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="ai-evaluation" element={<AIEvaluationSelectPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Top-level non-project routes */}
          <Route
            path="/help"
            element={
              <AuthGuard>
                <ShellWrapper><Stub label="Help" /></ShellWrapper>
              </AuthGuard>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
