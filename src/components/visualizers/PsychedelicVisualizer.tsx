import { useRef, useEffect, useCallback } from "react";

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const PsychedelicVisualizer = ({ analyser, isPlaying }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const hueRef = useRef(0);
  const trailsRef = useRef<{ x: number; y: number; r: number; hue: number; alpha: number }[]>([]);

  const draw = useCallback(function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Fade trail
    ctx.fillStyle = "rgba(10, 10, 10, 0.08)";
    ctx.fillRect(0, 0, w, h);

    if (analyser && isPlaying) {
      const bufLen = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufLen);
      const timeData = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      hueRef.current = (hueRef.current + 0.5) % 360;
      const cx = w / 2;
      const cy = h / 2;

      // Rotating radial rings
      const slices = 64;
      for (let ring = 0; ring < 3; ring++) {
        const baseRadius = 30 + ring * 50;
        ctx.beginPath();
        for (let i = 0; i <= slices; i++) {
          const idx = Math.floor((i / slices) * bufLen * 0.6);
          const val = freqData[idx] / 255;
          const angle = (i / slices) * Math.PI * 2 + hueRef.current * 0.02 * (ring + 1);
          const r = baseRadius + val * 80;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${(hueRef.current + ring * 120) % 360}, 100%, 60%, 0.7)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow fill
        ctx.fillStyle = `hsla(${(hueRef.current + ring * 120) % 360}, 100%, 50%, 0.05)`;
        ctx.fill();
      }

      // Floating particles from bass
      const bass = freqData.slice(0, 8).reduce((a, b) => a + b, 0) / (8 * 255);
      if (bass > 0.4 && trailsRef.current.length < 60) {
        trailsRef.current.push({
          x: cx + (Math.random() - 0.5) * 100,
          y: cy + (Math.random() - 0.5) * 100,
          r: 2 + Math.random() * 4,
          hue: hueRef.current + Math.random() * 60,
          alpha: 1,
        });
      }

      // Draw & update particles
      trailsRef.current = trailsRef.current.filter((p) => {
        p.y -= 0.5 + Math.random();
        p.x += (Math.random() - 0.5) * 2;
        p.alpha -= 0.012;
        if (p.alpha <= 0) return false;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue % 360}, 100%, 65%, ${p.alpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${p.hue % 360}, 100%, 65%, 0.5)`;
        ctx.fill();
        ctx.shadowBlur = 0;
        return true;
      });

      // Waveform overlay
      ctx.beginPath();
      for (let i = 0; i < bufLen; i++) {
        const x = (i / bufLen) * w;
        const y = (timeData[i] / 255) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${(hueRef.current + 180) % 360}, 100%, 70%, 0.3)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Idle: subtle pulsing circle
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, w, h);
      hueRef.current = (hueRef.current + 0.2) % 360;
      const pulse = Math.sin(Date.now() * 0.002) * 10 + 50;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hueRef.current}, 80%, 50%, 0.3)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(drawFrame);
  }, [analyser, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const resize = () => {
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

export default PsychedelicVisualizer;
