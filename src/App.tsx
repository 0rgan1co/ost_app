import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { ShellWrapper } from './components/ShellWrapper'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectLayout, useProjectFromRoute } from './layouts/ProjectLayout'
import { OSTTreeSection } from './sections/ost-tree/OSTTreeSection'
import { OpportunityDetailView } from './sections/opportunity-detail/OpportunityDetailView'
import { AIEvaluationView } from './sections/ai-evaluation/AIEvaluationView'
import { BusinessContextView } from './sections/business-context/BusinessContextView'
import { useOpportunityDetail } from './hooks/use-opportunity-detail'
import { useAIEvaluation } from './hooks/use-ai-evaluation'
import { useBusinessContext } from './hooks/use-business-context'
import { supabase } from './lib/supabase'

const Stub = ({ label }: { label: string }) => (
  <div className="p-8 text-slate-400 font-sans">{label} — coming soon</div>
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
    opportunity, evidence, hypotheses, topExperiments,
    updateOpportunity, addEvidence, deleteEvidence,
    addHypothesis, changeHypothesisStatus, deleteHypothesis,
    addExperiment, changeExperimentStatus,
  } = useOpportunityDetail(id ?? '')

  if (!opportunity) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <OpportunityDetailView
      project={{ id: project.id, name: project.name }}
      opportunity={opportunity}
      evidence={evidence}
      hypotheses={hypotheses}
      topExperiments={topExperiments}
      onUpdateOpportunity={updateOpportunity}
      onAddEvidence={addEvidence}
      onDeleteEvidence={deleteEvidence}
      onAddHypothesis={addHypothesis}
      onChangeHypothesisStatus={changeHypothesisStatus}
      onDeleteHypothesis={deleteHypothesis}
      onAddExperiment={addExperiment}
      onChangeExperimentStatus={changeExperimentStatus}
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
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <AIEvaluationView
      project={{ id: project.id, name: project.name }}
      opportunity={{ id: opportunityId, title: oppTitle, status: 'activa' }}
      evaluations={evaluations}
      conversation={conversation}
      isEvaluating={isEvaluating}
      isSendingMessage={isSendingMessage}
      onEvaluate={evaluate}
      onSendMessage={sendMessage}
      onApplySuggestion={applySuggestion}
      onExecuteActions={executeActions}
      onNavigateBack={() => navigate(`/projects/${project.id}/opportunity/${opportunityId}`)}
    />
  )
}

function BusinessContextPage() {
  const { project } = useProjectFromRoute()
  const { context, isSaving, saveField } = useBusinessContext(project.id)

  return (
    <BusinessContextView
      project={{ id: project.id, name: project.name }}
      context={context}
      isSaving={isSaving}
      onSaveField={saveField}
    />
  )
}

function ProjectIndexRedirect() {
  const { projectId } = useParams<{ projectId: string }>()
  return <Navigate to={`/projects/${projectId}/ost-tree`} replace />
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/ost_app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="settings" element={<Stub label="Settings" />} />
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
    </AuthProvider>
  )
}

export default App
