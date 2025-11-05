import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to your .env.local file.')
    }
    openaiInstance = new OpenAI({
      apiKey: apiKey,
    })
  }
  return openaiInstance
}

// Export for backward compatibility
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI]
  }
})

