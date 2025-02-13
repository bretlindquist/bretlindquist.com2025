"use client"

import { useRef, useEffect } from "react"

interface WaveformVisualizerProps {
  audioUrl: string
  isPlaying: boolean
}

export function WaveformVisualizer({ audioUrl, isPlaying }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Define a color palette inspired by Audacity’s classic scheme.
  // Feel free to adjust these values to better match your taste.
  const colorPalette = {
    background: "rgb(30, 30, 30)",      // A dark background
    waveform: "rgb(0, 153, 255)",        // Bright blue for the main waveform
    echo: "rgba(0, 153, 255, 0.3)",        // Translucent blue for the echo
    midLine: "rgba(255, 255, 255, 0.6)"    // A subtle mid-line for reference
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a new audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext

    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 2048

    // Fetch and decode the audio file
    fetch(audioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        // Create and connect the source node
        const sourceNode = audioContext.createBufferSource()
        sourceNode.buffer = audioBuffer
        sourceNode.connect(analyser)
        analyser.connect(audioContext.destination)
        sourceNodeRef.current = sourceNode

        // Start playback if needed
        if (isPlaying) {
          sourceNode.start(0)
        }

        function draw() {
          const bufferLength = analyser.frequencyBinCount
          const dataArray = new Uint8Array(bufferLength)
          analyser.getByteTimeDomainData(dataArray)

          // Clear the canvas using the background color
          ctx.fillStyle = colorPalette.background
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // (Optional) Draw a mid-line to help visualize the waveform center
          ctx.lineWidth = 1
          ctx.strokeStyle = colorPalette.midLine
          ctx.beginPath()
          ctx.moveTo(0, canvas.height / 2)
          ctx.lineTo(canvas.width, canvas.height / 2)
          ctx.stroke()

          const sliceWidth = canvas.width / bufferLength

          // Draw the echo waveform (background layer) with a slight vertical offset
          ctx.lineWidth = 2
          ctx.strokeStyle = colorPalette.echo
          ctx.beginPath()
          let x = 0
          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0
            // Offset the echo by +10px vertically to create a shadow effect
            const y = (v * canvas.height) / 2 + 10
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
            x += sliceWidth
          }
          ctx.stroke()

          // Draw the main waveform on top
          ctx.lineWidth = 2
          ctx.strokeStyle = colorPalette.waveform
          ctx.beginPath()
          x = 0
          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0
            const y = (v * canvas.height) / 2
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
            x += sliceWidth
          }
          ctx.stroke()

          requestAnimationFrame(draw)
        }

        draw()
      })

    // Cleanup function: stop the source and close the audio context
    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop()
        } catch (error) {
          // The node may have already stopped
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl, isPlaying]) // Redraw if the audio file or play state changes

  // Note: Managing play/pause with BufferSourceNodes requires a more robust solution,
  // as these nodes cannot be restarted once stopped.
  useEffect(() => {
    // This effect is here for completeness.
    // For improved behavior, consider re-creating the source node when toggling play/pause.
  }, [isPlaying])

  return <canvas ref={canvasRef} width="640" height="100" />
}
