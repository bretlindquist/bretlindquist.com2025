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

    // Connect the audio element to the analyser
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Define a color palette (inspired by Audacity’s classic scheme)
    const colorPalette = {
      background: "rgb(30, 30, 30)", // Dark background
      waveform: "rgb(0, 153, 255)",   // Bright blue for main waveform
      echo: "rgba(0, 153, 255, 0.3)",   // Translucent blue for echo/shadow
      midLine: "rgba(255, 255, 255, 0.6)" // Subtle mid-line reference
    };

    const draw = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      // Clear the canvas with the background color
      ctx.fillStyle = colorPalette.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw a subtle mid-line
      ctx.lineWidth = 1;
      ctx.strokeStyle = colorPalette.midLine;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      // Draw the echo waveform (with a slight vertical offset)
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorPalette.echo;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalized value (centered at 1)
        const y = (v * canvas.height) / 2 + 10; // Offset echo by 10px
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw the main waveform on top
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

    // Start the drawing loop
    draw();

    // Cleanup on unmount: cancel animation frame and close audio context
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
      // Play returns a promise; resume the context if needed.
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas for the waveform visualization */}
      <canvas
        ref={canvasRef}
        width={640}
        height={100}
        className="w-full h-full"
      />
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} />
      {/* Circular play/pause button (positioned over the canvas on the right side) */}
      <button
        onClick={togglePlayPause}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white flex items-center justify-center text-2xl shadow-lg"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
    </div>
  );
}
