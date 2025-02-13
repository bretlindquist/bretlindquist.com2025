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
 * - Draws the main wave in light blue
 * - Draws echo layers in purple
 * - Spawns bubble-like particles in a blue->purple gradient
 * - Shows nothing (empty) if isPlaying=false
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

    // If no analyser or we are not playing, let's just clear the canvas and skip drawing
    // We'll do a loop that clears until isPlaying becomes true again.
    if (!analyser || !isPlaying) {
      // Simple approach: fill black one time and stop.
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // We are playing, so let's set up the wave
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // We'll store a simple particle system
    // Each particle is { x, y, alpha, radius, dx, dy, gradient }
    let particles: Array<{
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

      // Create a bubble gradient from light blue to light purple
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      // Light blue to light purple
      grad.addColorStop(0, "rgba(153, 204, 255, 1)"); // a softer lightblue
      grad.addColorStop(1, "rgba(200, 153, 255, 1)"); // light purple

      particles.push({
        x,
        y,
        alpha,
        radius,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        gradient: grad,
      });
    }

    function draw() {
      analyser.getByteTimeDomainData(dataArray);

      // Slight fade to black each frame so we get trailing
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw main waveform in light blue
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.strokeStyle = "#99ccff"; // a soft light blue
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
        // spawn a bubble sometimes
        if (i % 60 === 0 && Math.random() < 0.3) {
          spawnParticle(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw 3 echo layers behind in purple
      const echoCount = 3;
      for (let e = 1; e <= echoCount; e++) {
        ctx.beginPath();
        // each layer is progressively more transparent
        const alpha = 0.2 / e;
        ctx.strokeStyle = `rgba(180, 80, 220, ${alpha})`; 
        // a purple-ish color

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

      // Update/draw particles behind the echoes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.01; // fade out

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }
        // Draw each bubble with its gradient
        ctx.save();
        ctx.globalAlpha = p.alpha; // fade out over time
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
