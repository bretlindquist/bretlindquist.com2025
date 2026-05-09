import { NextRequest, NextResponse } from 'next/server'
import { generateLocalPreview, getLocalPreview } from '../_previewCache'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const artist = url.searchParams.get('artist') || ''
    const album = url.searchParams.get('album') || ''
    const preview = await getLocalPreview({ artist, album })
    return NextResponse.json({ ok: true, preview })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'failed to read preview cache'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const artist = String(body?.artist || '').trim()
    const album = String(body?.album || '').trim()
    const title = String(body?.title || '').trim()
    const channel = String(body?.channel || '').trim()
    const sourceUrl = String(body?.sourceUrl || '').trim()

    const preview = await generateLocalPreview({
      artist,
      album,
      title,
      channel,
      sourceUrl,
    })

    return NextResponse.json({ ok: true, preview })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'failed to generate local preview'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
