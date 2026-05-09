import { NextRequest, NextResponse } from 'next/server'
import { getMusicMatch, saveMusicMatch } from '../_matches'
import { resolveMusicMatch } from '../_resolver'
import { isLikelyUsableSearchResult } from '../_search'

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
    if (cached && cached.confidence !== 'low' && isLikelyUsableSearchResult(cached)) {
      return NextResponse.json({
        ...cached,
        debug: {
          ...cached.debug,
          server: {
            ...(cached.debug?.server || {}),
            cache: 'hit',
          },
        },
      })
    }

    const cacheStatus: 'miss' | 'skipped-low-confidence' | 'skipped-unusable' = cached
      ? cached.confidence === 'low'
        ? 'skipped-low-confidence'
        : 'skipped-unusable'
      : 'miss'

    if (!resolve) {
      return NextResponse.json({ ok: false, error: 'No saved match yet.' }, { status: 404 })
    }

    const result = await resolveMusicMatch(body)
    const tracedResult = {
      ...result,
      debug: {
        ...result.debug,
        server: {
          ...(result.debug?.server || {}),
          cache: cacheStatus,
        },
      },
    }
    try {
      if (tracedResult.confidence === 'low') {
        return NextResponse.json(tracedResult)
      }
      const saved = await saveMusicMatch(body, tracedResult)
      return NextResponse.json({
        ...saved,
        debug: tracedResult.debug,
      })
    } catch {
      return NextResponse.json(tracedResult)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
