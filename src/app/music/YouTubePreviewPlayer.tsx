"use client"

import { useEffect, useRef } from 'react'
import { loadYouTubeIframeApi, type YouTubePlayerApi } from './youtubeIframeApi'

type YouTubePreviewPlayerProps = {
  className: string
  kind: 'video' | 'playlist'
  videoId?: string
  playlistId?: string
  origin: string
  previewStrategy?: 'probe' | 'direct'
  onPlaybackReady?: (resourceId: string) => void
  onEmbedError: (resourceId: string, errorCode: number) => void
}

export default function YouTubePreviewPlayer({
  className,
  kind,
  videoId,
  playlistId,
  origin,
  previewStrategy,
  onPlaybackReady,
  onEmbedError,
}: YouTubePreviewPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const mountNodeRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const playerRef = useRef<YouTubePlayerApi | null>(null)
  const latestResourceIdRef = useRef(kind === 'playlist' ? (playlistId || '') : (videoId || ''))
  latestResourceIdRef.current = kind === 'playlist' ? (playlistId || '') : (videoId || '')

  const applyFrameLayout = () => {
    const wrapperNode = wrapperRef.current
    if (!wrapperNode) return

    wrapperNode.style.width = '100%'
    wrapperNode.style.height = '620px'
    wrapperNode.style.overflow = 'hidden'
    wrapperNode.style.borderRadius = '24px'
    wrapperNode.style.background = '#000'
    wrapperNode.style.position = 'relative'

    const child = wrapperNode.firstElementChild as HTMLElement | null
    if (!child) return

    child.style.width = '100%'
    child.style.height = '100%'
    child.style.display = 'block'
    child.style.border = '0'
    child.style.borderRadius = '24px'

    const iframe = child.tagName === 'IFRAME'
      ? child
      : child.querySelector('iframe')

    if (iframe instanceof HTMLElement) {
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.display = 'block'
      iframe.style.border = '0'
      iframe.style.borderRadius = '24px'
    }
  }

  useEffect(() => {
    let cancelled = false

    const mountPlayer = async () => {
      if (!wrapperRef.current) return
      const currentResourceId = latestResourceIdRef.current

      if ((kind === 'playlist' && playlistId) || (kind === 'video' && previewStrategy === 'direct' && videoId)) {
        playerRef.current?.destroy()
        playerRef.current = null
        mountNodeRef.current = null
        wrapperRef.current.replaceChildren()

        const iframe = document.createElement('iframe')
        iframe.src = kind === 'playlist'
          ? `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&playsinline=1&origin=${encodeURIComponent(origin)}`
          : `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&origin=${encodeURIComponent(origin)}`
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        iframe.allowFullscreen = true
        iframe.referrerPolicy = 'strict-origin-when-cross-origin'
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.display = 'block'
        iframe.style.border = '0'
        iframe.style.borderRadius = '24px'
        iframe.addEventListener('load', () => {
          if (!cancelled) onPlaybackReady?.(currentResourceId)
        }, { once: true })
        wrapperRef.current.replaceChildren(iframe)
        iframeRef.current = iframe
        window.requestAnimationFrame(applyFrameLayout)
        return
      }

      if (!mountNodeRef.current) {
        const mountNode = document.createElement('div')
        mountNode.style.width = '100%'
        mountNode.style.height = '620px'
        wrapperRef.current.replaceChildren(mountNode)
        mountNodeRef.current = mountNode
      }

      const YT = await loadYouTubeIframeApi()
      if (cancelled || !mountNodeRef.current) return

      playerRef.current?.destroy()
      playerRef.current = null

      let settled = false
      let readyTimeoutId: number | null = null
      const finishReady = () => {
        if (settled) return
        settled = true
        if (readyTimeoutId !== null) {
          window.clearTimeout(readyTimeoutId)
          readyTimeoutId = null
        }
        onPlaybackReady?.(currentResourceId)
      }

      const finishError = (errorCode: number) => {
        if (settled) return
        settled = true
        if (readyTimeoutId !== null) {
          window.clearTimeout(readyTimeoutId)
          readyTimeoutId = null
        }
        onEmbedError(currentResourceId, errorCode)
      }

      const playerOptions = {
        ...(kind === 'video' && videoId ? { videoId } : {}),
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          origin,
          ...(kind === 'playlist' && playlistId ? { listType: 'playlist', list: playlistId } : {}),
        },
        events: {
          onReady: () => {
            applyFrameLayout()
            readyTimeoutId = window.setTimeout(() => finishError(153), 1600)
          },
          onStateChange: (event: { data?: number }) => {
            if (event.data === 1 || event.data === 2 || event.data === 5) {
              finishReady()
            }
          },
          onError: (event: { data: number }) => {
            finishError(event.data)
          },
        },
      }

      playerRef.current = new YT.Player(mountNodeRef.current, playerOptions)

      window.requestAnimationFrame(applyFrameLayout)
    }

    void mountPlayer()

    return () => {
      cancelled = true
    }
  }, [kind, onEmbedError, onPlaybackReady, origin, playlistId, previewStrategy, videoId])

  useEffect(() => {
    const wrapperNode = wrapperRef.current

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
      mountNodeRef.current = null
      iframeRef.current = null
      wrapperNode?.replaceChildren()
    }
  }, [])

  return <div ref={wrapperRef} className={className} data-origin={origin} style={{ width: '100%', height: '620px', borderRadius: 24, overflow: 'hidden', background: '#000', position: 'relative' }} />
}
