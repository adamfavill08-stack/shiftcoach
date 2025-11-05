import { NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/openaiClient'

// Simple test endpoint to verify OpenAI API key is configured correctly
// Access this at: http://localhost:3000/api/test-openai
export async function GET() {
  try {
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY is not set',
          hint: 'Add OPENAI_API_KEY to your .env.local file',
        },
        { status: 500 }
      )
    }

    // Check if API key looks valid (starts with sk-)
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY format looks invalid',
          hint: 'OpenAI API keys should start with "sk-"',
        },
        { status: 500 }
      )
    }

    // Try a simple API call to verify the key works
    const openai = getOpenAIClient()
    const testResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, ShiftCali!" if you can read this.',
        },
      ],
      max_tokens: 10,
    })

    const reply = testResponse.choices[0]?.message?.content?.trim()

    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is configured correctly!',
      testReply: reply,
      keyPrefix: apiKey.substring(0, 7) + '...', // Show first 7 chars for verification
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'OpenAI API test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check that your API key is valid and has credits',
      },
      { status: 500 }
    )
  }
}

