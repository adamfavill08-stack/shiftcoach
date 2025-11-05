import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // TODO: parse formData, send image to a real food-vision model/service
  // For now, mock a realistic response for development
  const formData = await req.formData()
  const file = formData.get('image')
  if (!file) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  }

  // Mocked estimate
  const mock = {
    calories: 620,
    proteinG: 32,
    carbsG: 55,
    fatsG: 24,
  }

  return NextResponse.json({ estimate: mock })
}


