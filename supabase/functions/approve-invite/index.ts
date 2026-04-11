import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectInvite {
  id: string
  project_id: string
  token: string
  claimed_by: string | null
  claimed_email: string | null
  approved_at: string | null
  rejected_at: string | null
  expires_at: string
  created_by: string
  role: string
}

interface Project {
  id: string
  name: string
}

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

const APP_URL = 'https://zejoaoeotrqanunzypmp.supabase.co'

function htmlPage(opts: {
  success: boolean
  title: string
  message: string
  detail?: string
  redirectUrl?: string
}): Response {
  const { success, title, message, detail, redirectUrl } = opts

  const icon = success
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-success"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-error"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`

  const redirectScript = redirectUrl
    ? `<script>setTimeout(function(){ window.location.href = ${JSON.stringify(redirectUrl)}; }, 3000);</script>`
    : ''

  const redirectNote = redirectUrl
    ? `<p class="redirect-note">Redirigiendo en 3 segundos…</p>`
    : ''

  const detailHtml = detail ? `<p class="detail">${detail}</p>` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — OST App</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background-color: #020617; /* slate-950 */
        color: #e2e8f0; /* slate-200 */
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
      }

      .card {
        background-color: #0f172a; /* slate-900 */
        border: 1px solid #1e293b; /* slate-800 */
        border-radius: 0.75rem;
        padding: 2.5rem 2rem;
        max-width: 440px;
        width: 100%;
        text-align: center;
        box-shadow: 0 4px 32px rgba(0,0,0,0.5);
      }

      .icon {
        width: 3rem;
        height: 3rem;
        margin: 0 auto 1.25rem;
        display: block;
      }

      .icon-success { color: #22c55e; /* green-500 */ }
      .icon-error   { color: #ef4444; /* red-500 */   }

      h1 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #f1f5f9; /* slate-100 */
        margin-bottom: 0.75rem;
        line-height: 1.3;
      }

      p {
        font-size: 0.9375rem;
        color: #94a3b8; /* slate-400 */
        line-height: 1.6;
      }

      .detail {
        font-size: 0.8125rem;
        font-family: 'IBM Plex Mono', 'Courier New', monospace;
        background-color: #1e293b; /* slate-800 */
        color: #94a3b8;
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
        margin-top: 1rem;
        word-break: break-word;
      }

      .redirect-note {
        font-size: 0.8125rem;
        color: #475569; /* slate-600 */
        margin-top: 1.5rem;
      }

      .brand {
        margin-top: 2rem;
        font-size: 0.75rem;
        color: #334155; /* slate-700 */
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
    </style>
    ${redirectScript}
  </head>
  <body>
    <div class="card">
      ${icon}
      <h1>${title}</h1>
      <p>${message}</p>
      ${detailHtml}
      ${redirectNote}
      <p class="brand">OST App</p>
    </div>
  </body>
</html>`

  return new Response(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
}

function errorPage(message: string, detail?: string): Response {
  return htmlPage({ success: false, title: 'No se pudo aprobar', message, detail })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // This endpoint is opened directly in a browser via GET — no CORS preflight needed.
  // We only accept GET requests.
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // ── Parse query parameters ─────────────────────────────────────────────
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const secret = url.searchParams.get('secret')

    if (!id || !secret) {
      return errorPage(
        'El enlace de aprobación es inválido o está incompleto.',
        'Faltan los parámetros "id" o "secret".'
      )
    }

    // ── Build Supabase admin client ────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('approve-invite: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return errorPage('Error de configuración del servidor.', 'Variables de entorno faltantes.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // ── Fetch the invite row ───────────────────────────────────────────────
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from('project_invites')
      .select('id, project_id, token, claimed_by, claimed_email, approved_at, rejected_at, expires_at, created_by, role')
      .eq('id', id)
      .eq('token', secret)
      .maybeSingle()

    if (inviteError) {
      console.error('approve-invite: db error fetching invite', inviteError)
      return errorPage('Error al consultar la invitación.', inviteError.message)
    }

    if (!inviteData) {
      return errorPage(
        'Invitación no encontrada.',
        'El enlace puede ser incorrecto o ya fue eliminado.'
      )
    }

    const invite = inviteData as ProjectInvite

    // ── Validate invite state ──────────────────────────────────────────────
    if (invite.approved_at !== null) {
      return errorPage(
        'Esta invitación ya fue aprobada anteriormente.',
        `Aprobada el ${new Date(invite.approved_at).toLocaleString('es-AR')}.`
      )
    }

    if (invite.rejected_at !== null) {
      return errorPage(
        'Esta invitación fue rechazada y ya no es válida.',
        `Rechazada el ${new Date(invite.rejected_at).toLocaleString('es-AR')}.`
      )
    }

    if (new Date(invite.expires_at) < new Date()) {
      return errorPage(
        'Este enlace de invitación ha expirado.',
        `Venció el ${new Date(invite.expires_at).toLocaleString('es-AR')}.`
      )
    }

    if (!invite.claimed_email) {
      return errorPage(
        'La invitación aún no ha sido reclamada por ningún usuario.',
        'El usuario debe registrarse primero antes de que puedas aprobar su acceso.'
      )
    }

    // ── Fetch project name for the success message ─────────────────────────
    const { data: projectData } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', invite.project_id)
      .maybeSingle()

    const projectName = (projectData as Project | null)?.name ?? 'el proyecto'

    // ── 1. Upsert into allowed_users ───────────────────────────────────────
    const { error: allowedError } = await supabaseAdmin
      .from('allowed_users')
      .upsert({ email: invite.claimed_email }, { onConflict: 'email' })

    if (allowedError) {
      console.error('approve-invite: failed to upsert allowed_users', allowedError)
      return errorPage('Error al dar acceso al usuario.', allowedError.message)
    }

    // ── 2. Insert into project_members (ignore duplicate) ──────────────────
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        email: invite.claimed_email,
        role: invite.role,
      })

    if (memberError && memberError.code !== '23505') {
      console.error('approve-invite: failed to insert project_members', memberError)
      return errorPage('Error al agregar al usuario al proyecto.', memberError.message)
    }

    // ── 3. Mark invite as approved ─────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('project_invites')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: invite.created_by,
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('approve-invite: failed to update invite approved_at', updateError)
      return errorPage('El usuario fue agregado pero no se pudo marcar la invitación como aprobada.', updateError.message)
    }

    // ── Success ────────────────────────────────────────────────────────────
    return htmlPage({
      success: true,
      title: 'Solicitud aprobada',
      message: `<strong style="color:#f1f5f9">${invite.claimed_email}</strong> ahora es miembro de <strong style="color:#f1f5f9">${projectName}</strong>.`,
      redirectUrl: APP_URL,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('approve-invite: unhandled error', err)
    return errorPage('Ocurrió un error inesperado.', msg)
  }
})
