import { NextResponse } from 'next/server'
import { MUSIC_LIST_NAMES } from '../_lists'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true, files: MUSIC_LIST_NAMES })
}
