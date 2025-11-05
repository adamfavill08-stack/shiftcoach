import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const barcode = (body?.barcode as string | undefined)?.trim()
  if (!barcode) {
    return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })
  }

  // TODO: integrate real barcode → nutrition provider or AI model here
  const mock = {
    name: 'Example chicken & rice ready meal',
    brand: 'MockBrand',
    calories: 480,
    proteinG: 32,
    carbsG: 45,
    fatsG: 14,
  }

  return NextResponse.json({ barcode, food: mock })
}


