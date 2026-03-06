import { NextRequest, NextResponse } from 'next/server'
import { getMusicMatch, saveMusicMatch } from '../_matches'
import { searchMusicMatch } from '../_search'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const resolve = body?.resolve !== false
    const selectedResult = body?.selectedResult

    if (selectedResult) {
      try {
        const saved = await saveMusicMatch(body, selectedResult)
        return NextResponse.json(saved)
      } catch {
        return NextResponse.json(selectedResult)
      }
    }

    const cached = await getMusicMatch(body)
    if (cached) {
      return NextResponse.json(cached)
    }

    if (!resolve) {
      return NextResponse.json({ ok: false, error: 'No saved match yet.' }, { status: 404 })
    }

    const result = await searchMusicMatch(body)
    try {
      const saved = await saveMusicMatch(body, result)
      return NextResponse.json(saved)
    } catch {
      return NextResponse.json(result)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
