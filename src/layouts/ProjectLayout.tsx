import { useEffect, useState } from 'react'
import { Outlet, useOutletContext, useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Project, ProjectRole } from '../types'

interface ProjectOutletContext {
  project: Project
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!projectId || !user) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setUnauthorized(false)
      setNotFound(false)

      // 1. Verify membership
      const { data: membership, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user!.id)
        .maybeSingle()

      if (cancelled) return

      if (memberError || !membership) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      // 2. Fetch project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, is_public, tags, last_activity_at, created_at')
        .eq('id', projectId)
        .single()

      if (cancelled) return

      if (projectError || !projectData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const built: Project = {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description ?? '',
        isPublic: projectData.is_public ?? false,
        currentUserRole: membership.role as ProjectRole,
        opportunityCount: 0,
        lastActivityAt: projectData.last_activity_at ?? projectData.created_at,
        members: [],
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
      }

      setProject(built)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [projectId, user])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 text-sm font-['IBM_Plex_Mono']">Cargando proyecto...</div>
      </div>
    )
  }

  // Unauthorized
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-[Nunito_Sans] font-semibold text-sm">
            No tienes acceso a este proyecto
          </p>
          <Link
            to="/projects"
            className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Volver a Proyectos
          </Link>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-700 dark:text-slate-300 font-[Nunito_Sans] font-semibold text-sm">
            Proyecto no encontrado
          </p>
          <Link
            to="/projects"
            className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Volver a Proyectos
          </Link>
        </div>
      </div>
    )
  }

  return <Outlet context={{ project } satisfies ProjectOutletContext} />
}

export function useProjectFromRoute() {
  return useOutletContext<ProjectOutletContext>()
}
