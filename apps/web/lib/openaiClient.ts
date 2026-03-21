import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      // In production builds on environments where OPENAI_API_KEY is not
      // available (e.g. Vercel preview or misconfigured env), we return a
      // lightweight mock client so that the rest of the app can still build
      // and run. Calls to the coach will return a friendly fallback message.
      console.warn(
        '[openaiClient] OPENAI_API_KEY is not set. Returning mock OpenAI client; AI coach responses will be generic.',
      )

      const mock = {
        chat: {
          completions: {
            // Minimal shape used by our code paths
            create: async () => ({
              choices: [
                {
                  message: {
                    content:
                      'ShiftCoach AI is temporarily unavailable because the OpenAI API key is not configured. You can continue using the app normally.',
                  },
                },
              ],
            }),
          },
        },
      } as unknown as OpenAI

      openaiInstance = mock
    } else {
      openaiInstance = new OpenAI({
        apiKey,
      })
    }
  }
  return openaiInstance
}

// Export for backward compatibility
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return getOpenAIClient()[prop as keyof OpenAI]
  }
})

