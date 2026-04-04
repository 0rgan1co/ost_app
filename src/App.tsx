import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider, useProject } from './contexts/ProjectContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthGuard } from './components/AuthGuard'
import { ShellWrapper } from './components/ShellWrapper'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { OSTTreeSection } from './sections/ost-tree/OSTTreeSection'
import { OpportunityDetailView } from './sections/opportunity-detail/OpportunityDetailView'
import { AIEvaluationView } from './sections/ai-evaluation/AIEvaluationView'
import { BusinessContextView } from './sections/business-context/BusinessContextView'
import { useOpportunityDetail } from './hooks/use-opportunity-detail'
import { useAIEvaluation } from './hooks/use-ai-evaluation'
import { useBusinessContext } from './hooks/use-business-context'
import { ProjectSelector } from './components/ProjectSelector'
import { SettingsPage } from './pages/SettingsPage'

const Stub = ({ label }: { label: string }) => (
  <div className="p-4 sm:p-8 text-slate-400 font-sans">{label} — coming soon</div>
)

function OSTTreePage() {
  const { currentProject } = useProject()

  if (!currentProject) {
    return <ProjectSelector sectionLabel="el árbol OST" />
  }

  return <OSTTreeSection project={currentProject} />
}

function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    project, opportunity, evidence, hypotheses, topExperiments,
    updateOpportunity, addEvidence, deleteEvidence,
    addHypothesis, changeHypothesisStatus, deleteHypothesis,
    addExperiment, changeExperimentStatus,
  } = useOpportunityDetail(id ?? '')

  if (!opportunity || !project) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <OpportunityDetailView
      project={project}
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
      onNavigateToAIEvaluation={(oppId) => navigate(`/ai-evaluation/${oppId}`)}
      onNavigateBack={() => navigate('/ost-tree')}
    />
  )
}

function AIEvaluationPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const navigate = useNavigate()
  const { currentProject } = useProject()
  const {
    evaluations, conversation, isEvaluating, isSendingMessage,
    evaluate, sendMessage, applySuggestion,
  } = useAIEvaluation(opportunityId ?? '', currentProject?.id ?? '')

  // Load opportunity data for the left column
  const {
    opportunity, evidence, hypotheses, topExperiments,
  } = useOpportunityDetail(opportunityId ?? '')

  if (!currentProject || !opportunityId) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <AIEvaluationView
      project={{ id: currentProject.id, name: currentProject.name }}
      opportunity={{ id: opportunityId, title: opportunity?.title ?? '', status: opportunity?.status ?? 'activa' }}
      evaluations={evaluations}
      conversation={conversation}
      isEvaluating={isEvaluating}
      isSendingMessage={isSendingMessage}
      onEvaluate={evaluate}
      onSendMessage={sendMessage}
      onApplySuggestion={applySuggestion}
      onNavigateBack={() => navigate(`/opportunity/${opportunityId}`)}
      ostSummary={{
        evidenceCount: evidence.length,
        hypotheses: hypotheses.map(h => ({
          description: h.description,
          status: h.status,
          experimentCount: h.experiments.length,
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

function BusinessContextPage() {
  const { currentProject } = useProject()
  const { context, isSaving, saveField } = useBusinessContext(currentProject?.id ?? '')

  if (!currentProject) {
    return <ProjectSelector sectionLabel="Business Context" />
  }

  return (
    <BusinessContextView
      project={{ id: currentProject.id, name: currentProject.name }}
      context={context}
      isSaving={isSaving}
      onSaveField={saveField}
    />
  )
}

export function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ProjectProvider>
      <BrowserRouter basename="/ost_app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <ShellWrapper><ProjectsPage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/ost-tree"
            element={
              <AuthGuard>
                <ShellWrapper><OSTTreePage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/opportunity/:id"
            element={
              <AuthGuard>
                <ShellWrapper><OpportunityDetailPage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/ai-evaluation/:opportunityId"
            element={
              <AuthGuard>
                <ShellWrapper><AIEvaluationPage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/business-context"
            element={
              <AuthGuard>
                <ShellWrapper><BusinessContextPage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <ShellWrapper><SettingsPage /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/help"
            element={
              <AuthGuard>
                <ShellWrapper><Stub label="Help" /></ShellWrapper>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
