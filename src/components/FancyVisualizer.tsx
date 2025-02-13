"use client";
import React, { useRef, useEffect } from "react";

interface FancyVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
}

/**
 * A dedicated visualizer component that:
 * - Draws the main waveform in light blue
 * - Draws echo layers in purple
 * - Spawns bubble-like particles in a blue→purple gradient
 * - Clears the canvas when not playing
 */
export default function FancyVisualizer({
  analyser,
  isPlaying,
  width = 640,
  height = 240,
}: FancyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If no analyser or not playing, clear canvas and exit.
    if (!analyser || !isPlaying) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Use const since we don't reassign the array variable.
    const particles: Array<{
      x: number;
      y: number;
      alpha: number;
      radius: number;
      dx: number;
      dy: number;
      gradient: CanvasGradient;
    }> = [];

    function spawnParticle(x: number, y: number) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      const radius = 5 + Math.random() * 10;
      const alpha = 1;
      const grad = ctx!.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, "rgba(153, 204, 255, 1)"); // soft light blue
      grad.addColorStop(1, "rgba(200, 153, 255, 1)"); // light purple
      particles.push({ x, y, alpha, radius, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, gradient: grad });
    }

    function draw() {
      analyser!.getByteTimeDomainData(dataArray);
      if (!ctx) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Main waveform in light blue
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.strokeStyle = "#99ccff";
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        if (i % 60 === 0 && Math.random() < 0.3) {
          spawnParticle(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Echo layers in purple
      const echoCount = 3;
      for (let e = 1; e <= echoCount; e++) {
        ctx.beginPath();
        const alpha = 0.2 / e;
        ctx.strokeStyle = `rgba(180, 80, 220, ${alpha})`;
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2 + e * 12;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      // Draw particles (bubbles)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.01;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.fillStyle = p.gradient;
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }

      animationIdRef.current = requestAnimationFrame(draw);
    }

    animationIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", display: "block", backgroundColor: "black" }}
    />
  );
}
