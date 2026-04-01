import { createContext, useContext, useState } from 'react'
import type { Project } from '../types'

interface ProjectContextValue {
  currentProject: Project | null
  setCurrentProject: (p: Project | null) => void
}

const ProjectContext = createContext<ProjectContextValue>({
  currentProject: null,
  setCurrentProject: () => {},
})

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
