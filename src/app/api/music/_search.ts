import { execFile } from 'node:child_process'
import https from 'node:https'
import { promisify } from 'node:util'
import type { SearchResult } from '../../music/types.ts'

const API_KEY = process.env.YOUTUBE_DATA_API_KEY || process.env.youtube_data_api_v3 || ''
const execFileAsync = promisify(execFile)

type SearchItem = {
  id?: { kind?: string; videoId?: string; playlistId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

type Candidate = {
  kind: 'video' | 'playlist'
  videoId?: string
  playlistId?: string
  title: string
  channel: string
  url: string
  embedUrl: string
  score: number
}

const POSITIVE_PHRASES = [
  'full album',
  'album visualiser',
  'album visualizer',
  'visualiser',
  'visualizer',
  'official audio',
  'official video',
  'topic',
]

const NEGATIVE_PHRASES = [
  'reaction',
  'review',
  'album review',
  'analysis',
  'explained',
  'lyrics',
  'lyric video',
  'cover',
  'live',
  'concert',
  'lesson',
  'tutorial',
  'teaser',
  'trailer',
  'recap',
  'podcast',
  'interview',
  'last album',
  'first time hearing',
  'my first time hearing',
  'hearing',
  'droned',
  'tease',
  'preview',
  'slowed',
  'reverb',
  '8d',
  'fan edit',
  'tribute',
  'remix',
]

const HARD_REJECT_PHRASES = [
  'album review',
  'track review',
  'ending explained',
  'first reaction',
  'full reaction',
  'first time hearing',
  'my first time hearing',
  'tease',
  'full album tease',
  'droned',
]

const TRUSTED_CHANNEL_HINTS = [
  'topic',
  'records',
  'recordings',
  'music',
  'official',
  'vevo',
]

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean)
}

function countMatches(text: string, tokens: string[]) {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0)
}

function scoreCandidate(item: Candidate, artist: string, album: string) {
  const title = normalize(item.title)
  const channel = normalize(item.channel)
  const artistText = normalize(artist)
  const albumText = normalize(album)
  const artistTokens = tokenize(artist)
  const albumTokens = tokenize(album)
  let score = 0

  if (artistText && title.includes(artistText)) score += 6
  score += countMatches(title, artistTokens) * 1.5
  score += countMatches(channel, artistTokens) * 1.25

  if (albumText && title.includes(albumText)) score += 7
  score += countMatches(title, albumTokens) * 1.25
  if (albumTokens.length && !title.includes(albumText) && countMatches(title, albumTokens) < Math.min(2, albumTokens.length)) {
    score -= 10
  }

  if (artistText && albumText && title.includes(`${artistText} ${albumText}`)) score += 4
  if (artistText && albumText && title.startsWith(`${artistText} ${albumText}`)) score += 3

  if (item.kind === 'playlist') score += 6
  if (channel.endsWith(' topic')) score += 2
  if (TRUSTED_CHANNEL_HINTS.some((hint) => channel.includes(hint))) score += 1.25

  for (const phrase of POSITIVE_PHRASES) {
    if (title.includes(phrase) || channel.includes(phrase)) score += 1.5
  }

  if (title.includes('full album')) score += 4
  if (title.includes('official video') && albumTokens.length > 1) score -= 3

  for (const phrase of NEGATIVE_PHRASES) {
    if (title.includes(phrase)) score -= 4
    if (channel.includes(phrase)) score -= 2
  }

  if (title.includes('official') && channel.includes(artistText)) score += 2
  if (title.includes('?')) score -= 3

  return score
}

function candidateText(title: string, channel: string) {
  return `${normalize(title)} ${normalize(channel)}`.trim()
}

function isLikelyBadMatchTitle(title: string, channel = '') {
  const text = candidateText(title, channel)
  return HARD_REJECT_PHRASES.some((phrase) => text.includes(phrase))
}

function buildWatchUrl(candidate: Pick<Candidate, 'kind' | 'videoId' | 'playlistId'>) {
  if (candidate.kind === 'playlist' && candidate.playlistId) {
    return `https://www.youtube.com/playlist?list=${candidate.playlistId}`
  }

  return `https://www.youtube.com/watch?v=${candidate.videoId}`
}

function buildEmbedUrl(candidate: Pick<Candidate, 'kind' | 'videoId' | 'playlistId'>) {
  const origin = encodeURIComponent(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000')
  if (candidate.kind === 'playlist' && candidate.playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${candidate.playlistId}&autoplay=1&playsinline=1&origin=${origin}`
  }

  return `https://www.youtube.com/embed/${candidate.videoId}?autoplay=1&playsinline=1&origin=${origin}`
}

async function fetchSearch(query: string) {
  if (!API_KEY) throw new Error('missing YOUTUBE_DATA_API_KEY')

  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: '10',
    q: query,
    key: API_KEY,
  })

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  const data = await readJsonWithFallback(url) as { items?: SearchItem[]; error?: { code?: number; message?: string } }
  if (data?.error?.code) {
    throw new Error(`YouTube API ${data.error.code}: ${(data.error.message || 'request failed').slice(0, 180)}`)
  }
  return Array.isArray(data?.items) ? data.items : []
}

function readJson(url: string) {
  return new Promise<unknown>((resolve, reject) => {
    const req = https.get(url, (res) => {
      const statusCode = res.statusCode || 0
      let body = ''

      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`YouTube API ${statusCode}: ${body.slice(0, 180)}`))
          return
        }

        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(new Error(`YouTube response parse failed: ${error instanceof Error ? error.message : 'unknown error'}`))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy(new Error('YouTube request timed out'))
    })
  })
}

async function readJsonWithFallback(url: string) {
  try {
    return await readJson(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code || '') : ''

    if (!message.includes('EBADF') && code !== 'EBADF') {
      throw error
    }

    const { stdout } = await execFileAsync('curl', ['-fsSL', url], {
      timeout: 15000,
      maxBuffer: 2 * 1024 * 1024,
    })

    return JSON.parse(stdout)
  }
}

function buildCandidates(items: SearchItem[]): Candidate[] {
  return items
    .map((item): Candidate | null => {
      const kind: Candidate['kind'] | null = item?.id?.kind === 'youtube#playlist'
        ? 'playlist'
        : item?.id?.kind === 'youtube#video'
          ? 'video'
          : null
      const videoId = item?.id?.videoId
      const playlistId = item?.id?.playlistId
      if (!kind) return null
      if (kind === 'video' && !videoId) return null
      if (kind === 'playlist' && !playlistId) return null

      const baseCandidate = {
        kind,
        videoId,
        playlistId,
        title: item.snippet?.title || 'Untitled result',
        channel: item.snippet?.channelTitle || '',
        score: 0,
      }

      return {
        ...baseCandidate,
        url: buildWatchUrl(baseCandidate),
        embedUrl: buildEmbedUrl(baseCandidate),
      } satisfies Candidate
    })
    .filter((candidate): candidate is Candidate => !!candidate)
}

function rankCandidates(candidates: Candidate[], artist: string, album: string) {
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, artist, album),
    }))
    .sort((a, b) => b.score - a.score)

  const top = ranked[0]
  const gap = top ? top.score - (ranked[1]?.score ?? -99) : 0
  const topSuspicious = top ? isLikelyBadMatchTitle(top.title, top.channel) : false
  const confidence: SearchResult['confidence'] = !top
    ? 'low'
    : !topSuspicious && top.score >= 20 && gap >= 3
      ? 'high'
      : !topSuspicious && top.score >= 13 && gap >= 1.5
        ? 'medium'
        : 'low'
  const warning = confidence === 'low' ? 'Result confidence is low. Review alternate matches before trusting autoplay.' : null

  return {
    ranked,
    confidence,
    warning,
  }
}

export async function searchMusicMatch(args: { artist?: string; album?: string; query?: string }): Promise<SearchResult> {
  const artist = String(args.artist || '').trim()
  const album = String(args.album || '').trim()
  const fallbackQuery = String(args.query || '').trim()
  const baseQuery = [artist, album].filter(Boolean).join(' ').trim() || fallbackQuery

  if (!baseQuery) throw new Error('query required')

  const initialItems = await fetchSearch(baseQuery)
  const candidates = buildCandidates(initialItems)
  const ranked = rankCandidates(candidates, artist || baseQuery, album)

  const best = ranked.ranked.find((candidate) => !isLikelyBadMatchTitle(candidate.title, candidate.channel)) || ranked.ranked[0]
  if (!best) throw new Error('no embeddable result')

  return {
    ok: true,
    kind: best.kind,
    videoId: best.videoId,
    playlistId: best.playlistId,
    title: best.title,
    channel: best.channel,
    url: best.url,
    embedUrl: best.embedUrl,
    confidence: ranked.confidence,
    warning: ranked.warning,
    debug: {
      server: {
        provider: 'youtube-data',
        resolverFallback: null,
        notes: [`youtube-data query: ${baseQuery}`],
        candidates: ranked.ranked.slice(0, 8).map((candidate) => ({
          kind: candidate.kind,
          title: candidate.title,
          channel: candidate.channel,
          score: candidate.score,
          videoId: candidate.videoId,
          playlistId: candidate.playlistId,
        })),
      },
    },
    candidates: ranked.ranked.slice(0, 4),
  }
}

export function isLikelyUsableSearchResult(result: Pick<SearchResult, 'title' | 'channel'> & Partial<Pick<SearchResult, 'embedUrl'>>) {
  if (result.embedUrl?.includes('127.0.0.1')) return false
  return !isLikelyBadMatchTitle(result.title, result.channel)
}

export function isAlbumRelevantCandidate(args: { artist?: string; album?: string; title: string; channel?: string }) {
  const album = String(args.album || '').trim()
  if (!album) return true

  const text = candidateText(args.title, args.channel || '')
  const albumText = normalize(album)
  const albumTokens = tokenize(album)

  if (text.includes(albumText)) return true
  return countMatches(text, albumTokens) >= Math.min(2, albumTokens.length)
}
