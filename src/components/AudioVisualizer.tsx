"use client";

import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioSrc: string | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioSrc }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioSrc) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const audio = new Audio(audioSrc);
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const drawVisual = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        ctx.fillStyle = `rgb(50, 50, ${barHeight + 100})`;
        ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioSrc]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default AudioVisualizer;
