import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseMusicList } from './_entries'

export type CommunityListRecord = {
  id: string
  name: string
  text: string
  createdAt: string
}

const LOCAL_PATH = path.join(process.cwd(), 'data', 'community-music-lists.json')
const DEFAULT_REMOTE_PATH = 'data/community-music-lists.json'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function githubConfig() {
  const owner = process.env.MUSIC_LISTS_GITHUB_OWNER || ''
  const repo = process.env.MUSIC_LISTS_GITHUB_REPO || ''
  const token = process.env.MUSIC_LISTS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''
  const branch = process.env.MUSIC_LISTS_GITHUB_BRANCH || 'main'
  const filePath = process.env.MUSIC_LISTS_GITHUB_PATH || DEFAULT_REMOTE_PATH

  if (!owner || !repo || !token) return null
  return { owner, repo, token, branch, filePath }
}

async function readLocalCommunityLists() {
  try {
    const text = await readFile(LOCAL_PATH, 'utf8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed as CommunityListRecord[] : []
  } catch {
    return []
  }
}

async function writeLocalCommunityLists(lists: CommunityListRecord[]) {
  await mkdir(path.dirname(LOCAL_PATH), { recursive: true })
  await writeFile(LOCAL_PATH, JSON.stringify(lists, null, 2) + '\n', 'utf8')
}

async function readGitHubCommunityLists(config: NonNullable<ReturnType<typeof githubConfig>>) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${config.branch}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  if (response.status === 404) return { lists: [] as CommunityListRecord[], sha: '' }
  if (!response.ok) throw new Error(`GitHub content read failed: ${response.status}`)

  const json = await response.json() as { content?: string; sha?: string; encoding?: string }
  const content = json.encoding === 'base64' && json.content
    ? Buffer.from(json.content.replace(/\n/g, ''), 'base64').toString('utf8')
    : '[]'
  const parsed = JSON.parse(content)

  return {
    lists: Array.isArray(parsed) ? parsed as CommunityListRecord[] : [],
    sha: json.sha || '',
  }
}

export async function getCommunityLists() {
  const config = githubConfig()
  if (!config) return await readLocalCommunityLists()

  const { lists } = await readGitHubCommunityLists(config)
  return lists
}

export async function addCommunityList(input: { name: string; text: string }) {
  const name = input.name.trim()
  const text = input.text.trim()

  if (!name) throw new Error('List name is required.')
  if (!text) throw new Error('List text is required.')

  parseMusicList(text)

  const config = githubConfig()
  if (!config) {
    const lists = await readLocalCommunityLists()
    const baseId = slugify(name) || 'list'
    let nextId = baseId
    let suffix = 2

    while (lists.some((list) => list.id === nextId)) {
      nextId = `${baseId}-${suffix}`
      suffix += 1
    }

    const nextRecord: CommunityListRecord = {
      id: nextId,
      name,
      text,
      createdAt: new Date().toISOString(),
    }

    await writeLocalCommunityLists([nextRecord, ...lists])
    return nextRecord
  }

  const { lists, sha } = await readGitHubCommunityLists(config)
  const baseId = slugify(name) || 'list'
  let nextId = baseId
  let suffix = 2

  while (lists.some((list) => list.id === nextId)) {
    nextId = `${baseId}-${suffix}`
    suffix += 1
  }

  const nextRecord: CommunityListRecord = {
    id: nextId,
    name,
    text,
    createdAt: new Date().toISOString(),
  }

  const nextLists = [nextRecord, ...lists]
  const body = {
    message: `Add community music list: ${name}`,
    content: Buffer.from(JSON.stringify(nextLists, null, 2) + '\n', 'utf8').toString('base64'),
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
    const textResponse = await response.text()
    throw new Error(`Community list save failed: ${response.status} ${textResponse.slice(0, 180)}`)
  }

  return nextRecord
}
