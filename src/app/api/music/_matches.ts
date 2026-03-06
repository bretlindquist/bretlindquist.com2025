import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SearchResult } from '../../music/types.ts'

type MatchLookupInput = {
  artist?: string
  album?: string
  query?: string
}

type MusicMatchRecord = {
  key: string
  artist: string
  album: string
  query: string
  result: SearchResult
  updatedAt: string
}

const LOCAL_PATH = path.join(process.cwd(), 'data', 'music-matches.json')
const DEFAULT_REMOTE_PATH = 'data/music-matches.json'

function githubConfig() {
  const owner = process.env.MUSIC_LISTS_GITHUB_OWNER || ''
  const repo = process.env.MUSIC_LISTS_GITHUB_REPO || ''
  const token = process.env.MUSIC_LISTS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''
  const branch = process.env.MUSIC_LISTS_GITHUB_BRANCH || 'main'
  const filePath = process.env.MUSIC_MATCHES_GITHUB_PATH || DEFAULT_REMOTE_PATH

  if (!owner || !repo || !token) return null
  return { owner, repo, token, branch, filePath }
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeResult(result: SearchResult): SearchResult {
  return {
    ...result,
    ok: true,
    url: result.url || `https://www.youtube.com/watch?v=${result.videoId}`,
    embedUrl: result.embedUrl || `https://www.youtube.com/embed/${result.videoId}?autoplay=1&playsinline=1`,
    warning: result.warning ?? null,
    candidates: Array.isArray(result.candidates) ? result.candidates : [],
  }
}

function normalizeLookup(input: MatchLookupInput) {
  const artist = String(input.artist || '').trim()
  const album = String(input.album || '').trim()
  const query = String(input.query || '').trim() || [artist, album].filter(Boolean).join(' ').trim()
  const keyBase = artist || album ? `${artist} :: ${album}` : query
  const key = normalize(keyBase)

  if (!key) throw new Error('query required')

  return {
    key,
    artist,
    album,
    query,
  }
}

async function readLocalMatchRecords() {
  try {
    const text = await readFile(LOCAL_PATH, 'utf8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed as MusicMatchRecord[] : []
  } catch {
    return []
  }
}

async function writeLocalMatchRecords(records: MusicMatchRecord[]) {
  await mkdir(path.dirname(LOCAL_PATH), { recursive: true })
  await writeFile(LOCAL_PATH, JSON.stringify(records, null, 2) + '\n', 'utf8')
}

async function readGitHubMatchRecords(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${config.branch}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  if (response.status === 404) return { records: [] as MusicMatchRecord[], sha: '' }
  if (!response.ok) throw new Error(`GitHub music match read failed: ${response.status}`)

  const json = await response.json() as { content?: string; sha?: string; encoding?: string }
  const content = json.encoding === 'base64' && json.content
    ? Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8')
    : '[]'
  const parsed = JSON.parse(content)

  return {
    records: Array.isArray(parsed) ? parsed as MusicMatchRecord[] : [],
    sha: json.sha || '',
  }
}

async function writeGitHubMatchRecords(
  config: NonNullable<ReturnType<typeof githubConfig>>,
  records: MusicMatchRecord[],
  sha: string,
) {
  const body = {
    message: `Update music match cache (${records.length} records)`,
    content: Buffer.from(JSON.stringify(records, null, 2) + '\n', 'utf8').toString('base64'),
    branch: config.branch,
    sha: sha || undefined,
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub music match save failed: ${response.status} ${text.slice(0, 180)}`)
  }
}

export function musicMatchKey(input: MatchLookupInput) {
  return normalizeLookup(input).key
}

export async function getMusicMatch(input: MatchLookupInput) {
  const { key } = normalizeLookup(input)
  const config = githubConfig()
  const records = config ? (await readGitHubMatchRecords(config)).records : await readLocalMatchRecords()
  const match = records.find((record) => record.key === key)
  return match ? normalizeResult(match.result) : null
}

export async function saveMusicMatch(input: MatchLookupInput, result: SearchResult) {
  const lookup = normalizeLookup(input)
  const normalizedResult = normalizeResult(result)
  const nextRecord: MusicMatchRecord = {
    ...lookup,
    result: normalizedResult,
    updatedAt: new Date().toISOString(),
  }

  const config = githubConfig()

  if (!config) {
    try {
      const records = await readLocalMatchRecords()
      const nextRecords = [nextRecord, ...records.filter((record) => record.key !== lookup.key)]
      await writeLocalMatchRecords(nextRecords)
    } catch {
      return normalizedResult
    }

    return normalizedResult
  }

  const { records, sha } = await readGitHubMatchRecords(config)
  const nextRecords = [nextRecord, ...records.filter((record) => record.key !== lookup.key)]
  await writeGitHubMatchRecords(config, nextRecords, sha)
  return normalizedResult
}
