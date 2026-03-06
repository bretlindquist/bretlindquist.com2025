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
  videoId: string
  title: string
  channel: string
  url: string
  embedUrl: string
  score: number
}

export type SearchResult = {
  ok: boolean
  videoId: string
  embedUrl: string
  url: string
  title: string
  channel: string
  confidence: 'high' | 'medium' | 'low'
  warning: string | null
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
