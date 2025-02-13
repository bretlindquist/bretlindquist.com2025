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
    
    // Particle system for echo effects
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

      // Clear canvas with a slightly transparent fill for a trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw main waveform
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.strokeStyle = "#00ffff";
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
        // Spawn a particle occasionally when playing
        if (i % 50 === 0 && Math.random() < 0.3 && isPlaying) {
          spawnParticle(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw echo layers (multiple offset waveforms)
      const echoCount = 3;
      for (let e = 1; e <= echoCount; e++) {
        ctx.beginPath();
        const alpha = 0.3 / e;
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
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

      // Update and draw the particle system
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

    // Cleanup the animation on unmount
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
