import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RequestBody {
  action: 'evaluate' | 'send-message'
  opportunityId: string
  projectId: string
  message?: string
  evaluationId?: string
}

interface DBOpportunity {
  id: string
  name: string
  description: string | null
  outcome: string | null
}

interface DBEvidence {
  id: string
  type: string
  content: string
  source: string | null
}

interface DBHypothesis {
  id: string
  description: string
  status: string
  result: string | null
}

interface DBExperiment {
  id: string
  hypothesis_id: string
  type: string
  description: string
  success_criterion: string
  effort: string
  impact: string
  status: string
  result: string | null
}

interface DBBusinessContext {
  content: string
}

interface ParsedBusinessContext {
  northStar: string
  targetSegment: string
  keyConstraints: string
}

interface DBEvaluation {
  id: string
  opportunity_id: string
  prompt_snapshot: string
  evaluation_text: string
  created_at: string
}

interface DBMessage {
  id: string
  evaluation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code: 'ERROR', message } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function callAnthropic(
  apiKey: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  system?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model: AI_MODEL,
    max_tokens: maxTokens,
    messages,
  }
  if (system) {
    body.system = system
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${errBody}`)
  }

  const result = await response.json()
  const textBlock = result.content?.find((b: { type: string }) => b.type === 'text')
  return textBlock?.text ?? ''
}

// ─── Prompt builder (server-side) ────────────────────────────────────────────

async function buildEvaluationPrompt(
  supabaseAdmin: ReturnType<typeof createClient>,
  opportunityId: string,
  projectId: string
): Promise<string> {
  // Fetch all required data in parallel
  const [
    { data: oppData },
    { data: evidenceData },
    { data: hypothesesData },
    { data: contextData },
  ] = await Promise.all([
    supabaseAdmin
      .from('opportunities')
      .select('id, name, description, outcome')
      .eq('id', opportunityId)
      .single(),
    supabaseAdmin
      .from('opportunity_evidence')
      .select('id, type, content, source')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('hypotheses')
      .select('id, description, status, result')
      .eq('opportunity_id', opportunityId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('business_context')
      .select('content')
      .eq('project_id', projectId)
      .single(),
  ])

  const opp = oppData as DBOpportunity | null
  const evidence = (evidenceData ?? []) as DBEvidence[]
  const hypotheses = (hypothesesData ?? []) as DBHypothesis[]

  // Parse business context
  let bizContext: ParsedBusinessContext = {
    northStar: 'No definido',
    targetSegment: 'No definido',
    keyConstraints: 'No definido',
  }
  if (contextData?.content) {
    try {
      bizContext = JSON.parse(contextData.content) as ParsedBusinessContext
    } catch {
      // Use defaults if parse fails
    }
  }

  // Fetch experiments for each hypothesis
  const hypothesisIds = hypotheses.map(h => h.id)
  let experiments: DBExperiment[] = []
  if (hypothesisIds.length > 0) {
    const { data: expData } = await supabaseAdmin
      .from('experiments')
      .select('id, hypothesis_id, type, description, success_criterion, effort, impact, status, result')
      .in('hypothesis_id', hypothesisIds)
      .order('created_at', { ascending: true })
    experiments = (expData ?? []) as DBExperiment[]
  }

  // Map experiments by hypothesis
  const expByHypothesis = new Map<string, DBExperiment[]>()
  experiments.forEach(exp => {
    const list = expByHypothesis.get(exp.hypothesis_id) ?? []
    list.push(exp)
    expByHypothesis.set(exp.hypothesis_id, list)
  })

  // Build prompt sections
  const evidenceText =
    evidence.length === 0
      ? '  (sin evidencia registrada)'
      : evidence
          .map(e => `  - [${e.type}] ${e.content}${e.source ? ` (fuente: ${e.source})` : ''}`)
          .join('\n')

  const hypothesesText =
    hypotheses.length === 0
      ? '  (sin hipótesis registradas)'
      : hypotheses
          .map(h => {
            const exps = expByHypothesis.get(h.id) ?? []
            const expsText =
              exps.length === 0
                ? '    (sin experimentos)'
                : exps
                    .map(
                      e =>
                        `    - [${e.type}] ${e.description} | criterio: ${e.success_criterion} | esfuerzo: ${e.effort} | impacto: ${e.impact} | estado: ${e.status}${e.result ? ` | resultado: ${e.result}` : ''}`
                    )
                    .join('\n')
            return `  - Hipótesis: ${h.description} (${h.status})${h.result ? ` → resultado: ${h.result}` : ''}\n${expsText}`
          })
          .join('\n')

  return `Eres un experto en product discovery usando el Opportunity Solution Tree (OST) de Teresa Torres.

Analiza la siguiente oportunidad y proporciona una evaluación estructurada.

## Contexto de negocio del proyecto

- North Star: ${bizContext.northStar}
- Segmento objetivo: ${bizContext.targetSegment}
- Restricciones clave: ${bizContext.keyConstraints}

## Oportunidad a evaluar

- Nombre: ${opp?.name ?? 'Sin nombre'}
- Descripción: ${opp?.description ?? 'Sin descripción'}
- Outcome esperado: ${opp?.outcome ?? 'No especificado'}

## Evidencia recopilada

${evidenceText}

## Hipótesis y experimentos

${hypothesesText}

## Instrucciones de respuesta

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto adicional) con esta estructura exacta:
{
  "sections": [
    { "title": "Fortalezas", "content": "..." },
    { "title": "Brechas", "content": "..." },
    { "title": "Recomendaciones", "content": "..." },
    { "title": "Experimentos sugeridos", "content": "..." }
  ]
}

Cada sección debe ser concisa (3-5 puntos) y accionable para el equipo de producto.`
}

// ─── Action handlers ─────────────────────────────────────────────────────────

async function handleEvaluate(
  supabaseAdmin: ReturnType<typeof createClient>,
  anthropicApiKey: string,
  opportunityId: string,
  projectId: string
): Promise<Response> {
  // Build the evaluation prompt server-side
  const prompt = await buildEvaluationPrompt(supabaseAdmin, opportunityId, projectId)

  // Call Anthropic
  const rawText = await callAnthropic(
    anthropicApiKey,
    [{ role: 'user', content: prompt }],
    2048
  )

  // Persist result to ai_evaluations table
  const { data: savedEval, error: saveError } = await supabaseAdmin
    .from('ai_evaluations')
    .insert({
      opportunity_id: opportunityId,
      prompt_snapshot: prompt,
      evaluation_text: rawText,
    })
    .select()
    .single()

  if (saveError) {
    throw new Error(`Failed to save evaluation: ${saveError.message}`)
  }

  return jsonResponse(savedEval as DBEvaluation)
}

async function handleSendMessage(
  supabaseAdmin: ReturnType<typeof createClient>,
  anthropicApiKey: string,
  evaluationId: string,
  userMessage: string
): Promise<Response> {
  // Load conversation history
  const { data: existingMessages, error: histError } = await supabaseAdmin
    .from('ai_conversation_messages')
    .select('*')
    .eq('evaluation_id', evaluationId)
    .order('created_at', { ascending: true })

  if (histError) {
    throw new Error(`Failed to load conversation: ${histError.message}`)
  }

  const history = (existingMessages ?? []) as DBMessage[]

  // Get the latest evaluation text for system context
  const { data: evalData, error: evalError } = await supabaseAdmin
    .from('ai_evaluations')
    .select('evaluation_text')
    .eq('id', evaluationId)
    .single()

  if (evalError) {
    throw new Error(`Failed to load evaluation: ${evalError.message}`)
  }

  const systemContext = evalData?.evaluation_text
    ? `Eres un experto en product discovery (OST de Teresa Torres). Estás en una conversación de refinamiento sobre una evaluación previa. La evaluación inicial fue:\n\n${evalData.evaluation_text}`
    : 'Eres un experto en product discovery usando el Opportunity Solution Tree (OST) de Teresa Torres.'

  // Build messages for API call
  const messagesForAPI = history.map(m => ({
    role: m.role,
    content: m.content,
  }))
  messagesForAPI.push({ role: 'user', content: userMessage })

  // Call Anthropic
  const assistantText = await callAnthropic(
    anthropicApiKey,
    messagesForAPI,
    1024,
    systemContext
  )

  // Persist user message
  const { data: savedUserMsg, error: userMsgError } = await supabaseAdmin
    .from('ai_conversation_messages')
    .insert({
      evaluation_id: evaluationId,
      role: 'user',
      content: userMessage,
    })
    .select()
    .single()

  if (userMsgError) {
    throw new Error(`Failed to save user message: ${userMsgError.message}`)
  }

  // Persist assistant message
  const { data: savedAssistantMsg, error: assistantMsgError } = await supabaseAdmin
    .from('ai_conversation_messages')
    .insert({
      evaluation_id: evaluationId,
      role: 'assistant',
      content: assistantText,
    })
    .select()
    .single()

  if (assistantMsgError) {
    throw new Error(`Failed to save assistant message: ${assistantMsgError.message}`)
  }

  return jsonResponse({
    userMessage: savedUserMsg as DBMessage,
    assistantMessage: savedAssistantMsg as DBMessage,
  })
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return errorResponse('Missing Supabase configuration', 500)
    }
    if (!anthropicApiKey) {
      return errorResponse('Missing ANTHROPIC_API_KEY secret', 500)
    }

    // ── Authenticate the user via JWT ──────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing Authorization header', 401)
    }

    // Create a client with the user's JWT to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return errorResponse('Invalid or expired token', 401)
    }

    // ── Parse request body ─────────────────────────────────────────────────

    const body = await req.json() as RequestBody
    const { action, opportunityId, projectId, message, evaluationId } = body

    if (!action || !opportunityId || !projectId) {
      return errorResponse('Missing required fields: action, opportunityId, projectId', 400)
    }

    // ── Check project membership ───────────────────────────────────────────

    // Use service role client for DB operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: membership, error: memberError } = await supabaseAdmin
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      return errorResponse('Failed to verify project membership', 500)
    }
    if (!membership) {
      return errorResponse('User is not a member of this project', 403)
    }

    // ── Route to action handler ────────────────────────────────────────────

    switch (action) {
      case 'evaluate':
        return await handleEvaluate(supabaseAdmin, anthropicApiKey, opportunityId, projectId)

      case 'send-message': {
        if (!message || !evaluationId) {
          return errorResponse('send-message requires message and evaluationId', 400)
        }
        return await handleSendMessage(supabaseAdmin, anthropicApiKey, evaluationId, message)
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('ai-proxy error:', err)
    return errorResponse(message, 500)
  }
})
