import { getCommunityLists } from '../api/music/_community'
import { loadMusicEntries, pickMusicList } from '../api/music/_entries'
import { getMusicListNames } from '../api/music/_lists'
import { searchMusicMatch } from '../api/music/_search'
import MusicPageClient from './page.client'
import type { ListOption, SearchResult } from './types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MusicPage() {
  const builtInFiles = await getMusicListNames()
  const communityLists = await getCommunityLists()

  const allLists: ListOption[] = [
    ...builtInFiles.map((file) => ({
      id: file,
      label: file.replace(/\.txt$/i, ''),
      source: 'built-in' as const,
    })),
    ...communityLists.map((list) => ({
      id: `community:${list.id}`,
      label: list.name,
      source: 'community' as const,
    })),
  ]

  const selectedListId = pickMusicList(builtInFiles)
  const loaded = selectedListId ? await loadMusicEntries(selectedListId) : { entries: [], text: '', name: '' }
  const initialEntry = loaded.entries[0] || null
  let initialResult: SearchResult | null = null

  if (initialEntry) {
    try {
      initialResult = await searchMusicMatch({
        artist: initialEntry.artist,
        album: initialEntry.album,
        query: initialEntry.query,
      })
    } catch {
      initialResult = null
    }
  }

  return (
    <MusicPageClient
      initialLists={allLists}
      initialSelectedListId={selectedListId}
      initialEntries={loaded.entries}
      initialResult={initialResult}
      publishEnabled={Boolean(
        process.env.MUSIC_LISTS_GITHUB_OWNER &&
        process.env.MUSIC_LISTS_GITHUB_REPO &&
        (process.env.MUSIC_LISTS_GITHUB_TOKEN || process.env.GITHUB_TOKEN),
      )}
    />
  )
}
