import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const MUSIC_LIST_DIR = path.join(process.cwd(), 'data', 'music-lists')
const TXT_EXT = '.txt'

export function getMusicListPath(name: string) {
  return path.join(MUSIC_LIST_DIR, path.basename(name))
}

export async function getMusicListNames() {
  const entries = await readdir(MUSIC_LIST_DIR, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(TXT_EXT))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

export async function readMusicList(name: string) {
  return readFile(getMusicListPath(name), 'utf8')
}
