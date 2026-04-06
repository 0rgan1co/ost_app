import { useOutletContext } from 'react-router-dom'
import type { Project } from '../types'

interface ProjectOutletContext {
  project: Project
}

/**
 * Hook that exposes the current project from ProjectLayout's outlet context.
 * Pages nested under /projects/:projectId/* can use this to access the project.
 */
export function useProject() {
  const ctx = useOutletContext<ProjectOutletContext | null>()
  return { currentProject: ctx?.project ?? null }
}
