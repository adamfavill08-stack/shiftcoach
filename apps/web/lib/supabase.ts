import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug: Log env vars (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('[lib/supabase] Environment check:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '✗ Missing')
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Found' : '✗ Missing')
}

if (!supabaseUrl || !supabaseKey) {
  const errorMsg = `
❌ Missing Supabase environment variables!

Please ensure your .env.local file exists in the project root with:
  - NEXT_PUBLIC_SUPABASE_URL=https://hfkittwgwtjdzwzjvqgx.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Then:
  1. Stop your dev server (Ctrl+C)
  2. Run: rm -rf .next
  3. Restart: npm run dev

Current working directory: ${process.cwd()}
`
  throw new Error(errorMsg)
}

// Create the Supabase client
const supabaseClient = createClientComponentClient({
  supabaseUrl: supabaseUrl,
  supabaseKey: supabaseKey,
})

// Wrap auth.getUser to catch AuthSessionMissingError silently
const originalGetUser = supabaseClient.auth.getUser.bind(supabaseClient.auth)
supabaseClient.auth.getUser = async function(...args: any[]) {
  try {
    return await originalGetUser(...args)
  } catch (err: any) {
    // Catch AuthSessionMissingError silently - it's expected in dev/serverless
    if (err?.name === 'AuthSessionMissingError' || 
        err?.message?.includes('Auth session missing') ||
        err?.__isAuthError) {
      // Return empty result instead of throwing
      return { data: { user: null }, error: err }
    }
    // Re-throw unexpected errors
    throw err
  }
}

export const supabase = supabaseClient

