import type { SearchResult } from '../../music/types.ts'

const API_KEY = process.env.YOUTUBE_DATA_API_KEY || process.env.youtube_data_api_v3 || ''

type SearchItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

type Candidate = {
  videoId: string
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

  if (channel.endsWith(' topic')) score += 2

  for (const phrase of POSITIVE_PHRASES) {
    if (title.includes(phrase) || channel.includes(phrase)) score += 1.5
  }

  for (const phrase of NEGATIVE_PHRASES) {
    if (title.includes(phrase)) score -= 4
    if (channel.includes(phrase)) score -= 2
  }

  if (title.includes('official') && channel.includes(artistText)) score += 2

  return score
}

async function fetchSearch(query: string) {
  if (!API_KEY) throw new Error('missing YOUTUBE_DATA_API_KEY')

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '8',
    q: query,
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key: API_KEY,
  })

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`YouTube API ${response.status}: ${text.slice(0, 180)}`)
  }

  const data = await response.json() as { items?: SearchItem[] }
  return Array.isArray(data?.items) ? data.items : []
}

function buildCandidates(items: SearchItem[]) {
  return items
    .map((item) => {
      const videoId = item?.id?.videoId
      if (!videoId) return null

      return {
        videoId,
        title: item.snippet?.title || 'Untitled video',
        channel: item.snippet?.channelTitle || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`,
        score: 0,
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
  const confidence: SearchResult['confidence'] = !top
    ? 'low'
    : top.score >= 18 && gap >= 3
      ? 'high'
      : top.score >= 12 && gap >= 1.5
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
  let candidates = buildCandidates(initialItems)
  let ranked = rankCandidates(candidates, artist || baseQuery, album)

  if (ranked.confidence === 'low') {
    const albumBiasedItems = await fetchSearch(`${baseQuery} full album`)
    const merged = new Map<string, Candidate>()

    for (const candidate of [...candidates, ...buildCandidates(albumBiasedItems)]) {
      merged.set(candidate.videoId, candidate)
    }

    candidates = Array.from(merged.values())
    ranked = rankCandidates(candidates, artist || baseQuery, album)
  }

  const best = ranked.ranked[0]
  if (!best) throw new Error('no embeddable result')

  return {
    ok: true,
    videoId: best.videoId,
    title: best.title,
    channel: best.channel,
    url: best.url,
    embedUrl: best.embedUrl,
    confidence: ranked.confidence,
    warning: ranked.warning,
    candidates: ranked.ranked.slice(0, 4),
  }
}
