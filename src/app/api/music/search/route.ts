import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// NOTE: set YOUTUBE_DATA_API_KEY in Vercel env for production.
const API_KEY = process.env.YOUTUBE_DATA_API_KEY || process.env.youtube_data_api_v3 || 'AIzaSyBPCyWUZbTC8nW5wv8cHHAkza_6qqPPY5Q'

async function searchEmbeddable(query: string) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '5',
    q: query,
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key: API_KEY,
  })

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`YouTube API ${r.status}: ${txt.slice(0, 180)}`)
  }

  const data = await r.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }> }
  const items = Array.isArray(data?.items) ? data.items : []
  const first = items.find((it) => it?.id?.videoId)
  if (!first?.id?.videoId) throw new Error('no embeddable result')

  return {
    videoId: first.id.videoId as string,
    title: first.snippet?.title || query,
    channel: first.snippet?.channelTitle || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })

    if (!API_KEY) {
      return NextResponse.json({ ok: false, error: 'missing YOUTUBE_DATA_API_KEY' }, { status: 500 })
    }

    const hit = await searchEmbeddable(query)
    return NextResponse.json({
      ok: true,
      videoId: hit.videoId,
      title: hit.title,
      channel: hit.channel,
      url: `https://www.youtube.com/watch?v=${hit.videoId}`,
      embedUrl: `https://www.youtube.com/embed/${hit.videoId}?autoplay=1&playsinline=1`,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
