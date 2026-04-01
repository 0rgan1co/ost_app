import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { AuthGuard } from './components/AuthGuard'
import { ShellWrapper } from './components/ShellWrapper'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'

const Stub = ({ label }: { label: string }) => (
  <div className="p-8 text-slate-400 font-sans">{label} — coming soon</div>
)

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
                <ShellWrapper><Stub label="OST Tree" /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/opportunity/:id"
            element={
              <AuthGuard>
                <ShellWrapper><Stub label="Opportunity Detail" /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/ai-evaluation/:opportunityId"
            element={
              <AuthGuard>
                <ShellWrapper><Stub label="AI Evaluation" /></ShellWrapper>
              </AuthGuard>
            }
          />
          <Route
            path="/business-context"
            element={
              <AuthGuard>
                <ShellWrapper><Stub label="Business Context" /></ShellWrapper>
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
