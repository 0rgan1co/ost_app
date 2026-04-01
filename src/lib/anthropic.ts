import Anthropic from '@anthropic-ai/sdk'

// Anthropic client configured with VITE_ANTHROPIC_API_KEY.
// Note: calling the API directly from the browser exposes the key in the
// client bundle. This is acceptable for internal / prototype usage; in a
// production app the call should be proxied through a server-side Edge
// Function or API route.
export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
  // Required to allow the SDK to run in a browser environment
  dangerouslyAllowBrowser: true,
})

export const AI_MODEL = 'claude-sonnet-4-6'
