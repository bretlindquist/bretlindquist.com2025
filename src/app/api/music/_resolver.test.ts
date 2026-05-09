import assert from 'node:assert/strict'
import test from 'node:test'
import { createMusicResolver, currentMusicResolverProvider } from './_resolver.ts'

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

test('currentMusicResolverProvider defaults to ytmusic prototype', () => {
  const previous = process.env.MUSIC_RESOLVER_PROVIDER
  delete process.env.MUSIC_RESOLVER_PROVIDER
  assert.equal(currentMusicResolverProvider(), 'ytmusic-prototype')
  restoreEnv('MUSIC_RESOLVER_PROVIDER', previous)
})

test('currentMusicResolverProvider allows explicit youtube-data override', () => {
  const previous = process.env.MUSIC_RESOLVER_PROVIDER
  process.env.MUSIC_RESOLVER_PROVIDER = 'youtube-data'
  assert.equal(currentMusicResolverProvider(), 'youtube-data')
  restoreEnv('MUSIC_RESOLVER_PROVIDER', previous)
})

test('resolver falls back to youtube-data when ytmusic provider fails', async () => {
  const previous = process.env.MUSIC_RESOLVER_PROVIDER
  process.env.MUSIC_RESOLVER_PROVIDER = 'ytmusic-prototype'

  const resolveMusicMatch = createMusicResolver({
    searchMusicMatchViaYtMusic: async () => {
      throw new Error('provider failed')
    },
    searchMusicMatchViaYoutubeData: async () => ({
      ok: true,
      kind: 'video',
      videoId: 'abc123',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      url: 'https://www.youtube.com/watch?v=abc123',
      title: 'Fallback Result',
      channel: 'Fallback Channel',
      confidence: 'medium',
      warning: null,
      candidates: [],
    }),
  })

  const result = await resolveMusicMatch({ artist: 'Radiohead', album: 'A Moon Shaped Pool' })
  assert.equal(result.title, 'Fallback Result')
  assert.equal(result.kind, 'video')
  assert.equal(result.debug?.server?.provider, 'ytmusic-prototype')
  assert.equal(result.debug?.server?.resolverFallback, 'youtube-data')

  restoreEnv('MUSIC_RESOLVER_PROVIDER', previous)
})

test('resolver preserves provider preview strategy metadata', async () => {
  const previous = process.env.MUSIC_RESOLVER_PROVIDER
  process.env.MUSIC_RESOLVER_PROVIDER = 'ytmusic-prototype'

  const resolveMusicMatch = createMusicResolver({
    searchMusicMatchViaYtMusic: async () => ({
      ok: true,
      kind: 'video',
      videoId: 'burnthewitch',
      embedUrl: 'https://www.youtube.com/embed/burnthewitch',
      url: 'https://www.youtube.com/watch?v=burnthewitch',
      title: 'Radiohead - Burn The Witch',
      channel: 'Radiohead',
      previewStrategy: 'audio',
      confidence: 'low',
      warning: 'Using audio fallback',
      candidates: [],
      audioPreview: {
        trackName: 'Burn The Witch',
        artistName: 'Radiohead',
        collectionName: 'A Moon Shaped Pool',
        previewUrl: 'https://example.com/burn-the-witch.m4a',
      },
    }),
    searchMusicMatchViaYoutubeData: async () => {
      throw new Error('youtube-data should not be called')
    },
  })

  const result = await resolveMusicMatch({ artist: 'Radiohead', album: 'A Moon Shaped Pool' })
  assert.equal(result.previewStrategy, 'audio')
  assert.equal(result.audioPreview?.trackName, 'Burn The Witch')
  assert.equal(result.debug?.server?.provider, 'ytmusic-prototype')

  restoreEnv('MUSIC_RESOLVER_PROVIDER', previous)
})
