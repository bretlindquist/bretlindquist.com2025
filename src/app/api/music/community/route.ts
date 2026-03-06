import { NextRequest, NextResponse } from 'next/server'
import { addCommunityList, getCommunityLists } from '../_community'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const lists = await getCommunityLists()
    return NextResponse.json({ ok: true, lists })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to load community lists'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const list = await addCommunityList({
      name: String(body?.name || ''),
      text: String(body?.text || ''),
    })

    return NextResponse.json({ ok: true, list })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to save list'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
