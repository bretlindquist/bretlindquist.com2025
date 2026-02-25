import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

const LISTS_DIR = process.env.MUSIC_SCAN_LISTS_DIR || `${process.cwd()}/data/music-lists`

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
    const full = path.join(LISTS_DIR, name)
    const text = fs.readFileSync(full, 'utf8')
    const entries = parseLines(text)
    return NextResponse.json({ ok: true, name, entries, text, count: entries.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to load list'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
