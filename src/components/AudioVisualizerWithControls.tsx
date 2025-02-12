"use client";

import { useRef, useEffect, useState } from "react";

interface AudioVisualizerWithControlsProps {
  audioUrl: string;
}

export default function AudioVisualizerWithControls({
  audioUrl,
}: AudioVisualizerWithControlsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  // Ref to store the media element source so we don't recreate it.
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !audioRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audio = audioRef.current;

    // Create a new AudioContext and the analyser node
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Higher FFT size for a smoother waveform

    // Only create the media element source if it hasn't been created already.
    if (!mediaSourceRef.current) {
      try {
        mediaSourceRef.current = audioContext.createMediaElementSource(audio);
      } catch (err) {
        console.error("Error creating MediaElementSource:", err);
        return;
      }
    }
    const source = mediaSourceRef.current;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Define a color palette
    const colorPalette = {
      background: "rgb(30, 30, 30)",
      waveform: "rgb(0, 153, 255)",
      echo: "rgba(0, 153, 255, 0.3)",
      midLine: "rgba(255, 255, 255, 0.6)"
    };

    const draw = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      // Clear the canvas with the background color
      ctx.fillStyle = colorPalette.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw mid-line
      ctx.lineWidth = 1;
      ctx.strokeStyle = colorPalette.midLine;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      // Draw the echo waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorPalette.echo;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2 + 10;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw the main waveform
      x = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorPalette.waveform;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} width={640} height={100} className="w-full h-full" />
      {/* Option 1: Use a key to force remounting (recommended if audioUrl changes) */}
      <audio key={audioUrl} ref={audioRef} src={audioUrl} />
      {/* Option 2: If audioUrl does not change, you can simply render without key */}
      {/* <audio ref={audioRef} src={audioUrl} /> */}
      <button
        onClick={togglePlayPause}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white flex items-center justify-center text-2xl shadow-lg"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
    </div>
  );
}
