import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { getCommunityLists } from '../_community'
import { loadMusicEntries, parseMusicList } from '../_entries'
import { getMusicMatch } from '../_matches'
import { isLikelyUsableSearchResult } from '../_search'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = String(body?.id || body?.name || '').trim()

    if (id.startsWith('community:')) {
      const communityId = path.basename(id.slice('community:'.length))
      const communityLists = await getCommunityLists()
      const match = communityLists.find((list) => list.id === communityId)

      if (!match) {
        return NextResponse.json({ ok: false, error: `list not found: ${communityId}` }, { status: 404 })
      }

      const entries = parseMusicList(match.text)
      const initialResult = entries[0] ? await getMusicMatch(entries[0]) : null
      const safeInitialResult =
        initialResult && initialResult.confidence !== 'low' && isLikelyUsableSearchResult(initialResult) ? initialResult : null
      return NextResponse.json({ ok: true, name: id, entries, text: match.text, count: entries.length, initialResult: safeInitialResult })
    }

    const key = path.basename(id)
    const loaded = await loadMusicEntries(key)
    const initialResult = loaded.entries[0] ? await getMusicMatch(loaded.entries[0]) : null
    const safeInitialResult =
      initialResult && initialResult.confidence !== 'low' && isLikelyUsableSearchResult(initialResult) ? initialResult : null
    return NextResponse.json({
      ok: true,
      name: loaded.name,
      entries: loaded.entries,
      text: loaded.text,
      count: loaded.entries.length,
      initialResult: safeInitialResult,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to load list'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
