import { NextRequest, NextResponse } from 'next/server'
import { searchMusicMatch } from '../_search'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await searchMusicMatch(body)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
