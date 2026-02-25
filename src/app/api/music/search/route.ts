import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'node:child_process'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    if (!query) return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })

    const result = await new Promise<{ ok: true; videoId: string; title: string; channel: string; url: string }>((resolve, reject) => {
      execFile(
        'yt-dlp',
        ['-J', '--flat-playlist', '--no-warnings', `ytsearch1:${query}`],
        { timeout: 45000, maxBuffer: 5 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error((stderr || err.message || 'yt-dlp failed').slice(0, 400)))
          try {
            const data = JSON.parse(stdout)
            const first = data?.entries?.[0]
            if (!first?.id) return reject(new Error('no result'))
            resolve({
              ok: true,
              videoId: first.id,
              title: first.title || '',
              channel: first.channel || first.uploader || '',
              url: `https://www.youtube.com/watch?v=${first.id}`,
            })
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e)
            reject(new Error(`parse failed: ${message}`))
          }
        }
      )
    })

    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'search failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
