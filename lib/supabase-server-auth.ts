import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export function getSupabaseServer() {
  return createRouteHandlerClient({ cookies })
}

// Legacy export for backward compatibility
export async function createServerSupabaseClient() {
  return getSupabaseServer()
}

