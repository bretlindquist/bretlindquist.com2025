import path from 'node:path'
import type { Entry } from '../../music/types.ts'
import { readMusicList } from './_lists.ts'

type ParseResult =
  | { ok: true; entry: Entry }
  | { ok: false; error: string }

function parseMusicLine(raw: string, index: number): ParseResult {
  const numbered = raw.replace(/^\d+\.\s*/u, '')
  const metaMatch = numbered.match(/\s+\((\d{4})\)(?:\s+\(([-\d.]+)\))?\s*$/u)
  const stripped = metaMatch ? numbered.slice(0, metaMatch.index).trim() : numbered
  const parts = stripped.split(' - ').map((part) => part.trim())

  if (parts.length < 2) {
    return { ok: false, error: `Line ${index + 1} is invalid. Use "Artist - Album".` }
  }

  const [artist, ...rest] = parts
  const album = rest.join(' - ').trim()

  if (!artist || !album) {
    return { ok: false, error: `Line ${index + 1} is invalid. Use "Artist - Album".` }
  }

  return {
    ok: true,
    entry: {
      index: index + 1,
      raw,
      artist,
      album,
      query: `${artist} ${album}`.trim(),
      year: metaMatch ? Number(metaMatch[1]) : null,
      score: metaMatch?.[2] ? Number(metaMatch[2]) : null,
    },
  }
}

export function parseMusicList(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries: Entry[] = []

  for (const [index, raw] of lines.entries()) {
    const parsed = parseMusicLine(raw, index)
    if (!parsed.ok) throw new Error(parsed.error)
    entries.push(parsed.entry)
  }

  return entries
}

export async function loadMusicEntries(name: string) {
  const safeName = path.basename(name)
  const text = await readMusicList(safeName)

  return {
    name: safeName,
    text,
    entries: parseMusicList(text),
  }
}

export function pickMusicList(files: string[], preferred?: string) {
  const safePreferred = preferred ? path.basename(preferred) : ''

  if (safePreferred && files.includes(safePreferred)) return safePreferred
  if (files.includes('2025.txt')) return '2025.txt'
  return files[files.length - 1] || ''
}
