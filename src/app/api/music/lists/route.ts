import { NextResponse } from 'next/server'
import { getCommunityLists } from '../_community'
import { getMusicListNames } from '../_lists'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const files = await getMusicListNames()
    const communityLists = await getCommunityLists()

    return NextResponse.json({
      ok: true,
      lists: [
        ...files.map((file) => ({
          id: file,
          label: file.replace(/\.txt$/i, ''),
          source: 'built-in' as const,
        })),
        ...communityLists.map((list) => ({
          id: `community:${list.id}`,
          label: list.name,
          source: 'community' as const,
        })),
      ],
      publishEnabled: Boolean(
        process.env.MUSIC_LISTS_GITHUB_OWNER &&
        process.env.MUSIC_LISTS_GITHUB_REPO &&
        (process.env.MUSIC_LISTS_GITHUB_TOKEN || process.env.GITHUB_TOKEN),
      ),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed to list music files'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
