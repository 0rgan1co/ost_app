// ─── Suggestion Parser ────────────────────────────────────────────────────────
// Extracts actionable items from AI assistant messages so they can be applied
// to the OST (solutions, assumptions, evidence, description updates, experiments).

export type SuggestionActionType =
  | 'add_solution'
  | 'add_evidence'
  | 'update_description'
  | 'suggest_experiment'
  | 'manual'

export interface SuggestionAction {
  type: SuggestionActionType
  description: string
  data: Record<string, unknown>
}

// ─── Pattern definitions ─────────────────────────────────────────────────────

interface PatternDef {
  type: Exclude<SuggestionActionType, 'manual'>
  /** Regex tested against each line (case-insensitive). */
  pattern: RegExp
  /** Human-readable label prefix for the checkbox. */
  label: string
  /** Build the `data` payload from the captured content. */
  buildData: (content: string) => Record<string, unknown>
}

const PATTERNS: PatternDef[] = [
  // ── Solution ─────────────────────────────────────────────────────────────────
  {
    type: 'add_solution',
    pattern:
      /(?:agregar\s+soluci[oó]n|nueva\s+soluci[oó]n|soluci[oó]n\s*:\s*|crear\s+soluci[oó]n|a[nñ]adir\s+soluci[oó]n|considerar\s+(?:la\s+)?soluci[oó]n)[:\s]*[""]?(.+?)[""]?\s*$/i,
    label: 'Agregar solución',
    buildData: (content) => ({ description: content.trim() }),
  },
  // ── Evidence ────────────────────────────────────────────────────────────────
  {
    type: 'add_evidence',
    pattern:
      /(?:agregar\s+evidencia|registrar\s+(?:la\s+)?evidencia|evidencia\s*:\s*|a[nñ]adir\s+evidencia|documentar\s+(?:como\s+)?evidencia)[:\s]*[""]?(.+?)[""]?\s*$/i,
    label: 'Agregar evidencia',
    buildData: (content) => ({ content: content.trim(), type: 'observacion' }),
  },
  // ── Description update ──────────────────────────────────────────────────────
  {
    type: 'update_description',
    pattern:
      /(?:modificar\s+(?:la\s+)?descripci[oó]n|cambiar\s+(?:la\s+)?descripci[oó]n|actualizar\s+(?:la\s+)?descripci[oó]n|nueva\s+descripci[oó]n|descripci[oó]n\s+sugerida)[:\s]*[""]?(.+?)[""]?\s*$/i,
    label: 'Actualizar descripcion',
    buildData: (content) => ({ description: content.trim() }),
  },
  // ── Experiment ──────────────────────────────────────────────────────────────
  {
    type: 'suggest_experiment',
    pattern:
      /(?:experimento\s*:\s*|probar\s+(?:si|que|con)|validar\s+con|realizar\s+(?:un\s+)?experimento|sugerir\s+experimento|dise[nñ]ar\s+(?:un\s+)?experimento)[:\s]*[""]?(.+?)[""]?\s*$/i,
    label: 'Sugerencia de experimento',
    buildData: (content) => ({ description: content.trim() }),
  },
]

// ── Broader keyword-level detection (paragraph scope) ────────────────────────
// These fire when the line-level patterns above don't match but the overall
// text clearly talks about one of the action types.

interface KeywordDef {
  type: Exclude<SuggestionActionType, 'manual'>
  keywords: RegExp
  label: string
}

const KEYWORD_HINTS: KeywordDef[] = [
  {
    type: 'add_solution',
    keywords: /soluci[oó]n/i,
    label: 'Agregar solución sugerida',
  },
  {
    type: 'add_evidence',
    keywords: /(?:registrar|documentar|evidencia)/i,
    label: 'Agregar evidencia sugerida',
  },
  {
    type: 'update_description',
    keywords: /(?:descripci[oó]n.*(?:cambiar|modificar|actualizar|mejorar))|(?:(?:cambiar|modificar|actualizar|mejorar).*descripci[oó]n)/i,
    label: 'Actualizar descripcion de la oportunidad',
  },
  {
    type: 'suggest_experiment',
    keywords: /(?:experimento|probar|validar\s+con)/i,
    label: 'Sugerencia de experimento',
  },
]

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse an AI assistant message and extract actionable suggestion items.
 *
 * Strategy:
 * 1. Split the message into lines and try precise regex patterns.
 * 2. If no line-level matches, fall back to keyword detection on the full text
 *    and create a single action with a trimmed excerpt.
 * 3. If nothing at all matches, return a single `manual` action.
 */
export function parseSuggestion(content: string): SuggestionAction[] {
  const actions: SuggestionAction[] = []
  const lines = content.split('\n')

  // ── Pass 1: line-level precise patterns ──────────────────────────────────
  for (const line of lines) {
    const trimmed = line.replace(/^[\s\-\*\d.]+/, '').trim()
    if (!trimmed) continue

    for (const def of PATTERNS) {
      const match = trimmed.match(def.pattern)
      if (match && match[1]?.trim()) {
        const extracted = match[1].trim()
        actions.push({
          type: def.type,
          description: `${def.label}: "${extracted}"`,
          data: def.buildData(extracted),
        })
        break // one pattern per line
      }
    }
  }

  if (actions.length > 0) return actions

  // ── Pass 2: keyword-level fallback ───────────────────────────────────────
  // Look for broad keywords and extract a short excerpt as description.
  const seenTypes = new Set<string>()

  for (const hint of KEYWORD_HINTS) {
    if (hint.keywords.test(content) && !seenTypes.has(hint.type)) {
      seenTypes.add(hint.type)

      // Try to extract a relevant sentence near the keyword
      const excerpt = extractExcerpt(content, hint.keywords)

      actions.push({
        type: hint.type,
        description: `${hint.label}: "${excerpt}"`,
        data: { description: excerpt },
      })
    }
  }

  if (actions.length > 0) return actions

  // ── Pass 3: manual fallback ──────────────────────────────────────────────
  return [
    {
      type: 'manual',
      description: content,
      data: {},
    },
  ]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a short excerpt (up to ~120 chars) from the text around the first
 * occurrence of the keyword pattern.
 */
function extractExcerpt(text: string, keyword: RegExp): string {
  const match = keyword.exec(text)
  if (!match) return truncate(text, 120)

  const idx = match.index
  // Find the sentence boundary around the match
  const before = text.lastIndexOf('.', idx)
  const after = text.indexOf('.', idx + match[0].length)

  const start = before >= 0 ? before + 1 : 0
  const end = after >= 0 ? after + 1 : text.length

  const sentence = text.slice(start, end).trim()
  return truncate(sentence, 120)
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max).trimEnd() + '...'
}
