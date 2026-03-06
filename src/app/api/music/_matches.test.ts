import assert from 'node:assert/strict'
import test from 'node:test'
import { musicMatchKey } from './_matches.ts'

test('musicMatchKey normalizes artist and album into a stable shared cache key', () => {
  assert.equal(
    musicMatchKey({ artist: 'Björk', album: 'Vespertine' }),
    musicMatchKey({ artist: 'Bjork', album: 'Vespertine' }),
  )

  assert.equal(
    musicMatchKey({ artist: 'Oneohtrix Point Never', album: 'Again' }),
    'oneohtrix point never again',
  )
})

test('musicMatchKey falls back to query when artist-album fields are missing', () => {
  assert.equal(
    musicMatchKey({ query: 'Rosalia Lux' }),
    'rosalia lux',
  )
})
