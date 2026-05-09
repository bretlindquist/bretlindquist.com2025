import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type LocalPreviewRecord = {
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

type GeneratePreviewInput = {
  artist: string
  album: string
  title?: string
  channel?: string
  sourceUrl: string
}

const DATA_PATH = path.join(process.cwd(), 'data', 'music-preview-cache.json')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'music-preview-cache')

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function safeSlug(value: string) {
  return normalize(value).replace(/\s+/g, '-').slice(0, 80) || 'preview'
}

export function previewCacheKey(input: { artist?: string; album?: string; query?: string }) {
  const artist = String(input.artist || '').trim()
  const album = String(input.album || '').trim()
  const query = String(input.query || '').trim() || [artist, album].filter(Boolean).join(' ').trim()
  const keyBase = artist || album ? `${artist} :: ${album}` : query
  return normalize(keyBase)
}

async function readPreviewRecords() {
  try {
    const text = await readFile(DATA_PATH, 'utf8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed as LocalPreviewRecord[] : []
  } catch {
    return []
  }
}

async function writePreviewRecords(records: LocalPreviewRecord[]) {
  await mkdir(path.dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(records, null, 2) + '\n', 'utf8')
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

export async function getLocalPreview(input: { artist?: string; album?: string; query?: string }) {
  const key = previewCacheKey(input)
  const records = await readPreviewRecords()
  const match = records.find((record) => record.key === key)
  if (!match) return null

  const filePath = path.join(PUBLIC_DIR, match.fileName)
  if (!(await fileExists(filePath))) {
    const nextRecords = records.filter((record) => record.key !== key)
    await writePreviewRecords(nextRecords)
    return null
  }

  return match
}

function inferSourceType(url: string): LocalPreviewRecord['sourceType'] {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube'
  return 'remote-audio'
}

async function transcodePreview(inputPath: string, outputPath: string) {
  await execFileAsync('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-ss',
    '0',
    '-t',
    '30',
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-b:a',
    '96k',
    outputPath,
  ], {
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  })
}

async function probeDuration(filePath: string) {
  const { stdout } = await execFileAsync('/opt/homebrew/bin/ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  })

  const duration = Number.parseFloat(String(stdout).trim())
  if (!Number.isFinite(duration)) return 30
  return Math.round(duration)
}

async function buildPreviewFromYoutube(url: string, outputPath: string, tempDir: string) {
  const template = path.join(tempDir, 'source.%(ext)s')
  await execFileAsync('/opt/homebrew/bin/yt-dlp', [
    '--no-playlist',
    '-f',
    'bestaudio/best',
    '-o',
    template,
    url,
  ], {
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  })

  const sourceEntries = await execFileAsync('/bin/ls', ['-1', tempDir], {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  })
  const downloaded = String(sourceEntries.stdout)
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.join(tempDir, entry))
    .find((entry) => path.basename(entry).startsWith('source.'))

  if (!downloaded) {
    throw new Error('yt-dlp did not produce a source file')
  }

  await transcodePreview(downloaded, outputPath)
}

async function buildPreviewFromRemoteAudio(url: string, outputPath: string) {
  await execFileAsync('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-ss',
    '0',
    '-t',
    '30',
    '-i',
    url,
    '-vn',
    '-ac',
    '2',
    '-ar',
    '44100',
    '-b:a',
    '96k',
    outputPath,
  ], {
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  })
}

export async function generateLocalPreview(input: GeneratePreviewInput) {
  const artist = input.artist.trim()
  const album = input.album.trim()
  const title = String(input.title || album).trim() || album
  const channel = String(input.channel || artist).trim() || artist
  const sourceUrl = input.sourceUrl.trim()
  const key = previewCacheKey({ artist, album })
  const sourceType = inferSourceType(sourceUrl)

  if (!artist || !album || !sourceUrl) {
    throw new Error('artist, album, and sourceUrl are required')
  }

  await mkdir(PUBLIC_DIR, { recursive: true })
  const fileName = `${safeSlug(artist)}-${safeSlug(album)}.m4a`
  const outputPath = path.join(PUBLIC_DIR, fileName)
  const tempDir = await execFileAsync('/usr/bin/mktemp', ['-d', path.join(os.tmpdir(), 'music-preview-cache.XXXXXX')], {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
  }).then(({ stdout }) => String(stdout).trim())

  try {
    if (sourceType === 'youtube') {
      await buildPreviewFromYoutube(sourceUrl, outputPath, tempDir)
    } else {
      await buildPreviewFromRemoteAudio(sourceUrl, outputPath)
    }

    const record: LocalPreviewRecord = {
      key,
      artist,
      album,
      title,
      channel,
      sourceType,
      sourceUrl,
      localUrl: `/music-preview-cache/${fileName}`,
      fileName,
      generatedAt: new Date().toISOString(),
      durationSec: await probeDuration(outputPath),
    }

    const records = await readPreviewRecords()
    const nextRecords = [record, ...records.filter((entry) => entry.key !== key)]
    await writePreviewRecords(nextRecords)
    return record
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
