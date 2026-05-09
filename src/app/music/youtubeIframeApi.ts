"use client"

export type YouTubePlayerApi = {
  loadVideoById(videoId: string): void
  loadPlaylist(playlistId: string): void
  destroy(): void
}

export type YouTubePlayerErrorEvent = {
  data: number
}

export type YouTubePlayerEvent = {
  data?: number
  target: YouTubePlayerApi
}

export type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void
        onError?: (event: YouTubePlayerErrorEvent) => void
        onStateChange?: (event: YouTubePlayerEvent) => void
      }
    },
  ) => YouTubePlayerApi
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
    __musicYouTubeApiReady__?: Promise<YouTubeNamespace>
  }
}

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window unavailable'))
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (window.__musicYouTubeApiReady__) {
    return window.__musicYouTubeApiReady__
  }

  window.__musicYouTubeApiReady__ = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-youtube-iframe-api="true"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.youtubeIframeApi = 'true'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.head.appendChild(script)
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT?.Player) {
        resolve(window.YT)
        return
      }

      reject(new Error('YouTube IFrame API loaded without YT.Player'))
    }
  })

  return window.__musicYouTubeApiReady__
}
