export type Entry = {
  index: number
  raw: string
  artist: string
  album: string
  query: string
  year: number | null
  score: number | null
}

export type SearchCandidate = {
  kind: 'video' | 'playlist'
  videoId?: string
  playlistId?: string
  title: string
  channel: string
  url: string
  embedUrl: string
  score: number
}

export type SearchDebugTrace = {
  server?: {
    provider?: 'youtube-data' | 'ytmusic-prototype'
    cache?: 'hit' | 'miss' | 'skipped-low-confidence' | 'skipped-unusable'
    resolverFallback?: 'youtube-data' | null
    notes?: string[]
    candidates?: Array<{
      kind: 'video' | 'playlist'
      title: string
      channel: string
      score: number
      videoId?: string
      playlistId?: string
    }>
  }
  client?: {
    failedCandidateIds?: string[]
    chosenCandidateId?: string | null
    playerNotice?: string | null
    probeEvents?: string[]
    embedErrors?: Array<{ candidateId: string; errorCode: number }>
    finalPreviewMode?: 'youtube' | 'audio-preview' | 'local-preview' | 'none' | null
  }
}

export type LocalPreview = {
  key: string
  artist: string
  album: string
  title: string
  channel: string
  sourceType: 'youtube' | 'remote-audio'
  sourceUrl: string
  localUrl: string
  fileName: string
  generatedAt: string
  durationSec: number
}

export type SearchResult = {
  ok: boolean
  kind: 'video' | 'playlist'
  videoId?: string
  playlistId?: string
  previewStrategy?: 'probe' | 'direct' | 'audio'
  embedUrl: string
  url: string
  title: string
  channel: string
  confidence: 'high' | 'medium' | 'low'
  warning: string | null
  debug?: SearchDebugTrace
  audioPreview?: {
    trackName: string
    artistName: string
    collectionName: string
    previewUrl: string
    artworkUrl100?: string
    artworkUrl600?: string
  } | null
  candidates: SearchCandidate[]
}

export type ListOption = {
  id: string
  label: string
  source: 'built-in' | 'community'
}

export type Decision = 'keep' | 'skip'
export type DecisionMap = Record<number, Decision>
export type ListFilter = 'pending' | 'all' | 'keep' | 'skip'
export type HistoryItem = { entryIndex: number; previous: Decision | null; next: Decision | null }
export type StoredListState = { idx?: number; decisions?: Record<string, Decision>; listFilter?: ListFilter }
