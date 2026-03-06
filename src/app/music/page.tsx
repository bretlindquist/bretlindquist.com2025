"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'

type Entry = {
  index: number
  raw: string
  artist: string
  album: string
  query: string
  year: number | null
  score: number | null
}

type SearchCandidate = {
  videoId: string
  title: string
  channel: string
  url: string
  embedUrl: string
  score: number
}

type SearchResult = {
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

type Decision = 'keep' | 'skip'
type DecisionMap = Record<number, Decision>
type ListFilter = 'pending' | 'all' | 'keep' | 'skip'
type HistoryItem = { entryIndex: number; previous: Decision | null; next: Decision | null }

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

export default function MusicPage() {
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [resultCache, setResultCache] = useState<Record<number, SearchResult>>({})
  const [searching, setSearching] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<DecisionMap>({})
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [listFilter, setListFilter] = useState<ListFilter>('pending')

  const current = entries[idx] || null
  const currentDecision = current ? decisions[current.index] ?? null : null
  const currentCache = current ? resultCache[current.index] ?? null : null

  useEffect(() => {
    ;(async () => {
      const response = await fetch('/api/music/lists')
      const json = await response.json()

      if (!json.ok) {
        setError(json.error || 'failed to load lists')
        return
      }

      const availableFiles = Array.isArray(json.files) ? json.files : []
      setFiles(availableFiles)

      const stored = window.localStorage.getItem(LAST_FILE_KEY)
      if (stored && availableFiles.includes(stored)) {
        setSelectedFile(stored)
        return
      }

      if (availableFiles.includes('2025.txt')) {
        setSelectedFile('2025.txt')
        return
      }

      if (availableFiles.length) setSelectedFile(availableFiles[availableFiles.length - 1])
    })()
  }, [])

  useEffect(() => {
    if (!selectedFile) return
    window.localStorage.setItem(LAST_FILE_KEY, selectedFile)
  }, [selectedFile])

  useEffect(() => {
    if (!selectedFile) return

    ;(async () => {
      setLoadingEntries(true)
      setError(null)

      const response = await fetch('/api/music/load', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: selectedFile }),
      })

      const json = await response.json()
      if (!json.ok) {
        setLoadingEntries(false)
        setError(json.error || 'failed to load list')
        return
      }

      const nextEntries = Array.isArray(json.entries) ? json.entries : []
      const validIndices = new Set<number>(nextEntries.map((entry: Entry) => entry.index))
      const storedState = window.localStorage.getItem(storageKey(selectedFile))
      let restoredDecisions: DecisionMap = {}
      let restoredIdx = 0

      if (storedState) {
        try {
          const parsed = JSON.parse(storedState) as { idx?: number; decisions?: Record<string, Decision> }
          restoredIdx = typeof parsed.idx === 'number' ? parsed.idx : 0

          restoredDecisions = Object.fromEntries(
            Object.entries(parsed.decisions || {}).filter(([entryIndex, decision]) => {
              return validIndices.has(Number(entryIndex)) && (decision === 'keep' || decision === 'skip')
            }),
          ) as DecisionMap
        } catch {
          restoredDecisions = {}
        }
      }

      setEntries(nextEntries)
      setIdx(clamp(restoredIdx, 0, Math.max(nextEntries.length - 1, 0)))
      setDecisions(restoredDecisions)
      setHistory([])
      setResult(null)
      setResultCache({})
      setListFilter('pending')
      setLoadingEntries(false)
    })()
  }, [selectedFile])

  useEffect(() => {
    if (!selectedFile || !entries.length) return
    window.localStorage.setItem(storageKey(selectedFile), JSON.stringify({ idx, decisions }))
  }, [selectedFile, entries.length, idx, decisions])

  useEffect(() => {
    if (!current) {
      setResult(null)
      return
    }

    setResult(currentCache)
    setError(null)
  }, [current, currentCache])

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

  const alternateCandidates = useMemo(() => {
    return (result?.candidates || []).filter((candidate) => candidate.videoId !== result?.videoId)
  }, [result])

  const search = useCallback(async (entry?: Entry, force = false) => {
    const row = entry || current
    if (!row) return

    if (!force && resultCache[row.index]) {
      setResult(resultCache[row.index])
      setError(null)
      return
    }

    setSearching(true)
    setError(null)

    try {
      const response = await fetch('/api/music/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artist: row.artist, album: row.album, query: row.query }),
      })

      const json = await response.json()
      if (!json.ok) throw new Error(json.error || 'search failed')

      setResult(json)
      setResultCache((cache) => ({ ...cache, [row.index]: json }))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'search failed'
      setResult(null)
      setError(message)
    } finally {
      setSearching(false)
    }
  }, [current, resultCache])

  const chooseCandidate = useCallback((candidate: SearchCandidate) => {
    if (!current || !result) return

    const nextResult = {
      ...result,
      videoId: candidate.videoId,
      title: candidate.title,
      channel: candidate.channel,
      url: candidate.url,
      embedUrl: candidate.embedUrl,
    }

    setResult(nextResult)
    setResultCache((cache) => ({ ...cache, [current.index]: nextResult }))
  }, [current, result])

  const applyDecision = useCallback((decision: Decision) => {
    if (!current) return

    const previous = decisions[current.index] ?? null
    const next = previous === decision ? null : decision

    setDecisions((existing) => {
      const updated = { ...existing }

      if (next) updated[current.index] = next
      else delete updated[current.index]

      return updated
    })

    setHistory((existing) => [...existing, { entryIndex: current.index, previous, next }])

    if (idx < entries.length - 1) {
      setIdx((currentIdx) => clamp(currentIdx + 1, 0, entries.length - 1))
    }
  }, [current, decisions, entries.length, idx])

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
    void search()
  }, [search])

  const keepCurrent = useCallback(() => {
    applyDecision('keep')
  }, [applyDecision])

  const skipCurrent = useCallback(() => {
    applyDecision('skip')
  }, [applyDecision])

  const undoShortcut = useCallback(() => {
    undoLast()
  }, [undoLast])

  const openCurrentResult = useCallback(() => {
    if (result?.url) window.open(result.url, '_blank', 'noopener,noreferrer')
  }, [result?.url])

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

  return (
    <main className="music-page">
      <div className="music-backdrop" />

      <div className="music-shell">
        <header className="masthead">
          <div>
            <p className="eyebrow">Review workstation</p>
            <h1>Music Scan Deck</h1>
            <p className="lede">
              Scan ranked lists, preview the best available YouTube match, and build a shortlist without losing your place.
            </p>
          </div>

          <div className="masthead-meta">
            <span className="meta-chip">Shortcuts: Enter preview, F keep, X skip, Z undo</span>
            <span className="meta-chip subtle">State is remembered per list on this browser</span>
          </div>
        </header>

        <section className="workspace-grid">
          <div className="primary-stack">
            <div className="panel current-panel">
              <div className="current-topline">
                <div className="list-picker">
                  <label htmlFor="music-list">List</label>
                  <select
                    id="music-list"
                    value={selectedFile}
                    onChange={(event) => setSelectedFile(event.target.value)}
                  >
                    {files.map((file) => (
                      <option key={file} value={file}>
                        {file.replace(/\.txt$/i, '')}
                      </option>
                    ))}
                  </select>
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
                    <button className="action-btn primary" onClick={() => void search()} disabled={searching || loadingEntries}>
                      {searching ? 'Finding match…' : result ? 'Refresh Match' : 'Preview Match'}
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

                  <iframe
                    key={result.embedUrl}
                    title="music-player"
                    src={result.embedUrl}
                    className="player-frame"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />

                  {alternateCandidates.length ? (
                    <div className="alternate-matches">
                      <p className="alternate-label">Alternate matches</p>
                      <div className="alternate-grid">
                        {alternateCandidates.map((candidate) => (
                          <button key={candidate.videoId} className="alternate-card" onClick={() => chooseCandidate(candidate)}>
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
                  <strong>{loadingEntries ? 'Loading your scan deck…' : 'No preview loaded yet'}</strong>
                  <p>
                    {current
                      ? 'Select a record and press Preview Match, or hit Enter to fetch the strongest candidate.'
                      : 'Choose a list to begin.'}
                  </p>
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
                <p className="side-copy">Use Keep to build a fast shortlist while you scan.</p>
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
                      {entryDecision ? <span className={`row-pill ${entryDecision}`}>{entryDecision}</span> : <span className="row-pill pending">pending</span>}
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
            radial-gradient(circle at top left, rgba(94, 234, 212, 0.11), transparent 28%),
            radial-gradient(circle at top right, rgba(247, 200, 115, 0.14), transparent 24%),
            linear-gradient(180deg, #091223 0%, #060c18 100%);
          padding: 32px 18px 80px;
        }

        .music-backdrop {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 15% 15%, rgba(125, 211, 252, 0.14), transparent 0 22%),
            radial-gradient(circle at 85% 10%, rgba(251, 191, 36, 0.12), transparent 0 20%),
            radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.1), transparent 0 30%);
          filter: blur(12px);
        }

        .music-shell {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .masthead {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: end;
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
          font-size: clamp(2.35rem, 5vw, 4.6rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .lede {
          max-width: 720px;
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.6;
        }

        .masthead-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .meta-chip {
          border: 1px solid var(--line);
          background: rgba(11, 20, 37, 0.72);
          padding: 10px 12px;
          border-radius: 999px;
          color: var(--text);
          font-size: 12px;
        }

        .meta-chip.subtle {
          color: var(--muted);
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.9fr);
          gap: 18px;
        }

        .primary-stack {
          display: grid;
          gap: 18px;
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
          padding: 22px;
        }

        .current-panel {
          display: grid;
          gap: 22px;
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
          width: min(220px, 100%);
        }

        .list-picker label {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        select {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(125, 211, 252, 0.22);
          background: rgba(10, 19, 34, 0.92);
          color: var(--text);
          padding: 14px 16px;
          font-size: 1.05rem;
          outline: none;
        }

        .scan-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .stat-block {
          min-width: 110px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(247, 200, 115, 0.14);
          background: rgba(10, 18, 31, 0.86);
        }

        .stat-block strong {
          display: block;
          font-size: 1.2rem;
          margin-top: 6px;
        }

        .stat-label {
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .current-spotlight {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: stretch;
        }

        .current-copy {
          padding: 22px;
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(125, 211, 252, 0.16), rgba(139, 92, 246, 0.1)),
            rgba(11, 23, 42, 0.9);
          animation: rise 260ms ease-out;
        }

        h2 {
          margin: 0;
          font-size: clamp(1.9rem, 4vw, 3.4rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .album-title {
          margin: 12px 0 0;
          color: #d7e4ff;
          font-size: 1.08rem;
          line-height: 1.55;
          max-width: 52ch;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .detail-chip {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(6, 14, 27, 0.7);
          padding: 8px 12px;
          font-size: 12px;
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
          gap: 12px;
          padding: 20px;
          border-radius: 22px;
          background: rgba(8, 16, 29, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .progress-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
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
          line-height: 1.6;
        }

        .action-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 0;
          border-radius: 16px;
          padding: 14px 18px;
          cursor: pointer;
          transition: transform 140ms ease, background 140ms ease, opacity 140ms ease;
          font: inherit;
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
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
          gap: 18px;
          align-content: start;
        }

        .side-section {
          padding: 18px;
          border-radius: 22px;
          background: rgba(8, 15, 28, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        h3 {
          margin: 0;
          font-size: 1.15rem;
          line-height: 1.3;
        }

        .side-copy {
          margin: 12px 0 0;
          color: var(--muted);
          line-height: 1.6;
        }

        .shortlist {
          display: grid;
          gap: 10px;
          margin-top: 14px;
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
        }

        .shortlist-item.active {
          border-color: rgba(125, 211, 252, 0.28);
          background: rgba(14, 31, 54, 0.82);
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
          gap: 16px;
        }

        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
        }

        .confidence-pill {
          border-radius: 999px;
          padding: 10px 12px;
          font-size: 12px;
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
          gap: 14px;
          align-items: start;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(8, 15, 28, 0.84);
        }

        .match-meta p {
          margin: 8px 0 0;
          color: var(--muted);
        }

        .candidate-score {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .warning-banner,
        .error-banner {
          border-radius: 18px;
          padding: 14px 16px;
          line-height: 1.55;
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
          min-height: 520px;
          border: 0;
          border-radius: 24px;
          background: #000;
        }

        .alternate-matches {
          display: grid;
          gap: 12px;
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
          padding: 14px;
          cursor: pointer;
          font: inherit;
        }

        .alternate-card span {
          color: var(--muted);
          line-height: 1.45;
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
        }

        .filter-chip.active {
          color: var(--text);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(18, 34, 58, 0.9);
        }

        .queue-list {
          display: grid;
          gap: 10px;
          margin-top: 18px;
          max-height: 620px;
          overflow: auto;
          padding-right: 4px;
        }

        .queue-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          width: 100%;
          text-align: left;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(8, 14, 25, 0.74);
          color: var(--text);
          padding: 14px 16px;
          cursor: pointer;
          font: inherit;
          transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
        }

        .queue-row:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.14);
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
          color: var(--muted);
        }

        .queue-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
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
          padding: 8px 10px;
          font-size: 11px;
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

        .row-pill.pending {
          color: var(--muted);
        }

        .row-pill.active {
          color: var(--accent);
          border-color: rgba(125, 211, 252, 0.22);
          background: rgba(125, 211, 252, 0.1);
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
          min-height: 360px;
        }

        .empty-state p {
          margin: 10px 0 0;
          max-width: 48ch;
          color: var(--muted);
          line-height: 1.6;
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
            min-height: 420px;
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
            min-height: 280px;
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
