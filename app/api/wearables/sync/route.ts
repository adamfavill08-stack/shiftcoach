import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: call real provider webhooks / pull sources here
  await new Promise(r => setTimeout(r, 1000))
  return NextResponse.json({ lastSyncedAt: new Date().toISOString() })
}

export async function GET() {
  return NextResponse.json({ lastSyncedAt: new Date().toISOString() })
}

