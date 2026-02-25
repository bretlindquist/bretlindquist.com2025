"use client"

import { useEffect, useMemo, useState } from 'react'

type Entry = { index: number; raw: string; artist: string; album: string; query: string }
type SearchResult = { ok: boolean; videoId: string; title: string; url: string; channel?: string }

export default function MusicPage() {
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keepers, setKeepers] = useState<Record<number, boolean>>({})

  const current = entries[idx]

  useEffect(() => {
    ;(async () => {
      const r = await fetch('/api/music/lists')
      const j = await r.json()
      const f = j.files || []
      setFiles(f)
      if (f.includes('2025.txt')) setSelectedFile('2025.txt')
      else if (f.length) setSelectedFile(f[f.length - 1])
    })()
  }, [])

  useEffect(() => {
    if (!selectedFile) return
    ;(async () => {
      const r = await fetch('/api/music/load', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: selectedFile }),
      })
      const j = await r.json()
      if (!j.ok) return
      setEntries(j.entries || [])
      setIdx(0)
      setResult(null)
      setError(null)
      setKeepers({})
    })()
  }, [selectedFile])

  const search = async (entry?: Entry) => {
    const row = entry || current
    if (!row) return
    setSearching(true)
    setError(null)
    const r = await fetch('/api/music/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: row.query }),
    })
    const j = await r.json()
    if (j.ok) setResult(j)
    else {
      setResult(null)
      setError(j.error || 'search failed')
    }
    setSearching(false)
  }

  const stats = useMemo(() => {
    const c = Object.values(keepers).filter(Boolean).length
    return { keep: c, total: entries.length }
  }, [keepers, entries.length])

  return (
    <main style={{ minHeight: '100vh', background: '#0b1020', color: '#e8edf7', padding: 16 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Music Scan Deck</h1>
        <p style={{ opacity: 0.8, marginBottom: 12 }}>Load list, click row to search+play, toggle keepers.</p>

        <div style={{ background: '#131b33', border: '1px solid #2a3a66', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              style={{ minWidth: 110, background: '#0e1730', color: '#fff', border: '1px solid #2f4374', borderRadius: 8, padding: '8px 10px' }}
            >
              {files.map((f) => <option key={f} value={f}>{f.replace(/\.txt$/i, '')}</option>)}
            </select>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{entries.length ? `${idx + 1}/${entries.length}` : '0/0'} · Keep {stats.keep}</span>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="music-btn secondary" onClick={() => { setResult(null); setIdx((i) => Math.max(0, i - 1)) }} disabled={idx === 0}>Prev</button>
              <button className="music-btn secondary" onClick={() => { setResult(null); setIdx((i) => Math.min(entries.length - 1, i + 1)) }} disabled={idx >= entries.length - 1}>Next</button>
              <button className="music-btn" onClick={() => { void search() }} disabled={!current || searching}>{searching ? 'Searching…' : 'Search & Play'}</button>
              <button className="music-btn secondary" onClick={() => result?.url && window.open(result.url, '_blank')} disabled={!result?.url}>Open YouTube</button>
            </div>
          </div>

          {current && <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>#{current.index} · {current.artist} — {current.album}</div>}

          {result && (
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 6, fontSize: 12, opacity: 0.85 }}>{result.title} · {result.channel}</div>
              <iframe
                key={result.videoId}
                title="music-player"
                src={`https://www.youtube.com/embed/${result.videoId}?autoplay=1&playsinline=1`}
                style={{ width: '100%', height: 320, border: 0, borderRadius: 10, background: '#000' }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
          {error && <div style={{ marginTop: 8, color: '#ff9db3', fontSize: 12 }}>Search error: {error}</div>}

          <div style={{ marginTop: 12, border: '1px solid #2a3a66', borderRadius: 10, maxHeight: 260, overflow: 'auto' }}>
            {entries.map((entry, i) => {
              const active = i === idx
              const kept = !!keepers[entry.index]
              return (
                <div
                  key={`${entry.index}-${entry.artist}-${entry.album}`}
                  onClick={() => {
                    setIdx(i)
                    setResult(null)
                    void search(entry)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderBottom: i === entries.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    background: active ? 'rgba(39,65,127,0.28)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <button
                    className="music-btn secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      setKeepers((k) => ({ ...k, [entry.index]: !k[entry.index] }))
                    }}
                    style={{ width: 22, minWidth: 22, height: 22, padding: 0, borderRadius: 999, borderColor: kept ? '#2ea043' : '#3e4f79', color: kept ? '#7ee787' : '#9eb0d9', background: kept ? 'rgba(46,160,67,.25)' : 'transparent' }}
                  >
                    {kept ? '✓' : '○'}
                  </button>
                  <span style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.index}. {entry.artist} — {entry.album}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .music-btn { background: #27417f; color: #fff; border: 1px solid #36508f; border-radius: 9px; padding: 7px 10px; cursor: pointer; }
        .music-btn.secondary { background: #223055; }
        .music-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </main>
  )
}
