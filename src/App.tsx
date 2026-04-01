import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider, useProject } from './contexts/ProjectContext'
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

const Stub = ({ label }: { label: string }) => (
  <div className="p-8 text-slate-400 font-sans">{label} — coming soon</div>
)

function OSTTreePage() {
  const { currentProject } = useProject()

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <p className="text-slate-300 font-[Nunito_Sans] font-semibold text-sm mb-1">
          Ningún proyecto seleccionado
        </p>
        <p className="text-slate-500 font-[Nunito_Sans] text-xs">
          Selecciona un proyecto desde la sección Proyectos para ver su árbol OST.
        </p>
      </div>
    )
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

  if (!currentProject || !opportunityId) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <AIEvaluationView
      project={{ id: currentProject.id, name: currentProject.name }}
      opportunity={{ id: opportunityId, title: '', status: 'activa' }}
      evaluations={evaluations}
      conversation={conversation}
      isEvaluating={isEvaluating}
      isSendingMessage={isSendingMessage}
      onEvaluate={evaluate}
      onSendMessage={sendMessage}
      onApplySuggestion={applySuggestion}
      onNavigateBack={() => navigate(`/opportunity/${opportunityId}`)}
    />
  )
}

function BusinessContextPage() {
  const { currentProject } = useProject()
  const { context, isSaving, saveField } = useBusinessContext(currentProject?.id ?? '')

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <p className="text-slate-300 font-[Nunito_Sans] font-semibold text-sm mb-1">
          Ningún proyecto seleccionado
        </p>
        <p className="text-slate-500 font-[Nunito_Sans] text-xs">
          Selecciona un proyecto desde la sección Proyectos.
        </p>
      </div>
    )
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
                <ShellWrapper><Stub label="Settings" /></ShellWrapper>
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
  )
}

export default App
