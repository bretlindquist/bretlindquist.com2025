import { NextResponse } from 'next/server'
import fs from 'node:fs'

export const runtime = 'nodejs'

const LISTS_DIR = process.env.MUSIC_SCAN_LISTS_DIR || '/Users/bretlindquist/git/youtube-top100-2025-playlist/data/txt'

export async function GET() {
  try {
    const files = fs.readdirSync(LISTS_DIR).filter((f) => f.endsWith('.txt')).sort()
    return NextResponse.json({ ok: true, files })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to list files'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
