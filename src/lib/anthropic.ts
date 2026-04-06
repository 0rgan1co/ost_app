import Anthropic from '@anthropic-ai/sdk'

export const AI_MODEL = 'claude-sonnet-4-6'

export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})
