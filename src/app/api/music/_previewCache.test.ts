import assert from 'node:assert/strict'
import test from 'node:test'
import { previewCacheKey } from './_previewCache.ts'

test('previewCacheKey normalizes artist and album into a stable key', () => {
  assert.equal(
    previewCacheKey({ artist: 'Radiohead', album: 'A Moon Shaped Pool' }),
    'radiohead a moon shaped pool',
  )
})
