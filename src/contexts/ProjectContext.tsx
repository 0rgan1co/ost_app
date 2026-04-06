import { createContext, useContext, useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { Project } from '../types'

interface ProjectContextValue {
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
}

const ProjectCtx = createContext<ProjectContextValue>({
  currentProject: null,
  setCurrentProject: () => {},
})

/**
 * Hook to access the current project.
 * Tries outlet context first (when under ProjectLayout), falls back to ProjectContext state.
 */
export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectCtx)

  // Try outlet context (available when nested under ProjectLayout)
  try {
    const outlet = useOutletContext<{ project: Project } | null>()
    if (outlet?.project) {
      return { currentProject: outlet.project, setCurrentProject: ctx.setCurrentProject }
    }
  } catch {
    // Not inside an Outlet — use context state
  }

  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  return (
    <ProjectCtx.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectCtx.Provider>
  )
}
