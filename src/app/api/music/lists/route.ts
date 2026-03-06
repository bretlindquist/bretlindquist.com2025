import { NextResponse } from 'next/server'
import { getMusicListNames } from '../_lists'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const files = await getMusicListNames()
    return NextResponse.json({ ok: true, files })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to list music files'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
