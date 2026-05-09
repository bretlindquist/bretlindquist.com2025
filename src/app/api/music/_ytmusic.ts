import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import type { SearchResult } from '../../music/types.ts'
import { searchMusicMatch as searchMusicMatchViaYoutubeData } from './_search.ts'

const execFileAsync = promisify(execFile)

type AlbumResolverPayload = {
  ok: boolean
  artist: string
  album: string
  albumCandidate?: {
    title?: string
    playlistId?: string
    browseId?: string
    year?: string
    artists?: Array<{ name?: string }>
  }
  albumDetails?: {
    title?: string
    audioPlaylistId?: string
    playlistId?: string
    browseId?: string
    artists?: Array<{ name?: string }>
    year?: string
    trackCount?: number
    tracks?: Array<{
      title?: string
      videoId?: string | null
      isAvailable?: boolean | null
      duration?: string | null
    }>
  }
  error?: string
}

type ApplePreviewResult = {
  trackName: string
  artistName: string
  collectionName: string
  previewUrl: string
  artworkUrl100?: string
  artworkUrl600?: string
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildPlaylistEmbedUrl(playlistId: string) {
  const origin = encodeURIComponent(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000')
  return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&playsinline=1&origin=${origin}`
}

async function fetchApplePreview(args: { artist: string; album: string; track?: string }): Promise<ApplePreviewResult | null> {
  const artist = args.artist.trim()
  const album = args.album.trim()
  const track = String(args.track || '').trim()
  const term = encodeURIComponent([artist, track || album].filter(Boolean).join(' '))
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=10`
  let data: {
    results?: Array<{
      artistName?: string
      collectionName?: string
      trackName?: string
      previewUrl?: string
      artworkUrl100?: string
    }>
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return null
    data = await response.json() as typeof data
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    const code = typeof error === 'object' && error && 'cause' in error
      ? String(((error as { cause?: { code?: string } }).cause?.code) || '')
      : ''
    if (!message.includes('EBADF') && code !== 'EBADF') throw error

    const { stdout } = await execFileAsync('curl', ['-fsSL', url], {
      timeout: 10000,
      maxBuffer: 2 * 1024 * 1024,
    })
    data = JSON.parse(stdout) as typeof data
  }

  const artistKey = normalize(artist)
  const albumKey = normalize(album)
  const trackKey = normalize(track)

  const matches = (data.results || []).filter((item) => {
    const itemArtist = normalize(item.artistName || '')
    const itemAlbum = normalize(item.collectionName || '')
    const itemTrack = normalize(item.trackName || '')
    if (!item.previewUrl || !itemArtist.includes(artistKey)) return false
    if (albumKey && !itemAlbum.includes(albumKey)) return false
    if (trackKey && itemTrack !== trackKey) return false
    return true
  })

  const best = matches[0]
  if (!best?.previewUrl || !best.trackName || !best.artistName || !best.collectionName) return null

  return {
    trackName: best.trackName,
    artistName: best.artistName,
    collectionName: best.collectionName,
    previewUrl: best.previewUrl,
    artworkUrl100: best.artworkUrl100,
    artworkUrl600: best.artworkUrl100?.replace(/100x100bb(\.[a-z]+)?$/i, '600x600bb.jpg'),
  }
}

export async function searchMusicMatchViaYtMusic(args: { artist?: string; album?: string; query?: string }): Promise<SearchResult> {
  const artist = String(args.artist || '').trim()
  const album = String(args.album || '').trim()
  if (!artist || !album) {
    throw new Error('artist and album are required for ytmusic resolution')
  }

  const repoRoot = process.cwd()
  const python = path.join(repoRoot, '.venv-ytmusic', 'bin', 'python')
  const script = path.join(repoRoot, 'scripts', 'ytmusic_album_resolver.py')

  const { stdout } = await execFileAsync(
    python,
    [script, artist, album],
    {
      maxBuffer: 2 * 1024 * 1024,
      timeout: 20000,
    },
  )

  const payload = JSON.parse(stdout) as AlbumResolverPayload
  if (!payload.ok) {
    throw new Error(payload.error || 'ytmusic resolve failed')
  }

  const playlistId = payload.albumDetails?.audioPlaylistId
    || payload.albumDetails?.playlistId
    || payload.albumCandidate?.playlistId

  if (!playlistId) {
    throw new Error('ytmusic album did not include a playlist id')
  }

  const resolvedTitle = payload.albumDetails?.title || payload.albumCandidate?.title || album
  const resolvedChannel = (payload.albumDetails?.artists || payload.albumCandidate?.artists || [])
    .map((artistItem) => artistItem.name || '')
    .filter(Boolean)
    .join(', ') || artist

  const titleMatch = normalize(resolvedTitle) === normalize(album)
  const artistMatch = normalize(resolvedChannel).includes(normalize(artist))
  const confidence: SearchResult['confidence'] = titleMatch && artistMatch ? 'high' : 'medium'

  const firstTrack = (payload.albumDetails?.tracks || []).find((track) => track.title)
  const audioPreview = await fetchApplePreview({
    artist,
    album,
    track: firstTrack?.title || undefined,
  })
  let trackPreview: SearchResult | null = null
  if (firstTrack?.title) {
    try {
      trackPreview = await searchMusicMatchViaYoutubeData({
        artist,
        album: firstTrack.title,
        query: `${artist} ${firstTrack.title}`,
      })
    } catch {
      trackPreview = null
    }
  }

  return {
    ok: true,
    kind: 'playlist',
    playlistId,
    title: resolvedTitle,
    channel: resolvedChannel,
    url: `https://www.youtube.com/playlist?list=${playlistId}`,
    embedUrl: buildPlaylistEmbedUrl(playlistId),
    previewStrategy: 'direct',
    confidence,
    warning: confidence === 'high'
      ? null
      : 'Music provider result is not exact enough to auto-trust yet.',
    debug: {
      server: {
        provider: 'ytmusic-prototype',
        resolverFallback: null,
        notes: [
          `ytmusic album: ${resolvedTitle}`,
          `ytmusic playlistId: ${playlistId}`,
          firstTrack?.title ? `fallback track available: ${firstTrack.title}` : 'fallback track unavailable',
          audioPreview ? `apple preview attached: ${audioPreview.trackName}` : 'apple preview unavailable',
          'primary preview path: canonical album playlist',
        ],
        candidates: [
          {
            kind: 'playlist',
            title: resolvedTitle,
            channel: resolvedChannel,
            score: confidence === 'high' ? 100 : 75,
            playlistId,
          },
          ...((trackPreview?.candidates || []).slice(0, 8).map((candidate) => ({
            kind: candidate.kind,
            title: candidate.title,
            channel: candidate.channel,
            score: candidate.score,
            videoId: candidate.videoId,
            playlistId: candidate.playlistId,
          }))),
        ],
      },
    },
    audioPreview,
    candidates: [
      {
        kind: 'playlist',
        playlistId,
        title: resolvedTitle,
        channel: resolvedChannel,
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        embedUrl: buildPlaylistEmbedUrl(playlistId),
        score: confidence === 'high' ? 100 : 75,
      },
      ...((trackPreview?.candidates || []).filter((candidate) => candidate.kind === 'video').slice(0, 8)),
    ],
  }
}
