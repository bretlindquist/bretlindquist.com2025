import type { SearchResult } from '../../music/types.ts'
import { searchMusicMatch as searchMusicMatchViaYoutubeData } from './_search.ts'
import { searchMusicMatchViaYtMusic } from './_ytmusic.ts'

type SearchArgs = {
  artist?: string
  album?: string
  query?: string
}

export type MusicResolverProvider = 'youtube-data' | 'ytmusic-prototype'

export function currentMusicResolverProvider(): MusicResolverProvider {
  if (process.env.MUSIC_RESOLVER_PROVIDER === 'youtube-data') {
    return 'youtube-data'
  }

  return 'ytmusic-prototype'
}

type ResolverDeps = {
  searchMusicMatchViaYoutubeData: (args: SearchArgs) => Promise<SearchResult>
  searchMusicMatchViaYtMusic: (args: SearchArgs) => Promise<SearchResult>
}

export function createMusicResolver(deps: ResolverDeps) {
  return async function resolveMusicMatch(args: SearchArgs): Promise<SearchResult> {
    const provider = currentMusicResolverProvider()

    if (provider === 'ytmusic-prototype') {
      try {
        const result = await deps.searchMusicMatchViaYtMusic(args)
        return {
          ...result,
          debug: {
            ...result.debug,
            server: {
              ...(result.debug?.server || {}),
              provider: 'ytmusic-prototype',
              resolverFallback: null,
            },
          },
        }
      } catch (error) {
        const fallback = await deps.searchMusicMatchViaYoutubeData(args)
        return {
          ...fallback,
          debug: {
            ...fallback.debug,
            server: {
              ...(fallback.debug?.server || {}),
              provider: 'ytmusic-prototype',
              resolverFallback: 'youtube-data',
              notes: [
                ...((fallback.debug?.server?.notes) || []),
                `ytmusic resolver failed: ${error instanceof Error ? error.message : String(error)}`,
              ],
            },
          },
        }
      }
    }

    const result = await deps.searchMusicMatchViaYoutubeData(args)
    return {
      ...result,
      debug: {
        ...result.debug,
        server: {
          ...(result.debug?.server || {}),
          provider: 'youtube-data',
          resolverFallback: null,
        },
      },
    }
  }
}

export const resolveMusicMatch = createMusicResolver({
  searchMusicMatchViaYoutubeData,
  searchMusicMatchViaYtMusic,
})
