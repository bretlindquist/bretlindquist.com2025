import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMusicList, pickMusicList } from './_entries.ts'

test('parseMusicList accepts artist-album lines with optional numbering and metadata', () => {
  const entries = parseMusicList([
    '1. Rosalia - Lux',
    'Geese - Getting Killed (2025)',
    'Oneohtrix Point Never - Tranquilizer (2025) (65.82)',
  ].join('\n'))

  assert.equal(entries.length, 3)
  assert.deepEqual(entries[0], {
    index: 1,
    raw: '1. Rosalia - Lux',
    artist: 'Rosalia',
    album: 'Lux',
    query: 'Rosalia Lux',
    year: null,
    score: null,
  })
  assert.equal(entries[1].year, 2025)
  assert.equal(entries[2].score, 65.82)
})

test('parseMusicList rejects invalid lines', () => {
  assert.throws(
    () => parseMusicList('Just An Album Name'),
    /Line 1 is invalid\. Use "Artist - Album"\./,
  )
})

test('pickMusicList prefers explicit preferred list, then 2025, then final fallback', () => {
  assert.equal(pickMusicList(['2019.txt', '2025.txt'], '2019.txt'), '2019.txt')
  assert.equal(pickMusicList(['2019.txt', '2025.txt']), '2025.txt')
  assert.equal(pickMusicList(['2019.txt', 'ambient.txt']), 'ambient.txt')
})
