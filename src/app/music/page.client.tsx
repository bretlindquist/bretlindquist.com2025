"use client"

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import YouTubePreviewPlayer from './YouTubePreviewPlayer'
import { loadYouTubeIframeApi, type YouTubePlayerApi } from './youtubeIframeApi'
import type {
  Decision,
  DecisionMap,
  Entry,
  HistoryItem,
  ListFilter,
  ListOption,
  LocalPreview,
  SearchCandidate,
  SearchResult,
  StoredListState,
} from './types'

const LAST_FILE_KEY = 'music-scan:last-file'

function storageKey(name: string) {
  return `music-scan:state:${name}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function confidenceLabel(confidence: SearchResult['confidence']) {
  if (confidence === 'high') return 'Trusted match'
  if (confidence === 'medium') return 'Probable match'
  return 'Check match'
}

function previewButtonLabel(searching: boolean, hasResult: boolean) {
  if (searching) return 'Resolving match…'
  if (hasResult) return 'Resolve Again'
  return 'Resolve Preview'
}

function isListFilter(value: unknown): value is ListFilter {
  return value === 'pending' || value === 'all' || value === 'keep' || value === 'skip'
}

function findNextPendingIndex(entries: Entry[], decisions: DecisionMap, startIdx: number) {
  for (let index = startIdx + 1; index < entries.length; index += 1) {
    if (!(entries[index].index in decisions)) return index
  }

  for (let index = 0; index < startIdx; index += 1) {
    if (!(entries[index].index in decisions)) return index
  }

  return clamp(startIdx, 0, Math.max(entries.length - 1, 0))
}

function normalizeLoose(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isAlbumRelevantCandidate(entry: Entry, candidate: SearchCandidate) {
  const album = normalizeLoose(entry.album)
  const text = normalizeLoose(`${candidate.title} ${candidate.channel}`)
  if (!album) return true
  if (text.includes(album)) return true

  const tokens = album.split(/\s+/).filter(Boolean)
  const matched = tokens.filter((token) => text.includes(token)).length
  return matched >= Math.min(2, tokens.length)
}

function candidateId(candidate: Pick<SearchCandidate, 'kind' | 'videoId' | 'playlistId'>) {
  return candidate.kind === 'playlist' ? candidate.playlistId || '' : candidate.videoId || ''
}

function sameCandidate(
  left: Pick<SearchCandidate, 'kind' | 'videoId' | 'playlistId'>,
  right: Pick<SearchCandidate, 'kind' | 'videoId' | 'playlistId'>,
) {
  return left.kind === right.kind && candidateId(left) === candidateId(right)
}

function candidateFromResult(result: SearchResult): SearchCandidate {
  return {
    kind: result.kind,
    videoId: result.videoId,
    playlistId: result.playlistId,
    title: result.title,
    channel: result.channel,
    url: result.url,
    embedUrl: result.embedUrl,
    score: result.candidates[0]?.score ?? 0,
  }
}

async function probePlayableCandidate(candidate: SearchCandidate, origin: string) {
  if (typeof window === 'undefined') return false

  const YT = await loadYouTubeIframeApi()

  return new Promise<boolean>((resolve) => {
    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.left = '-9999px'
    host.style.top = '0'
    host.style.width = '320px'
    host.style.height = '180px'
    host.style.opacity = '0'
    host.style.pointerEvents = 'none'
    document.body.appendChild(host)

    let settled = false
    let readyTimeoutId: number | null = null
    let player: YouTubePlayerApi | null = null

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      if (readyTimeoutId !== null) {
        window.clearTimeout(readyTimeoutId)
        readyTimeoutId = null
      }
      try {
        player?.destroy()
      } catch {}
      host.remove()
      resolve(ok)
    }

    const timeoutId = window.setTimeout(() => finish(false), 3500)

    const playerOptions = {
      ...(candidate.kind === 'video' && candidate.videoId ? { videoId: candidate.videoId } : {}),
      playerVars: {
        autoplay: 0,
        playsinline: 1,
        rel: 0,
        origin,
        ...(candidate.kind === 'playlist' && candidate.playlistId ? { listType: 'playlist', list: candidate.playlistId } : {}),
      },
      events: {
        onReady: () => {
          readyTimeoutId = window.setTimeout(() => finish(false), 1600)
        },
        onStateChange: (event: { data?: number }) => {
          if (event.data === 1 || event.data === 2 || event.data === 5) {
            finish(true)
          }
        },
        onError: () => finish(false),
      },
    }

    player = new YT.Player(host, playerOptions)
  })
}

type MusicPageClientProps = {
  initialLists: ListOption[]
  initialSelectedListId: string
  initialEntries: Entry[]
  initialResult: SearchResult | null
  publishEnabled: boolean
}

export default function MusicPageClient({
  initialLists,
  initialSelectedListId,
  initialEntries,
  initialResult,
  publishEnabled,
}: MusicPageClientProps) {
  const [lists, setLists] = useState<ListOption[]>(initialLists)
  const [selectedFile, setSelectedFile] = useState(initialSelectedListId)
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState<SearchResult | null>(initialResult)
  const [resultCache, setResultCache] = useState<Record<number, SearchResult>>(
    initialEntries[0] && initialResult ? { [initialEntries[0].index]: initialResult } : {},
  )
  const [searching, setSearching] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<DecisionMap>({})
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [listFilter, setListFilter] = useState<ListFilter>('pending')
  const [isListPickerOpen, setIsListPickerOpen] = useState(false)
  const [isAddListOpen, setIsAddListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListText, setNewListText] = useState('')
  const [savingList, setSavingList] = useState(false)
  const [listFormError, setListFormError] = useState<string | null>(null)
  const [playerNotice, setPlayerNotice] = useState<string | null>(null)
  const [embedFailures, setEmbedFailures] = useState<Record<number, string[]>>({})
  const [resolvedCandidate, setResolvedCandidate] = useState<SearchCandidate | null>(initialResult ? candidateFromResult(initialResult) : null)
  const [playerPending, setPlayerPending] = useState(false)
  const [probeEvents, setProbeEvents] = useState<string[]>([])
  const [embedErrorEvents, setEmbedErrorEvents] = useState<Array<{ candidateId: string; errorCode: number }>>([])
  const [localPreview, setLocalPreview] = useState<LocalPreview | null>(null)
  const [loadingLocalPreview, setLoadingLocalPreview] = useState(false)
  const [cachingLocalPreview, setCachingLocalPreview] = useState(false)
  const [localPreviewError, setLocalPreviewError] = useState<string | null>(null)
  const autoPreviewIndexRef = useRef<number | null>(null)
  const currentIndexRef = useRef<number | null>(null)
  const inFlightSearchesRef = useRef<Map<number, Promise<SearchResult | null>>>(new Map())
  const prewarmedIndexRef = useRef<number | null>(null)
  const initialSelectionHandledRef = useRef(false)
  const listPickerRef = useRef<HTMLDivElement | null>(null)

  const current = entries[idx] || null
  const currentDecision = current ? decisions[current.index] ?? null : null
  const currentCache = current ? resultCache[current.index] ?? null : null
  const selectedList = lists.find((list) => list.id === selectedFile) || null
  const builtInLists = useMemo(() => lists.filter((list) => list.source === 'built-in'), [lists])
  const communityLists = useMemo(() => lists.filter((list) => list.source === 'community'), [lists])
  const playerOrigin = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin
  const showDebugTrace = process.env.NODE_ENV !== 'production'
  const shouldPreferAudioPreview = Boolean(result?.audioPreview?.previewUrl) && result?.previewStrategy === 'audio'
  const usingAudioFallback = Boolean(result?.audioPreview?.previewUrl) && !resolvedCandidate && !playerPending
  const previewSourceUrl = useMemo(() => {
    if (localPreview?.localUrl) return localPreview.localUrl
    if (shouldPreferAudioPreview && result?.audioPreview?.previewUrl) return result.audioPreview.previewUrl
    if (resolvedCandidate?.kind === 'video' && resolvedCandidate.url) return resolvedCandidate.url
    if (result?.kind === 'video' && result.url) return result.url
    if (result?.audioPreview?.previewUrl) return result.audioPreview.previewUrl
    return ''
  }, [localPreview, resolvedCandidate, result, shouldPreferAudioPreview])

  const restoreStoredState = useCallback((listId: string, nextEntries: Entry[]) => {
    const validIndices = new Set<number>(nextEntries.map((entry) => entry.index))
    const storedState = window.localStorage.getItem(storageKey(listId))
    let restoredDecisions: DecisionMap = {}
    let restoredIdx = 0
    let restoredFilter: ListFilter = 'pending'

    if (storedState) {
      try {
        const parsed = JSON.parse(storedState) as StoredListState
        restoredIdx = typeof parsed.idx === 'number' ? parsed.idx : 0
        restoredFilter = isListFilter(parsed.listFilter) ? parsed.listFilter : 'pending'
        restoredDecisions = Object.fromEntries(
          Object.entries(parsed.decisions || {}).filter(([entryIndex, decision]) => {
            return validIndices.has(Number(entryIndex)) && (decision === 'keep' || decision === 'skip')
          }),
        ) as DecisionMap
      } catch {
        restoredDecisions = {}
      }
    }

    return {
      restoredDecisions,
      restoredIdx: clamp(restoredIdx, 0, Math.max(nextEntries.length - 1, 0)),
      restoredFilter,
    }
  }, [])

  useEffect(() => {
    currentIndexRef.current = current?.index ?? null
  }, [current])

  useEffect(() => {
    if (!isListPickerOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!listPickerRef.current?.contains(event.target as Node)) {
        setIsListPickerOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsListPickerOpen(false)
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isListPickerOpen])

  useEffect(() => {
    ;(async () => {
      const response = await fetch('/api/music/lists')
      const json = await response.json()

      if (!json.ok) {
        setError(json.error || 'failed to load lists')
        return
      }

      const availableLists = Array.isArray(json.lists) ? json.lists as ListOption[] : []
      setLists(availableLists)

      const stored = window.localStorage.getItem(LAST_FILE_KEY)
      if (stored && availableLists.some((list) => list.id === stored)) {
        setSelectedFile(stored)
        return
      }

      if (!initialSelectedListId && availableLists[0]) {
        setSelectedFile(availableLists[0].id)
      }
    })()
  }, [initialSelectedListId])

  useEffect(() => {
    if (!selectedFile) return
    window.localStorage.setItem(LAST_FILE_KEY, selectedFile)
    prewarmedIndexRef.current = null
    setIsListPickerOpen(false)
  }, [selectedFile])

  useEffect(() => {
    if (!selectedFile) return

    if (!initialSelectionHandledRef.current && selectedFile === initialSelectedListId && initialEntries.length) {
      const restored = restoreStoredState(selectedFile, initialEntries)
      setDecisions(restored.restoredDecisions)
      setIdx(restored.restoredIdx)
      setListFilter(restored.restoredFilter)
      setHistory([])
      autoPreviewIndexRef.current = initialEntries[restored.restoredIdx]?.index ?? null
      initialSelectionHandledRef.current = true
      return
    }

    initialSelectionHandledRef.current = true

    ;(async () => {
      setLoadingEntries(true)
      setError(null)

      const response = await fetch('/api/music/load', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: selectedFile }),
      })

      const json = await response.json()
      if (!json.ok) {
        setLoadingEntries(false)
        setError(json.error || 'failed to load list')
        return
      }

      const nextEntries = Array.isArray(json.entries) ? json.entries : []
      const restored = restoreStoredState(selectedFile, nextEntries)
      const nextInitialResult = json.initialResult && json.initialResult.ok ? json.initialResult as SearchResult : null

      setEntries(nextEntries)
      setIdx(restored.restoredIdx)
      setDecisions(restored.restoredDecisions)
      setHistory([])
      setResult(nextInitialResult)
      setResultCache(nextEntries[0] && nextInitialResult ? { [nextEntries[0].index]: nextInitialResult } : {})
      setEmbedFailures({})
      setPlayerNotice(null)
      setResolvedCandidate(nextInitialResult ? candidateFromResult(nextInitialResult) : null)
      setPlayerPending(Boolean(nextInitialResult))
      setLocalPreview(null)
      setLocalPreviewError(null)
      setListFilter(restored.restoredFilter)
      autoPreviewIndexRef.current = nextEntries[restored.restoredIdx]?.index ?? null
      setLoadingEntries(false)
    })()
  }, [initialEntries, initialSelectedListId, restoreStoredState, selectedFile])

  useEffect(() => {
    if (!selectedFile || !entries.length) return
    window.localStorage.setItem(storageKey(selectedFile), JSON.stringify({ idx, decisions, listFilter }))
  }, [selectedFile, entries.length, idx, decisions, listFilter])

  useEffect(() => {
    if (!current) {
      setResult(null)
      setPlayerNotice(null)
      setResolvedCandidate(null)
      setPlayerPending(false)
      setLocalPreview(null)
      setLocalPreviewError(null)
      return
    }

    setResult(currentCache)
    setError(null)
    setPlayerNotice(null)
    setProbeEvents([])
    setEmbedErrorEvents([])
  }, [current, currentCache])

  useEffect(() => {
    if (!current) {
      setLocalPreview(null)
      setLoadingLocalPreview(false)
      setLocalPreviewError(null)
      return
    }

    let cancelled = false
    setLoadingLocalPreview(true)
    setLocalPreviewError(null)

    ;(async () => {
      try {
        const params = new URLSearchParams({
          artist: current.artist,
          album: current.album,
        })
        const response = await fetch(`/api/music/preview-cache?${params.toString()}`)
        const json = await response.json()
        if (cancelled) return
        if (!json.ok) throw new Error(json.error || 'failed to load local preview')
        setLocalPreview(json.preview || null)
      } catch (err: unknown) {
        if (cancelled) return
        setLocalPreview(null)
        setLocalPreviewError(err instanceof Error ? err.message : 'failed to load local preview')
      } finally {
        if (!cancelled) setLoadingLocalPreview(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [current])

  const keepEntries = useMemo(() => entries.filter((entry) => decisions[entry.index] === 'keep'), [entries, decisions])
  const skipEntries = useMemo(() => entries.filter((entry) => decisions[entry.index] === 'skip'), [entries, decisions])
  const reviewedCount = keepEntries.length + skipEntries.length
  const pendingEntries = useMemo(
    () => entries.filter((entry) => !(entry.index in decisions)),
    [entries, decisions],
  )
  const progressPct = entries.length ? Math.round((reviewedCount / entries.length) * 100) : 0

  const visibleEntries = useMemo(() => {
    if (listFilter === 'all') return entries
    if (listFilter === 'keep') return keepEntries
    if (listFilter === 'skip') return skipEntries
    return pendingEntries
  }, [entries, keepEntries, listFilter, pendingEntries, skipEntries])

  const upNextEntries = useMemo(() => {
    return entries
      .slice(idx + 1)
      .filter((entry) => !(entry.index in decisions))
      .slice(0, 4)
  }, [decisions, entries, idx])

  const recommendationEntries = useMemo(() => {
    return [...pendingEntries]
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
      .slice(0, 3)
  }, [pendingEntries])

  const alternateCandidates = useMemo(() => {
    if (!result) return []

    return (result.candidates || []).filter((candidate) => !sameCandidate(candidate, candidateFromResult(result)))
  }, [result])

  const newListPreview = useMemo(() => {
    const lines = newListText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const errors: string[] = []

    for (const [lineIndex, line] of lines.entries()) {
      const stripped = line
        .replace(/^\d+\.\s*/u, '')
        .replace(/\s+\((\d{4})\)(?:\s+\(([-\d.]+)\))?\s*$/u, '')
        .trim()

      const parts = stripped.split(' - ').map((part) => part.trim())
      if (parts.length < 2 || !parts[0] || !parts.slice(1).join(' - ').trim()) {
        errors.push(`Line ${lineIndex + 1} should use "Artist - Album".`)
      }
    }

    return {
      count: lines.length,
      sample: lines.slice(0, 3),
      errors: errors.slice(0, 3),
    }
  }, [newListText])

  const search = useCallback(async (
    entry?: Entry,
    options?: { force?: boolean; background?: boolean; activate?: boolean; resolve?: boolean },
  ) => {
    const row = entry || current
    if (!row) return null

    const force = options?.force ?? false
    const background = options?.background ?? false
    const activate = options?.activate ?? !background
    const resolve = options?.resolve ?? true

    if (!force && resultCache[row.index]) {
      if (activate && currentIndexRef.current === row.index) {
        setResult(resultCache[row.index])
        setError(null)
      }

      return resultCache[row.index]
    }

    if (!background && currentIndexRef.current === row.index) {
      setSearching(true)
      setError(null)
    }

    const existingRequest = inFlightSearchesRef.current.get(row.index)
    if (existingRequest) return existingRequest

    const request = (async () => {
      try {
        const response = await fetch('/api/music/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ artist: row.artist, album: row.album, query: row.query, resolve }),
        })

        const json = await response.json()
        if (!json.ok) {
          if (response.status === 404 && !resolve) {
            if (activate && currentIndexRef.current === row.index) {
              setResult(null)
              setError(null)
            }

            return null
          }

          throw new Error(json.error || 'search failed')
        }

        setResultCache((cache) => ({ ...cache, [row.index]: json }))

        if (activate && currentIndexRef.current === row.index) {
          setResult(json)
          setError(null)
        }

        return json as SearchResult
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'search failed'

        if (activate && currentIndexRef.current === row.index) {
          setResult(null)
          setError(message)
        }

        return null
      } finally {
        inFlightSearchesRef.current.delete(row.index)

        if (!background && currentIndexRef.current === row.index) {
          setSearching(false)
        }
      }
    })()

    inFlightSearchesRef.current.set(row.index, request)
    return await request
  }, [current, resultCache])

  const chooseCandidate = useCallback((candidate: SearchCandidate) => {
    if (!current || !result) return

    const nextResult = {
      ...result,
      kind: candidate.kind,
      videoId: candidate.videoId,
      playlistId: candidate.playlistId,
      title: candidate.title,
      channel: candidate.channel,
      url: candidate.url,
      embedUrl: candidate.embedUrl,
    }

    setResult(nextResult)
    setResultCache((cache) => ({ ...cache, [current.index]: nextResult }))
    setPlayerNotice(null)
    setResolvedCandidate(candidate)
    setPlayerPending(false)

    void fetch('/api/music/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        artist: current.artist,
        album: current.album,
        query: current.query,
        selectedResult: nextResult,
      }),
    })
  }, [current, result])

  const handleEmbedError = useCallback((resourceId: string, errorCode: number) => {
    if (!current || !result) return

    const knownFailedIds = embedFailures[current.index] || []
    const failedIds = new Set([...knownFailedIds, resourceId])

    setEmbedFailures((existing) => ({
      ...existing,
      [current.index]: Array.from(failedIds),
    }))
    setEmbedErrorEvents((existing) => [...existing, { candidateId: resourceId, errorCode }])
    setProbeEvents((existing) => [...existing, `embed error ${errorCode} for ${resourceId}`])
    setResolvedCandidate(null)
    setPlayerPending(true)
    setPlayerNotice(`Embed error ${errorCode}. Trying another preview candidate…`)
  }, [current, embedFailures, result])

  const handlePlaybackReady = useCallback(() => {
    setPlayerPending(false)
    setPlayerNotice(null)
    setProbeEvents((existing) => [...existing, 'visible player reported ready'])
  }, [])

  useEffect(() => {
    if (!current || !result) {
      setResolvedCandidate(null)
      setPlayerPending(false)
      return
    }

    if (localPreview?.localUrl) {
      setResolvedCandidate(null)
      setPlayerPending(false)
      setPlayerNotice('Using the cached local preview for this album.')
      return
    }

    if (shouldPreferAudioPreview && result.audioPreview?.previewUrl) {
      setResolvedCandidate(null)
      setPlayerPending(false)
      setPlayerNotice('Using the album preview because YouTube embeds are unreliable for this result.')
      return
    }

    const failedIds = new Set(embedFailures[current.index] || [])
    const allCandidates = [candidateFromResult(result), ...alternateCandidates]
    const relevantCandidates = allCandidates.filter((candidate) => isAlbumRelevantCandidate(current, candidate))
    const candidatePool = relevantCandidates.length ? relevantCandidates : allCandidates
    const candidates = candidatePool.filter((candidate, index, list) => (
      !failedIds.has(candidateId(candidate)) && list.findIndex((item) => sameCandidate(item, candidate)) === index
    ))

    if (!candidates.length) {
      setResolvedCandidate(null)
      setPlayerPending(false)
      setPlayerNotice(
        result.audioPreview?.previewUrl
          ? 'YouTube embeds are unavailable for this result here. Using a 30-second album preview instead.'
          : 'No embeddable preview candidate worked. Use Open YouTube or try another alternate match.',
      )
      return
    }

    let cancelled = false
    setPlayerPending(true)

    const resolveCandidate = async () => {
      for (const candidate of candidates) {
        setProbeEvents((existing) => [...existing, `probing ${candidate.kind}:${candidateId(candidate)} ${candidate.title}`])
        const ok = await probePlayableCandidate(candidate, playerOrigin)
        if (cancelled) return

        if (ok) {
          setProbeEvents((existing) => [...existing, `probe accepted ${candidate.kind}:${candidateId(candidate)}`])
          setResolvedCandidate(candidate)
          setPlayerPending(true)
          if (failedIds.size) {
            setPlayerNotice('Trying another preview candidate…')
          } else {
            setPlayerNotice(null)
          }
          if (!sameCandidate(candidate, candidateFromResult(result)) && isAlbumRelevantCandidate(current, candidate)) {
            chooseCandidate(candidate)
          }
          return
        }

        setProbeEvents((existing) => [...existing, `probe rejected ${candidate.kind}:${candidateId(candidate)}`])
      }

      if (cancelled) return
      setResolvedCandidate(null)
      setPlayerPending(false)
      setPlayerNotice(
        result.audioPreview?.previewUrl
          ? 'YouTube embeds are unavailable for this result here. Using a 30-second album preview instead.'
          : 'No embeddable preview candidate worked. Use Open YouTube or try another alternate match.',
      )
    }

    void resolveCandidate()

    return () => {
      cancelled = true
    }
  }, [alternateCandidates, chooseCandidate, current, embedFailures, localPreview, playerOrigin, result, shouldPreferAudioPreview])

  useEffect(() => {
    if (!result?.audioPreview?.previewUrl || resolvedCandidate || playerPending) return
    setPlayerNotice('YouTube embeds are unavailable for this result here. Using a 30-second album preview instead.')
  }, [playerPending, resolvedCandidate, result])

  const debugTrace = useMemo(() => {
    if (!result) return null

    return {
      ...(result.debug || {}),
      client: {
        failedCandidateIds: current ? (embedFailures[current.index] || []) : [],
        chosenCandidateId: resolvedCandidate ? candidateId(resolvedCandidate) : null,
        playerNotice,
        probeEvents,
        embedErrors: embedErrorEvents,
        finalPreviewMode: localPreview
          ? 'local-preview'
          : resolvedCandidate
          ? 'youtube'
          : result.audioPreview?.previewUrl && !playerPending
            ? 'audio-preview'
            : playerPending
              ? null
              : 'none',
      },
    }
  }, [current, embedErrorEvents, embedFailures, localPreview, playerNotice, playerPending, probeEvents, resolvedCandidate, result])

  useEffect(() => {
    if (!showDebugTrace || !debugTrace) return
    console.debug('[music-trace]', debugTrace)
  }, [debugTrace, showDebugTrace])

  const applyDecision = useCallback((decision: Decision, options?: { autoPreviewNext?: boolean }) => {
    if (!current) return

    const previous = decisions[current.index] ?? null
    const next = previous === decision ? null : decision
    const updatedDecisions = { ...decisions }

    if (next) updatedDecisions[current.index] = next
    else delete updatedDecisions[current.index]

    setDecisions(updatedDecisions)

    setHistory((existing) => [...existing, { entryIndex: current.index, previous, next }])

    const nextIdx = findNextPendingIndex(entries, updatedDecisions, idx)
    const nextEntry = entries[nextIdx] || null

    if (nextEntry) {
      setIdx(nextIdx)
      autoPreviewIndexRef.current = options?.autoPreviewNext ? nextEntry.index : null
    }
  }, [current, decisions, entries, idx])

  const undoLast = useCallback(() => {
    const last = history[history.length - 1]
    if (!last) return

    setHistory((existing) => existing.slice(0, -1))
    setDecisions((existing) => {
      const updated = { ...existing }
      if (last.previous) updated[last.entryIndex] = last.previous
      else delete updated[last.entryIndex]
      return updated
    })

    const targetIdx = entries.findIndex((entry) => entry.index === last.entryIndex)
    if (targetIdx >= 0) setIdx(targetIdx)
  }, [entries, history])

  const moveSelection = useCallback((delta: number) => {
    if (!entries.length) return
    setIdx((currentIdx) => clamp(currentIdx + delta, 0, entries.length - 1))
  }, [entries.length])

  const previewCurrent = useCallback(() => {
    void search(undefined, { force: !!result, resolve: true })
  }, [result, search])

  const keepCurrent = useCallback(() => {
    applyDecision('keep')
  }, [applyDecision])

  const skipCurrent = useCallback(() => {
    applyDecision('skip', { autoPreviewNext: true })
  }, [applyDecision])

  const undoShortcut = useCallback(() => {
    undoLast()
  }, [undoLast])

  const openCurrentResult = useCallback(() => {
    if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }, [result?.url])

  const cacheCurrentPreview = useCallback(async () => {
    if (!current || !previewSourceUrl) return

    setCachingLocalPreview(true)
    setLocalPreviewError(null)

    try {
      const response = await fetch('/api/music/preview-cache', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          artist: current.artist,
          album: current.album,
          title: result?.title || current.album,
          channel: result?.channel || current.artist,
          sourceUrl: previewSourceUrl,
        }),
      })
      const json = await response.json()
      if (!json.ok) throw new Error(json.error || 'failed to cache local preview')
      setLocalPreview(json.preview || null)
      setPlayerNotice('Local preview cached. This album can now play from local storage.')
    } catch (err: unknown) {
      setLocalPreviewError(err instanceof Error ? err.message : 'failed to cache local preview')
    } finally {
      setCachingLocalPreview(false)
    }
  }, [current, previewSourceUrl, result])

  const submitNewList = useCallback(async () => {
    if (!newListName.trim()) {
      setListFormError('List name is required.')
      return
    }

    if (!newListText.trim()) {
      setListFormError('Paste at least one "Artist - Album" line.')
      return
    }

    if (newListPreview.errors.length) {
      setListFormError(newListPreview.errors[0])
      return
    }

    setSavingList(true)
    setListFormError(null)

    try {
      const response = await fetch('/api/music/community', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newListName, text: newListText }),
      })

      const json = await response.json()
      if (!json.ok) throw new Error(json.error || 'failed to save list')

      const nextList: ListOption = {
        id: `community:${json.list.id}`,
        label: json.list.name,
        source: 'community',
      }

      setLists((existing) => [...existing, nextList])
      setSelectedFile(nextList.id)
      setNewListName('')
      setNewListText('')
      setIsAddListOpen(false)
    } catch (e: unknown) {
      setListFormError(e instanceof Error ? e.message : 'failed to save list')
    } finally {
      setSavingList(false)
    }
  }, [newListName, newListPreview.errors, newListText])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName

      if (target?.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      switch (event.key) {
        case 'ArrowDown':
        case 'j':
          event.preventDefault()
          moveSelection(1)
          break
        case 'ArrowUp':
        case 'k':
          event.preventDefault()
          moveSelection(-1)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          previewCurrent()
          break
        case 'f':
          event.preventDefault()
          keepCurrent()
          break
        case 'x':
          event.preventDefault()
          skipCurrent()
          break
        case 'z':
          event.preventDefault()
          undoShortcut()
          break
        case 'o':
          event.preventDefault()
          openCurrentResult()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keepCurrent, moveSelection, openCurrentResult, previewCurrent, skipCurrent, undoShortcut])

  useEffect(() => {
    if (!current || autoPreviewIndexRef.current !== current.index) return

    autoPreviewIndexRef.current = null
    void search(current, { activate: true, resolve: false })
  }, [current, search])

  useEffect(() => {
    const nextEntry = entries
      .slice(idx + 1)
      .find((entry) => !(entry.index in decisions) && !resultCache[entry.index])

    if (!nextEntry) return
    if (prewarmedIndexRef.current === nextEntry.index) return

    prewarmedIndexRef.current = nextEntry.index
    void search(nextEntry, { background: true, activate: false, resolve: false })
  }, [decisions, entries, idx, resultCache, search])

  return (
    <main className="music-page">
      <div className="music-backdrop" />

      <div className="music-shell">
        <header className="masthead">
          <div className="masthead-copy">
            <p className="eyebrow">Review workstation</p>
            <h1>Music Scan Deck</h1>
            <p className="lede">
              Move through album lists quickly, verify the strongest match, and keep only what deserves another listen.
            </p>
          </div>

          <div className="masthead-meta">
            <span className="meta-chip accent">{selectedList ? selectedList.label : 'No list'} · {pendingEntries.length} pending</span>
            <span className="meta-chip">Enter preview · F keep · X skip · Z undo</span>
            <span className="meta-chip subtle">Remembers per-list state</span>
          </div>
        </header>

        <section className="workspace-grid">
          <div className="primary-stack">
            <div className="panel current-panel">
              <div className="current-topline">
                <div className="list-picker">
                  <label htmlFor="music-list-trigger">List</label>
                  <div className="list-picker-row">
                    <div className="custom-picker" ref={listPickerRef}>
                      <button
                        id="music-list-trigger"
                        type="button"
                        className={`picker-trigger ${isListPickerOpen ? 'open' : ''}`}
                        aria-haspopup="listbox"
                        aria-expanded={isListPickerOpen}
                        onClick={() => setIsListPickerOpen((open) => !open)}
                      >
                        <div className="picker-trigger-copy">
                          <span className="picker-kicker">Current crate</span>
                          <strong>{selectedList ? selectedList.label : 'Choose a list'}</strong>
                          <span className="picker-meta">
                            <span className={`picker-source ${selectedList?.source || 'built-in'}`}>
                              {selectedList?.source === 'community' ? 'Community' : 'Built-in'}
                            </span>
                            <span>{entries.length || 0} items</span>
                          </span>
                        </div>
                        <span className={`picker-chevron ${isListPickerOpen ? 'open' : ''}`}>▾</span>
                      </button>

                      {isListPickerOpen ? (
                        <div className="picker-popover" role="listbox" aria-label="Music lists">
                          {builtInLists.length ? (
                            <div className="picker-group">
                              <p className="picker-group-label">Built-in</p>
                              <div className="picker-options">
                                {builtInLists.map((list) => (
                                  <button
                                    key={list.id}
                                    type="button"
                                    className={`picker-option ${selectedFile === list.id ? 'active' : ''}`}
                                    onClick={() => setSelectedFile(list.id)}
                                  >
                                    <span className="picker-option-title">{list.label}</span>
                                    <span className="picker-option-tag built-in">Built-in</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {communityLists.length ? (
                            <div className="picker-group">
                              <p className="picker-group-label">Community</p>
                              <div className="picker-options">
                                {communityLists.map((list) => (
                                  <button
                                    key={list.id}
                                    type="button"
                                    className={`picker-option ${selectedFile === list.id ? 'active' : ''}`}
                                    onClick={() => setSelectedFile(list.id)}
                                  >
                                    <span className="picker-option-title">{list.label}</span>
                                    <span className="picker-option-tag community">Community</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="add-list-btn"
                      onClick={() => {
                        setListFormError(null)
                        setIsAddListOpen(true)
                      }}
                    >
                      Add List
                    </button>
                  </div>
                </div>

                <div className="scan-stats">
                  <div className="stat-block">
                    <span className="stat-label">Position</span>
                    <strong>{entries.length ? `${idx + 1}/${entries.length}` : '0/0'}</strong>
                  </div>
                  <div className="stat-block">
                    <span className="stat-label">Reviewed</span>
                    <strong>{reviewedCount}</strong>
                  </div>
                  <div className="stat-block">
                    <span className="stat-label">Shortlist</span>
                    <strong>{keepEntries.length}</strong>
                  </div>
                </div>
              </div>

              {current ? (
                <>
                  <div className="current-spotlight">
                    <div className="current-copy">
                      <p className="eyebrow accent">Now scanning</p>
                      <h2>{current.artist}</h2>
                      <p className="album-title">{current.album}</p>

                      <div className="detail-row">
                        <span className="detail-chip">#{current.index}</span>
                        {current.year ? <span className="detail-chip">{current.year}</span> : null}
                        {current.score !== null ? <span className="detail-chip">Score {current.score.toFixed(2)}</span> : null}
                        {currentDecision ? <span className={`detail-chip decision ${currentDecision}`}>{currentDecision}</span> : <span className="detail-chip muted">Unreviewed</span>}
                      </div>
                    </div>

                    <div className="scan-progress">
                      <div className="progress-head">
                        <span>Review progress</span>
                        <strong>{progressPct}%</strong>
                      </div>
                      <div className="progress-bar">
                        <span style={{ width: `${progressPct}%` }} />
                      </div>
                      <p className="progress-caption">
                        {pendingEntries.length ? `${pendingEntries.length} still waiting for a decision` : 'This list is fully reviewed'}
                      </p>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="action-btn primary" onClick={previewCurrent} disabled={searching || loadingEntries}>
                      {previewButtonLabel(searching, !!result)}
                    </button>
                    <button className={`action-btn decision-btn keep ${currentDecision === 'keep' ? 'active' : ''}`} onClick={() => applyDecision('keep')}>
                      {currentDecision === 'keep' ? 'Kept' : 'Keep'}
                    </button>
                    <button className={`action-btn decision-btn skip ${currentDecision === 'skip' ? 'active' : ''}`} onClick={() => applyDecision('skip')}>
                      {currentDecision === 'skip' ? 'Skipped' : 'Skip'}
                    </button>
                    <button className="action-btn ghost" onClick={undoLast} disabled={!history.length}>
                      Undo
                    </button>
                    <button className="action-btn ghost" onClick={() => result?.url && window.open(result.url, '_blank', 'noopener,noreferrer')} disabled={!result?.url}>
                      Open YouTube
                    </button>
                    <button
                      className="action-btn ghost"
                      onClick={() => void cacheCurrentPreview()}
                      disabled={!previewSourceUrl || cachingLocalPreview || loadingLocalPreview}
                    >
                      {cachingLocalPreview ? 'Caching…' : localPreview ? 'Refresh Local Preview' : 'Cache Local Preview'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state compact">
                  <strong>No list loaded yet</strong>
                  <p>{loadingEntries ? 'Loading music list…' : 'Choose a list to start scanning.'}</p>
                </div>
              )}
            </div>

            <section className="panel media-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow accent">Preview</p>
                  <h3>{current ? `${current.artist} - ${current.album}` : 'Preview player'}</h3>
                </div>

                {result ? (
                  <span className={`confidence-pill ${result.confidence}`}>{confidenceLabel(result.confidence)}</span>
                ) : null}
              </div>

              {result ? (
                <>
                  <div className="match-meta">
                    <div>
                      <strong>{result.title}</strong>
                      <p>{result.channel || 'Unknown channel'}</p>
                    </div>
                    <div className="candidate-score">Score {result.candidates[0]?.score.toFixed(1) ?? '0.0'}</div>
                  </div>

                  {result.warning ? <div className="warning-banner">{result.warning}</div> : null}

                  {localPreview ? (
                    <div className="audio-preview-card">
                      <div className="audio-preview-art">
                        {result.audioPreview?.artworkUrl600 || result.audioPreview?.artworkUrl100 ? (
                          <Image
                            src={(result.audioPreview.artworkUrl600 || result.audioPreview.artworkUrl100)!}
                            alt={`${current?.album || result.title} cover art`}
                            width={600}
                            height={600}
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="audio-preview-copy">
                        <p className="audio-preview-kicker">Local preview cache</p>
                        <strong>{localPreview.title}</strong>
                        <span>{localPreview.channel}</span>
                        <small>{localPreview.artist} · {localPreview.album}</small>
                        <audio
                          key={localPreview.localUrl}
                          controls
                          preload="metadata"
                          className="audio-preview-player"
                          src={localPreview.localUrl}
                        />
                      </div>
                    </div>
                  ) : shouldPreferAudioPreview && result.audioPreview?.previewUrl ? (
                    <div className="audio-preview-card">
                      <div className="audio-preview-art">
                        {result.audioPreview.artworkUrl600 || result.audioPreview.artworkUrl100 ? (
                          <Image
                            src={(result.audioPreview.artworkUrl600 || result.audioPreview.artworkUrl100)!}
                            alt={`${result.audioPreview.collectionName} cover art`}
                            width={600}
                            height={600}
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="audio-preview-copy">
                        <p className="audio-preview-kicker">Album preview fallback</p>
                        <strong>{result.audioPreview.trackName}</strong>
                        <span>{result.audioPreview.artistName}</span>
                        <small>{result.audioPreview.collectionName}</small>
                        <audio
                          key={result.audioPreview.previewUrl}
                          controls
                          preload="metadata"
                          className="audio-preview-player"
                          src={result.audioPreview.previewUrl}
                        />
                      </div>
                    </div>
                  ) : resolvedCandidate && !playerPending ? (
                    <YouTubePreviewPlayer
                      className="player-frame"
                      kind={resolvedCandidate.kind}
                      videoId={resolvedCandidate.videoId}
                      playlistId={resolvedCandidate.playlistId}
                      origin={playerOrigin}
                      onPlaybackReady={handlePlaybackReady}
                      onEmbedError={handleEmbedError}
                    />
                  ) : !playerPending && result.audioPreview?.previewUrl ? (
                    <div className="audio-preview-card">
                      <div className="audio-preview-art">
                        {result.audioPreview.artworkUrl600 || result.audioPreview.artworkUrl100 ? (
                          <Image
                            src={(result.audioPreview.artworkUrl600 || result.audioPreview.artworkUrl100)!}
                            alt={`${result.audioPreview.collectionName} cover art`}
                            width={600}
                            height={600}
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="audio-preview-copy">
                        <p className="audio-preview-kicker">Album preview fallback</p>
                        <strong>{result.audioPreview.trackName}</strong>
                        <span>{result.audioPreview.artistName}</span>
                        <small>{result.audioPreview.collectionName}</small>
                        <audio
                          key={result.audioPreview.previewUrl}
                          controls
                          preload="none"
                          className="audio-preview-player"
                          src={result.audioPreview.previewUrl}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="player-placeholder" aria-hidden="true">
                      <div className="player-placeholder-bar short" />
                      <div className="player-placeholder-bar" />
                      <div className="player-placeholder-bar" />
                    </div>
                  )}

                  <div className="player-feedback" aria-live="polite">
                    {playerNotice ? <div className="warning-banner">{playerNotice}</div> : null}
                    {localPreviewError ? <div className="error-banner">Local preview error: {localPreviewError}</div> : null}
                  </div>

                  {showDebugTrace && debugTrace ? (
                    <details className="debug-trace-panel">
                      <summary>Debug trace</summary>
                      <div className="debug-trace-grid">
                        <div>
                          <span className="debug-label">Provider</span>
                          <strong>{debugTrace.server?.provider || 'unknown'}</strong>
                        </div>
                        <div>
                          <span className="debug-label">Cache</span>
                          <strong>{debugTrace.server?.cache || 'unknown'}</strong>
                        </div>
                        <div>
                          <span className="debug-label">Fallback</span>
                          <strong>{debugTrace.server?.resolverFallback || 'none'}</strong>
                        </div>
                        <div>
                          <span className="debug-label">Final mode</span>
                          <strong>{debugTrace.client?.finalPreviewMode || 'pending'}</strong>
                        </div>
                      </div>

                      {debugTrace.server?.notes?.length ? (
                        <div className="debug-block">
                          <span className="debug-label">Server notes</span>
                          <ul>
                            {debugTrace.server.notes.map((note) => (
                              <li key={note}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {debugTrace.client?.probeEvents?.length ? (
                        <div className="debug-block">
                          <span className="debug-label">Probe events</span>
                          <ul>
                            {debugTrace.client.probeEvents.map((event, index) => (
                              <li key={`${index}:${event}`}>{event}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {debugTrace.client?.embedErrors?.length ? (
                        <div className="debug-block">
                          <span className="debug-label">Embed errors</span>
                          <ul>
                            {debugTrace.client.embedErrors.map((event, index) => (
                              <li key={`${index}:${event.candidateId}:${event.errorCode}`}>
                                {event.candidateId}: {event.errorCode}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {debugTrace.server?.candidates?.length ? (
                        <div className="debug-block">
                          <span className="debug-label">Server candidates</span>
                          <ul>
                            {debugTrace.server.candidates.map((candidate) => (
                              <li key={`${candidate.kind}:${candidate.videoId || candidate.playlistId || candidate.title}`}>
                                {candidate.kind} · {candidate.title} · {candidate.score.toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </details>
                  ) : null}

                  {alternateCandidates.length ? (
                    <div className="alternate-matches">
                      <p className="alternate-label">
                        {usingAudioFallback ? 'Blocked YouTube alternates' : 'Alternate matches'}
                      </p>
                      <div className="alternate-grid">
                        {alternateCandidates.map((candidate) => (
                          <button key={`${candidate.kind}:${candidateId(candidate)}`} className="alternate-card" onClick={() => chooseCandidate(candidate)}>
                            <strong>{candidate.title}</strong>
                            <span>{candidate.channel}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state media">
                  <strong>{loadingEntries ? 'Loading your scan deck…' : 'No saved preview yet'}</strong>
                  <p>
                    {current
                      ? 'Saved matches appear automatically. Press Resolve Preview to spend one live YouTube search for this record.'
                      : 'Choose a list to begin.'}
                  </p>
                  {current ? (
                    <div className="preview-prompt">
                      <span>Current focus</span>
                      <strong>{current.artist} · {current.album}</strong>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? <div className="error-banner">Search error: {error}</div> : null}
            </section>
          </div>

          <aside className="panel side-panel">
            <div className="side-section">
              <p className="eyebrow accent">Shortlist</p>
              <h3>{keepEntries.length ? `${keepEntries.length} worth revisiting` : 'Nothing kept yet'}</h3>

              {keepEntries.length ? (
                <div className="shortlist">
                  {keepEntries.slice(0, 8).map((entry) => (
                    <button
                      key={entry.index}
                      className={`shortlist-item ${current?.index === entry.index ? 'active' : ''}`}
                      onClick={() => setIdx(entries.findIndex((candidate) => candidate.index === entry.index))}
                    >
                      <span>{entry.artist}</span>
                      <small>{entry.album}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="smart-empty">
                  <p className="side-copy">Use Keep to build a fast shortlist while you scan.</p>
                  {recommendationEntries.length ? (
                    <div className="smart-stack">
                      <p className="smart-label">Best unresolved scores</p>
                      {recommendationEntries.map((entry) => (
                        <button
                          key={entry.index}
                          className="smart-item"
                          onClick={() => setIdx(entries.findIndex((candidate) => candidate.index === entry.index))}
                        >
                          <span>{entry.artist}</span>
                          <small>{entry.album}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="side-section">
              <p className="eyebrow accent">Up next</p>
              {upNextEntries.length ? (
                <ul className="side-list">
                  {upNextEntries.map((entry) => (
                    <li key={entry.index}>
                      <strong>{entry.artist}</strong>
                      <span>{entry.album}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="side-copy">No pending items after the current selection.</p>
              )}
            </div>

            <div className="side-section">
              <p className="eyebrow accent">Recent actions</p>
              {history.length ? (
                <ul className="side-list history-list">
                  {history.slice(-4).reverse().map((item, actionIndex) => {
                    const entry = entries.find((candidate) => candidate.index === item.entryIndex)
                    if (!entry) return null

                    return (
                      <li key={`${item.entryIndex}-${actionIndex}`}>
                        <strong>{entry.artist}</strong>
                        <span>{item.next ? `${item.next} · ${entry.album}` : `cleared · ${entry.album}`}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="side-copy">Your review trail will appear here as you work.</p>
              )}
            </div>
          </aside>
        </section>

        <section className="panel queue-panel">
          <div className="panel-head queue-head">
            <div>
              <p className="eyebrow accent">Queue</p>
              <h3>Browse the full list without losing the current decision flow</h3>
            </div>

            <div className="filter-row">
              {(['pending', 'all', 'keep', 'skip'] as ListFilter[]).map((filter) => (
                <button
                  key={filter}
                  className={`filter-chip ${listFilter === filter ? 'active' : ''}`}
                  onClick={() => setListFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="queue-list">
            {visibleEntries.length ? (
              visibleEntries.map((entry) => {
                const entryDecision = decisions[entry.index] ?? null
                const entryIdx = entries.findIndex((candidate) => candidate.index === entry.index)
                const isActive = current?.index === entry.index
                const hasCachedMatch = !!resultCache[entry.index]

                return (
                  <button
                    key={entry.index}
                    className={`queue-row ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (isActive && !hasCachedMatch) {
                        void search(entry)
                        return
                      }

                      setIdx(entryIdx)
                    }}
                  >
                    <div className={`queue-dot ${entryDecision || 'pending'}`} />

                    <div className="queue-copy">
                      <div className="queue-title">
                        <strong>{entry.artist}</strong>
                        <span>{entry.album}</span>
                      </div>
                      <div className="queue-meta">
                        <span>#{entry.index}</span>
                        {entry.year ? <span>{entry.year}</span> : null}
                        {entry.score !== null ? <span>{entry.score.toFixed(2)}</span> : null}
                        {hasCachedMatch ? <span>preview ready</span> : null}
                      </div>
                    </div>

                    <div className="queue-badges">
                      {entryDecision ? <span className={`row-pill ${entryDecision}`}>{entryDecision}</span> : null}
                      {hasCachedMatch ? <span className="row-pill ready">ready</span> : null}
                      {isActive ? <span className="row-pill active">current</span> : null}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="empty-state compact">
                <strong>No rows in this filter</strong>
                <p>Switch filters to see the rest of the queue.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {isAddListOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (savingList) return
            setIsAddListOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow accent">Add list</p>
                <h3>Paste a shared album list</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsAddListOpen(false)}
                disabled={savingList}
              >
                Close
              </button>
            </div>

            <p className="modal-copy">
              One album per line. Use <code>Artist - Album</code>. Leading numbers are okay.
            </p>

            <div className="modal-form">
              <label className="modal-field">
                <span>List name</span>
                <input
                  value={newListName}
                  onChange={(event) => setNewListName(event.target.value)}
                  placeholder="Spring picks"
                />
              </label>

              <label className="modal-field">
                <span>List text</span>
                <textarea
                  value={newListText}
                  onChange={(event) => setNewListText(event.target.value)}
                  placeholder={`1. Rosalia - Lux\n2. Geese - Getting Killed\n3. Oneohtrix Point Never - Tranquilizer`}
                  rows={12}
                />
              </label>
            </div>

            <div className="modal-preview">
              <div className="modal-preview-head">
                <strong>{newListPreview.count} lines detected</strong>
                <span>{publishEnabled ? 'Saves globally for everyone' : 'Saves locally in this project on this machine'}</span>
              </div>

              {newListPreview.sample.length ? (
                <div className="preview-lines">
                  {newListPreview.sample.map((line, index) => (
                    <code key={`${line}-${index}`}>{line}</code>
                  ))}
                </div>
              ) : null}

              {newListPreview.errors.length ? (
                <div className="error-banner">
                  {newListPreview.errors.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              ) : null}

              {listFormError && !newListPreview.errors.length ? (
                <div className="error-banner">Save error: {listFormError}</div>
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="action-btn ghost"
                onClick={() => setIsAddListOpen(false)}
                disabled={savingList}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => void submitNewList()}
                disabled={savingList}
              >
                {savingList ? 'Saving…' : 'Save list'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        :global(body) {
          background: #07101d;
        }

        .music-page {
          --bg: #07101d;
          --panel: rgba(11, 22, 41, 0.84);
          --panel-strong: rgba(16, 31, 55, 0.94);
          --line: rgba(128, 166, 255, 0.18);
          --text: #edf3ff;
          --muted: #94a5c7;
          --accent: #7dd3fc;
          --accent-strong: #8b5cf6;
          --warm: #f7c873;
          --keep: #6dd6a8;
          --skip: #f59f85;
          min-height: 100vh;
          color: var(--text);
          background:
            radial-gradient(circle at 14% 10%, rgba(94, 234, 212, 0.18), transparent 0 30%),
            radial-gradient(circle at 86% 8%, rgba(247, 200, 115, 0.19), transparent 0 26%),
            radial-gradient(circle at 52% 120%, rgba(125, 211, 252, 0.12), transparent 0 40%),
            linear-gradient(180deg, #0a1428 0%, #050b15 100%);
          padding: 32px 18px 80px;
        }

        .music-backdrop {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 14% 16%, rgba(125, 211, 252, 0.2), transparent 0 24%),
            radial-gradient(circle at 84% 10%, rgba(251, 191, 36, 0.18), transparent 0 22%),
            radial-gradient(circle at 55% 100%, rgba(139, 92, 246, 0.14), transparent 0 34%);
          filter: blur(16px);
        }

        .music-shell {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .masthead {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: start;
          padding: 2px 4px 0;
        }

        .masthead-copy {
          display: grid;
          gap: 6px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: var(--warm);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .eyebrow.accent {
          color: var(--accent);
        }

        h1 {
          margin: 0;
          font-size: clamp(1.75rem, 3.6vw, 3.15rem);
          line-height: 0.92;
          letter-spacing: -0.05em;
        }

        .lede {
          max-width: 54ch;
          margin: 0;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .masthead-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 520px;
        }

        .meta-chip {
          border: 1px solid var(--line);
          background: rgba(11, 20, 37, 0.72);
          padding: 7px 10px;
          border-radius: 999px;
          color: var(--text);
          font-size: 10px;
        }

        .meta-chip.accent {
          border-color: rgba(125, 211, 252, 0.28);
          background: rgba(19, 41, 68, 0.78);
        }

        .meta-chip.subtle {
          color: var(--muted);
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.68fr) minmax(280px, 0.78fr);
          gap: 14px;
        }

        .primary-stack {
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .panel {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(17, 29, 50, 0.92), rgba(9, 17, 30, 0.92));
          box-shadow:
            0 18px 50px rgba(3, 8, 20, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .current-panel,
        .side-panel,
        .media-panel,
        .queue-panel {
          padding: 16px;
        }

        .current-panel {
          display: grid;
          gap: 14px;
          overflow: visible;
        }

        .current-topline {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
        }

        .list-picker {
          display: grid;
          gap: 8px;
          width: min(360px, 100%);
        }

        .list-picker-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
        }

        .list-picker label {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .custom-picker {
          position: relative;
        }

        .picker-trigger {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: 16px 18px;
          border-radius: 24px;
          border: 1px solid rgba(125, 211, 252, 0.22);
          background:
            linear-gradient(135deg, rgba(20, 39, 67, 0.95), rgba(8, 17, 31, 0.94)),
            rgba(11, 21, 39, 0.92);
          color: var(--text);
          cursor: pointer;
          text-align: left;
          font: inherit;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 10px 28px rgba(4, 9, 21, 0.18);
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .picker-trigger:hover,
        .picker-trigger.open {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.34);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 18px 38px rgba(4, 9, 21, 0.24);
        }

        .picker-trigger-copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .picker-kicker {
          color: var(--accent);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .picker-trigger strong {
          display: block;
          font-size: 1.15rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .picker-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          color: var(--muted);
          font-size: 12px;
        }

        .picker-source,
        .picker-option-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 14, 27, 0.6);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .picker-source.community,
        .picker-option-tag.community {
          color: var(--warm);
          border-color: rgba(247, 200, 115, 0.22);
          background: rgba(247, 200, 115, 0.1);
        }

        .picker-source.built-in,
        .picker-option-tag.built-in {
          color: var(--accent);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(125, 211, 252, 0.08);
        }

        .picker-chevron {
          font-size: 1.2rem;
          color: #d7e4ff;
          transition: transform 160ms ease;
        }

        .picker-chevron.open {
          transform: rotate(180deg);
        }

        .picker-popover {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          z-index: 12;
          display: grid;
          gap: 12px;
          padding: 14px;
          border-radius: 24px;
          border: 1px solid rgba(125, 211, 252, 0.16);
          background:
            linear-gradient(180deg, rgba(16, 29, 50, 0.98), rgba(8, 15, 28, 0.98)),
            rgba(9, 17, 30, 0.96);
          box-shadow: 0 28px 60px rgba(1, 5, 14, 0.46);
          backdrop-filter: blur(14px);
        }

        .picker-group {
          display: grid;
          gap: 8px;
        }

        .picker-group-label {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .picker-options {
          display: grid;
          gap: 8px;
          max-height: 280px;
          overflow: auto;
          padding: 2px 10px 2px 2px;
          scrollbar-gutter: stable;
        }

        .picker-option {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          min-width: 0;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 18, 33, 0.86);
          color: var(--text);
          cursor: pointer;
          text-align: left;
          font: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .picker-option:hover,
        .picker-option.active {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(14, 28, 49, 0.95);
          box-shadow: 0 12px 24px rgba(4, 9, 21, 0.16);
        }

        .picker-option-title {
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .picker-option-tag {
          flex: 0 0 auto;
        }

        .add-list-btn,
        .close-btn {
          border-radius: 14px;
          border: 1px solid rgba(125, 211, 252, 0.18);
          background: rgba(12, 23, 41, 0.82);
          color: var(--text);
          padding: 12px 14px;
          cursor: pointer;
          font: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .add-list-btn:hover,
        .close-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.28);
          background: rgba(16, 30, 53, 0.92);
          box-shadow: 0 12px 24px rgba(4, 9, 21, 0.16);
        }

        .scan-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .stat-block {
          min-width: 88px;
          padding: 9px 11px;
          border-radius: 16px;
          border: 1px solid rgba(247, 200, 115, 0.14);
          background: rgba(10, 18, 31, 0.86);
        }

        .stat-block strong {
          display: block;
          font-size: 1.08rem;
          margin-top: 4px;
        }

        .stat-label {
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .current-spotlight {
          display: grid;
          grid-template-columns: minmax(0, 1.34fr) minmax(238px, 0.66fr);
          gap: 12px;
          align-items: stretch;
        }

        .current-copy {
          padding: 16px;
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(125, 211, 252, 0.16), rgba(139, 92, 246, 0.1)),
            rgba(11, 23, 42, 0.9);
          animation: rise 260ms ease-out;
        }

        h2 {
          margin: 0;
          font-size: clamp(1.55rem, 2.7vw, 2.45rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .album-title {
          margin: 8px 0 0;
          color: #d7e4ff;
          font-size: 0.96rem;
          line-height: 1.4;
          max-width: 52ch;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .detail-chip {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(6, 14, 27, 0.7);
          padding: 7px 10px;
          font-size: 11px;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .detail-chip.muted {
          color: var(--muted);
        }

        .detail-chip.decision.keep {
          color: var(--keep);
          border-color: rgba(109, 214, 168, 0.28);
        }

        .detail-chip.decision.skip {
          color: var(--skip);
          border-color: rgba(245, 159, 133, 0.28);
        }

        .scan-progress {
          display: grid;
          gap: 10px;
          padding: 16px;
          border-radius: 22px;
          background: rgba(8, 16, 29, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .progress-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .progress-head strong {
          color: var(--text);
          font-size: 1rem;
        }

        .progress-bar {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        .progress-bar span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--warm), var(--accent));
        }

        .progress-caption {
          margin: 0;
          color: var(--muted);
          line-height: 1.5;
        }

        .action-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 0;
          border-radius: 14px;
          padding: 11px 14px;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, opacity 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
          font: inherit;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(3, 8, 20, 0.24);
        }

        .action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .action-btn:focus-visible,
        .filter-chip:focus-visible,
        .smart-item:focus-visible,
        .shortlist-item:focus-visible,
        .alternate-card:focus-visible,
        .queue-row:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.12);
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #f1d37c, #8bc6ff);
          color: #0d1320;
          font-weight: 700;
        }

        .action-btn.ghost {
          background: rgba(12, 22, 38, 0.9);
          color: var(--text);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .action-btn.decision-btn.keep {
          background: rgba(109, 214, 168, 0.14);
          color: var(--keep);
          border: 1px solid rgba(109, 214, 168, 0.22);
        }

        .action-btn.decision-btn.skip {
          background: rgba(245, 159, 133, 0.14);
          color: var(--skip);
          border: 1px solid rgba(245, 159, 133, 0.22);
        }

        .action-btn.decision-btn.active {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .side-panel {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .side-section {
          padding: 14px;
          border-radius: 20px;
          background: rgba(8, 15, 28, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        h3 {
          margin: 0;
          font-size: 1.15rem;
          line-height: 1.3;
        }

        .side-copy {
          margin: 10px 0 0;
          color: var(--muted);
          line-height: 1.55;
        }

        .smart-empty {
          display: grid;
          gap: 12px;
          margin-top: 10px;
        }

        .smart-stack {
          display: grid;
          gap: 8px;
        }

        .smart-label {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .smart-item {
          display: grid;
          gap: 4px;
          text-align: left;
          border-radius: 14px;
          border: 1px solid rgba(125, 211, 252, 0.14);
          background: rgba(12, 23, 41, 0.82);
          padding: 10px 12px;
          color: var(--text);
          cursor: pointer;
          font: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .smart-item small {
          color: var(--muted);
        }

        .smart-item:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.24);
          background: rgba(16, 30, 53, 0.9);
          box-shadow: 0 12px 26px rgba(4, 9, 21, 0.2);
        }

        .shortlist {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .shortlist-item {
          display: grid;
          gap: 4px;
          text-align: left;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(109, 214, 168, 0.18);
          background: rgba(13, 28, 27, 0.48);
          color: var(--text);
          cursor: pointer;
          font: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .shortlist-item.active {
          border-color: rgba(125, 211, 252, 0.28);
          background: rgba(14, 31, 54, 0.82);
        }

        .shortlist-item:hover {
          transform: translateY(-1px);
          border-color: rgba(109, 214, 168, 0.28);
          background: rgba(17, 35, 33, 0.78);
          box-shadow: 0 12px 26px rgba(4, 9, 21, 0.18);
        }

        .shortlist-item small {
          color: var(--muted);
        }

        .side-list {
          list-style: none;
          padding: 0;
          margin: 14px 0 0;
          display: grid;
          gap: 10px;
        }

        .side-list li {
          display: grid;
          gap: 4px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .side-list li:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .side-list span {
          color: var(--muted);
          line-height: 1.45;
        }

        .media-panel {
          display: grid;
          gap: 8px;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
        }

        .confidence-pill {
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        .confidence-pill.high {
          background: rgba(109, 214, 168, 0.12);
          color: var(--keep);
          border: 1px solid rgba(109, 214, 168, 0.2);
        }

        .confidence-pill.medium {
          background: rgba(247, 200, 115, 0.12);
          color: var(--warm);
          border: 1px solid rgba(247, 200, 115, 0.2);
        }

        .confidence-pill.low {
          background: rgba(245, 159, 133, 0.12);
          color: var(--skip);
          border: 1px solid rgba(245, 159, 133, 0.2);
        }

        .match-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(8, 15, 28, 0.84);
        }

        .match-meta strong {
          display: block;
          line-height: 1.35;
        }

        .match-meta p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .candidate-score {
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .warning-banner,
        .error-banner {
          border-radius: 16px;
          padding: 10px 12px;
          line-height: 1.45;
          font-size: 0.93rem;
        }

        .warning-banner {
          background: rgba(247, 200, 115, 0.1);
          border: 1px solid rgba(247, 200, 115, 0.16);
          color: #f4d99e;
        }

        .error-banner {
          background: rgba(245, 159, 133, 0.12);
          border: 1px solid rgba(245, 159, 133, 0.18);
          color: #ffc9b6;
        }

        .player-frame {
          width: 100%;
          height: 620px;
          border: 0;
          border-radius: 24px;
          background: #000;
          overflow: hidden;
          position: relative;
        }

        .player-frame :global(div),
        .player-frame :global(iframe) {
          width: 100% !important;
          height: 100% !important;
          border: 0;
          display: block;
          border-radius: inherit;
        }

        .player-placeholder {
          width: 100%;
          height: 620px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(15, 31, 56, 0.92), rgba(8, 15, 28, 0.96));
          border: 1px solid rgba(125, 211, 252, 0.08);
          display: grid;
          align-content: center;
          gap: 14px;
          padding: 28px;
        }

        .audio-preview-card {
          width: 100%;
          min-height: 620px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(125, 211, 252, 0.08);
          background:
            linear-gradient(180deg, rgba(10, 20, 36, 0.76), rgba(5, 10, 20, 0.94)),
            radial-gradient(circle at top, rgba(94, 234, 212, 0.14), transparent 42%);
          display: grid;
          grid-template-columns: minmax(220px, 280px) 1fr;
        }

        .audio-preview-art {
          min-height: 100%;
          background: rgba(4, 9, 18, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 26px;
        }

        .audio-preview-art img {
          width: 100%;
          max-width: 240px;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 20px;
          box-shadow: 0 26px 60px rgba(0, 0, 0, 0.32);
        }

        .audio-preview-copy {
          display: grid;
          align-content: center;
          gap: 10px;
          padding: 34px;
          background: linear-gradient(180deg, rgba(6, 13, 24, 0.58), rgba(6, 13, 24, 0.9));
        }

        .audio-preview-kicker {
          margin: 0;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 11px;
        }

        .audio-preview-copy strong {
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          line-height: 1.05;
        }

        .audio-preview-copy span,
        .audio-preview-copy small {
          color: var(--muted);
        }

        .audio-preview-player {
          width: 100%;
          margin-top: 10px;
          filter: saturate(0.92) brightness(1.02);
        }

        .player-placeholder-bar {
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(125, 211, 252, 0.16), rgba(125, 211, 252, 0.04), rgba(125, 211, 252, 0.16));
        }

        .player-placeholder-bar.short {
          width: 42%;
        }

        .player-feedback {
          min-height: 48px;
        }

        .debug-trace-panel {
          border-radius: 18px;
          border: 1px solid rgba(125, 211, 252, 0.12);
          background: rgba(7, 14, 27, 0.72);
          padding: 14px 16px;
        }

        .debug-trace-panel summary {
          cursor: pointer;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          user-select: none;
        }

        .debug-trace-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .debug-block {
          margin-top: 14px;
          display: grid;
          gap: 8px;
        }

        .debug-label {
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
        }

        .debug-block ul {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          color: #dbe7ff;
          font-size: 0.92rem;
        }

        .preview-prompt {
          display: grid;
          gap: 6px;
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(125, 211, 252, 0.12);
          background: rgba(11, 22, 39, 0.72);
        }

        .preview-prompt span {
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .alternate-matches {
          display: grid;
          gap: 10px;
        }

        .alternate-label {
          margin: 0;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
        }

        .alternate-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .alternate-card {
          text-align: left;
          display: grid;
          gap: 6px;
          border: 1px solid rgba(125, 211, 252, 0.14);
          background: rgba(8, 16, 29, 0.84);
          color: var(--text);
          border-radius: 18px;
          padding: 12px;
          cursor: pointer;
          font: inherit;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .alternate-card span {
          color: var(--muted);
          line-height: 1.45;
        }

        .alternate-card:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.24);
          background: rgba(12, 23, 41, 0.94);
          box-shadow: 0 12px 26px rgba(4, 9, 21, 0.18);
        }

        .queue-head {
          align-items: center;
        }

        .filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-chip {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 14, 27, 0.72);
          color: var(--muted);
          padding: 10px 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 11px;
          cursor: pointer;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease;
        }

        .filter-chip.active {
          color: var(--text);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(18, 34, 58, 0.9);
        }

        .filter-chip:hover {
          transform: translateY(-1px);
          color: var(--text);
          border-color: rgba(125, 211, 252, 0.18);
          background: rgba(12, 23, 41, 0.88);
          box-shadow: 0 10px 20px rgba(4, 9, 21, 0.16);
        }

        .queue-list {
          display: grid;
          gap: 8px;
          margin-top: 12px;
          max-height: 600px;
          overflow: auto;
          padding-right: 4px;
        }

        .queue-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          width: 100%;
          text-align: left;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(8, 14, 25, 0.74);
          color: var(--text);
          padding: 12px 14px;
          cursor: pointer;
          font: inherit;
          transition: border-color 140ms ease, transform 140ms ease, background 140ms ease, box-shadow 140ms ease;
        }

        .queue-row:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.18);
          box-shadow: 0 12px 24px rgba(4, 9, 21, 0.16);
        }

        .queue-row.active {
          border-color: rgba(125, 211, 252, 0.24);
          background: rgba(18, 34, 58, 0.92);
        }

        .queue-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
        }

        .queue-dot.keep {
          background: var(--keep);
        }

        .queue-dot.skip {
          background: var(--skip);
        }

        .queue-title {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: baseline;
        }

        .queue-title span {
          color: #b7c5e3;
        }

        .queue-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 5px;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .queue-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .row-pill {
          border-radius: 999px;
          padding: 7px 9px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .row-pill.keep {
          color: var(--keep);
          border-color: rgba(109, 214, 168, 0.22);
          background: rgba(109, 214, 168, 0.1);
        }

        .row-pill.skip {
          color: var(--skip);
          border-color: rgba(245, 159, 133, 0.22);
          background: rgba(245, 159, 133, 0.1);
        }

        .row-pill.active {
          color: var(--accent);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(125, 211, 252, 0.1);
        }

        .row-pill.ready {
          color: var(--warm);
          border-color: rgba(247, 200, 115, 0.18);
          background: rgba(247, 200, 115, 0.08);
        }

        .empty-state {
          display: grid;
          place-items: center;
          text-align: center;
          min-height: 220px;
          border-radius: 22px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          background: rgba(6, 12, 23, 0.55);
          padding: 18px;
        }

        .empty-state.compact {
          min-height: 120px;
        }

        .empty-state.media {
          min-height: 300px;
        }

        .empty-state p {
          margin: 10px 0 0;
          max-width: 48ch;
          color: var(--muted);
          line-height: 1.6;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(3, 8, 18, 0.72);
          backdrop-filter: blur(10px);
        }

        .modal-card {
          width: min(760px, 100%);
          display: grid;
          gap: 16px;
          padding: 20px;
          border-radius: 28px;
          border: 1px solid rgba(125, 211, 252, 0.16);
          background: linear-gradient(180deg, rgba(17, 29, 50, 0.98), rgba(9, 17, 30, 0.98));
          box-shadow: 0 30px 90px rgba(1, 5, 14, 0.52);
        }

        .modal-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
        }

        .modal-copy {
          margin: 0;
          color: var(--muted);
          line-height: 1.55;
        }

        .modal-form {
          display: grid;
          gap: 14px;
        }

        .modal-field {
          display: grid;
          gap: 8px;
        }

        .modal-field span {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .modal-field input,
        .modal-field textarea {
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(125, 211, 252, 0.16);
          background: rgba(9, 18, 33, 0.96);
          color: var(--text);
          padding: 14px 16px;
          font: inherit;
          outline: none;
          transition: border-color 140ms ease, box-shadow 140ms ease;
        }

        .modal-field input:focus-visible,
        .modal-field textarea:focus-visible {
          border-color: rgba(125, 211, 252, 0.34);
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.08);
        }

        .modal-field textarea {
          min-height: 280px;
          resize: vertical;
        }

        .modal-preview {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 20px;
          background: rgba(7, 14, 27, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-preview-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          color: var(--muted);
          font-size: 0.92rem;
        }

        .preview-lines {
          display: grid;
          gap: 6px;
        }

        .preview-lines code {
          display: block;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(12, 23, 41, 0.82);
          color: #dbe7ff;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1040px) {
          .workspace-grid,
          .current-spotlight {
            grid-template-columns: 1fr;
          }

          .player-frame {
            min-height: 360px;
          }

          .audio-preview-card {
            grid-template-columns: 1fr;
          }

          .audio-preview-art {
            padding-bottom: 0;
          }
        }

        @media (max-width: 720px) {
          .music-page {
            padding: 22px 14px 60px;
          }

          .masthead {
            align-items: start;
            flex-direction: column;
          }

          .masthead-meta,
          .scan-stats,
          .filter-row {
            justify-content: flex-start;
          }

          .list-picker-row,
          .modal-head,
          .modal-preview-head,
          .modal-actions {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }

          .current-topline,
          .panel-head,
          .match-meta,
          .queue-head {
            flex-direction: column;
            align-items: start;
          }

          .action-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .action-btn.primary {
            grid-column: 1 / -1;
          }

          .player-frame {
            min-height: 240px;
          }

          .audio-preview-art img {
            max-width: 220px;
          }

          .queue-row {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .queue-badges {
            grid-column: 2;
            justify-content: flex-start;
          }
        }
      `}</style>
    </main>
  )
}
