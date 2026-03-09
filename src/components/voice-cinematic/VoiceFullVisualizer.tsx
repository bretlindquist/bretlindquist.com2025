import { useRef, useEffect, useCallback } from "react";
import type { MoodTheme } from "./voiceData";

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  mood: MoodTheme;
}

const VoiceFullVisualizer = ({ analyser, isPlaying, mood }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const hueShiftRef = useRef(0);

  const draw = useCallback(function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Fade trail
    ctx.fillStyle = "rgba(5, 5, 5, 0.12)";
    ctx.fillRect(0, 0, w, h);

    if (analyser && isPlaying) {
      const bufLen = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufLen);
      const timeData = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      hueShiftRef.current += 0.3;

      // === Mountain range bars from bottom ===
      const barCount = 80;
      const barW = w / barCount;
      const step = Math.floor(bufLen / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] / 255;
        const barH = val * h * 0.6;

        // Mirror from center
        const x = i * barW;
        const gradient = ctx.createLinearGradient(x, h, x, h - barH);
        gradient.addColorStop(0, mood.accent);
        gradient.addColorStop(0.5, mood.glow);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, h - barH, barW - 1, barH);

        // Reflection on top (subtle)
        const reflGrad = ctx.createLinearGradient(x, 0, x, barH * 0.3);
        reflGrad.addColorStop(0, "transparent");
        reflGrad.addColorStop(1, mood.glow.replace("0.25", "0.06"));

        ctx.fillStyle = reflGrad;
        ctx.fillRect(x, 0, barW - 1, barH * 0.3);
      }

      // === Floating waveform in center ===
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = mood.accent;
      const sliceW = w / bufLen;
      for (let i = 0; i < bufLen; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * sliceW, y);
      }
      ctx.stroke();

      // === Central glow pulse ===
      const bass = freqData.slice(0, 8).reduce((a, b) => a + b, 0) / (8 * 255);
      const glowRadius = 100 + bass * 200;
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, glowRadius);
      glow.addColorStop(0, mood.glow.replace("0.25", `${0.08 + bass * 0.12}`));
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Idle state — soft breathing glow
      hueShiftRef.current += 0.1;
      const pulse = Math.sin(hueShiftRef.current * 0.02) * 0.5 + 0.5;
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 150 + pulse * 80);
      glow.addColorStop(0, mood.glow.replace("0.25", `${0.03 + pulse * 0.04}`));
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    animRef.current = requestAnimationFrame(drawFrame);
  }, [analyser, isPlaying, mood]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

export default VoiceFullVisualizer;
