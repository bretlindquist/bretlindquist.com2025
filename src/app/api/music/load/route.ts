import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { MUSIC_LISTS } from '../_lists'

export const runtime = 'nodejs'

function parseLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw, i) => {
      const stripped = raw.replace(/\s+\(\d{4}\)\s+\([-\d.]+\)\s*$/u, '')
      const [artist, ...rest] = stripped.split(' - ')
      const album = rest.join(' - ').trim() || stripped
      return {
        index: i + 1,
        raw,
        artist: artist?.trim() || '',
        album,
        query: `${artist?.trim() || ''} ${album}`.trim(),
      }
    })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = path.basename(String(body?.name || ''))
    const key = path.basename(name)
    const text = MUSIC_LISTS[key]
    if (!text) return NextResponse.json({ ok: false, error: `list not found: ${key}` }, { status: 404 })
    const entries = parseLines(text)
    return NextResponse.json({ ok: true, name: key, entries, text, count: entries.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to load list'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
