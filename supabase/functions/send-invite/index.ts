import { corsHeaders } from '../_shared/cors.ts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaimNotificationBody {
  type: 'claim-notification'
  adminEmail: string
  adminName: string
  claimantEmail: string
  claimantName: string
  projectName: string
  role: string
  approveUrl: string
}

type RequestBody = ClaimNotificationBody

// ─── Constants ───────────────────────────────────────────────────────────────

const SENDER_EMAIL = 'hola@historiasconimpacto.com'
const SENDER_NAME = 'OST App'
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
  viewer: 'Solo lectura',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ─── Email builders ───────────────────────────────────────────────────────────

function buildClaimNotificationHtml(
  claimantName: string,
  claimantEmail: string,
  projectName: string,
  roleLabel: string,
  approveUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitud de acceso — OST App</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #cbd5e1;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #020617; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-family: 'Courier New', 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #ef4444; background-color: #1e1e2e; padding: 4px 10px; border-radius: 4px; display: inline-block;">OST App</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9; line-height: 1.3;">
                      Nueva solicitud de acceso
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 0 28px 0;">
              <hr style="border: none; border-top: 1px solid #1e293b; margin: 0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #0f172a; border-radius: 12px; padding: 28px 32px;">

              <!-- Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${claimantName}</strong> quiere unirse al proyecto
                <strong style="color: #f1f5f9;">${projectName}</strong> como
              </p>

              <!-- Role badge -->
              <p style="margin: 0 0 28px 0;">
                <span style="font-family: 'Courier New', 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; color: #ef4444; background-color: #1c0a0a; border: 1px solid #7f1d1d; padding: 5px 12px; border-radius: 6px; display: inline-block;">${roleLabel}</span>
              </p>

              <!-- Claimant email -->
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #64748b;">
                Email registrado:
                <span style="font-family: 'Courier New', 'IBM Plex Mono', monospace; color: #94a3b8;">${claimantEmail}</span>
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td style="background-color: #ef4444; border-radius: 8px;">
                    <a href="${approveUrl}"
                       style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.01em;">
                      Aprobar solicitud
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary text -->
              <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                Si no reconocés esta solicitud, podés ignorar este email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 0 0 0;">
              <p style="margin: 0; font-size: 12px; color: #334155; text-align: center; font-family: 'Courier New', 'IBM Plex Mono', monospace; letter-spacing: 0.05em;">
                Este email fue enviado automáticamente por OST App
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Email senders ────────────────────────────────────────────────────────────

async function sendClaimNotification(
  brevoApiKey: string,
  body: ClaimNotificationBody
): Promise<void> {
  const { adminEmail, adminName, claimantEmail, claimantName, projectName, role, approveUrl } = body

  const roleLabel = ROLE_LABELS[role] ?? role
  const html = buildClaimNotificationHtml(claimantName, claimantEmail, projectName, roleLabel, approveUrl)

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: adminEmail, name: adminName }],
      subject: `${claimantName} quiere unirse a ${projectName}`,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Brevo API error (${res.status}): ${errBody}`)
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      return errorResponse('Missing BREVO_API_KEY secret', 500)
    }

    const body = await req.json() as RequestBody

    if (!body.type) {
      return errorResponse('Missing required field: type', 400)
    }

    switch (body.type) {
      case 'claim-notification': {
        const { adminEmail, adminName, claimantEmail, claimantName, projectName, role, approveUrl } = body

        if (!adminEmail || !adminName || !claimantEmail || !claimantName || !projectName || !role || !approveUrl) {
          return errorResponse(
            'Missing required fields for claim-notification: adminEmail, adminName, claimantEmail, claimantName, projectName, role, approveUrl',
            400
          )
        }

        await sendClaimNotification(brevoApiKey, body)
        return jsonResponse({ success: true })
      }

      default:
        return errorResponse(`Unknown type: ${(body as RequestBody).type}`, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('send-invite error:', err)
    return errorResponse(message, 500)
  }
})
