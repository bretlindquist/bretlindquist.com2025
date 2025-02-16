"use client";

import React, { useRef, useEffect } from "react";

interface VisualizerProps {
  isPlaying: boolean;
  analyser: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Particle system for echo effects (unchanged)
    const particles: Array<{
      x: number;
      y: number;
      alpha: number;
      radius: number;
      dx: number;
      dy: number;
    }> = [];

    function spawnParticle(x: number, y: number) {
      const angle = Math.random() * 2 * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      particles.push({
        x,
        y,
        alpha: 1,
        radius: 2 + Math.random() * 3,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
      });
    }

    function draw() {
      analyser.getByteTimeDomainData(dataArray);

      // Clear canvas with a semi-transparent fill to create a trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- MULTIPLE WAVEFORM LINES WITH A 3D/MESH LOOK ---
      const waveCount = 3; // Number of main waveforms (e.g., top, center, bottom)
      const waveOffsets = [-20, 0, 20]; // Vertical offsets for each waveform
      const waveColors = ["#FF00FF", "#00FFFF", "#FFFF00"]; // Bright neon colors: magenta, cyan, and yellow
      const sliceWidth = canvas.width / bufferLength;

      // Store each waveform's points for drawing the mesh later
      const wavePoints: Array<Array<{ x: number; y: number }>> = [];

      for (let w = 0; w < waveCount; w++) {
        let points: Array<{ x: number; y: number }> = [];
        ctx.beginPath();
        // Vary line width to add a sense of depth (front waves thicker)
        ctx.lineWidth = 2 + (waveCount - w);
        ctx.strokeStyle = waveColors[w];
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          // Base Y value scaled to canvas, then offset per waveform
          const baseY = (v * canvas.height) / 2;
          const y = baseY + waveOffsets[w];
          points.push({ x, y });

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          // Spawn particles on the center waveform only
          if (w === 1 && i % 50 === 0 && Math.random() < 0.3 && isPlaying) {
            spawnParticle(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        wavePoints.push(points);
      }

      // --- MESH CONNECTIONS ---
      // Draw vertical lines connecting corresponding points between successive waveforms.
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Faint mesh lines
      for (let i = 0; i < bufferLength; i += 10) { // Use every 10th point for performance
        for (let w = 0; w < waveCount - 1; w++) {
          const p1 = wavePoints[w][i];
          const p2 = wavePoints[w + 1][i];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // --- ECHO TRAILS (FAINT, OFFSET WAVEFORMS) ---
      const echoCount = 3;
      for (let e = 1; e <= echoCount; e++) {
        ctx.beginPath();
        const alpha = 0.3 / e;
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          // Offset echo waveforms slightly for a trailing effect
          const y = (v * canvas.height) / 2 + e * 10;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      // --- PARTICLE SYSTEM (ECHO EFFECTS) ---
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
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      animationIdRef.current = requestAnimationFrame(draw);
    }

    animationIdRef.current = requestAnimationFrame(draw);

    // Cleanup on component unmount
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying, analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={240}
      className="w-full h-full"
      style={{ display: "block", backgroundColor: "black" }}
    />
  );
};

export default Visualizer;
