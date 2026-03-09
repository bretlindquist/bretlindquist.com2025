import { useRef, useEffect, useCallback } from "react";

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const COLORS = [
  "#00FF00", "#33FF00", "#66FF00", "#99FF00", "#CCFF00",
  "#FFFF00", "#FFCC00", "#FF9900", "#FF6600", "#FF3300", "#FF0000",
];

const WinampVisualizer = ({ analyser, isPlaying }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const peaksRef = useRef<number[]>(new Array(32).fill(0));
  const peakHoldRef = useRef<number[]>(new Array(32).fill(0));

  const draw = useCallback(function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Black background like Winamp
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    if (analyser && isPlaying) {
      const bufLen = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufLen);
      const timeData = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // === Top half: Oscilloscope ===
      const scopeH = h * 0.4;
      
      // Grid lines
      ctx.strokeStyle = "#0a2a0a";
      ctx.lineWidth = 1;
      for (let y = 0; y < scopeH; y += scopeH / 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Waveform
      ctx.beginPath();
      for (let i = 0; i < bufLen; i++) {
        const x = (i / bufLen) * w;
        const y = ((timeData[i] - 128) / 128) * (scopeH * 0.4) + scopeH / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#00FF00";
      ctx.stroke();
      ctx.shadowBlur = 0;

      // === Bottom half: Spectrum bars ===
      const barCount = 32;
      const specY = scopeH + 10;
      const specH = h - specY - 4;
      const gap = 2;
      const barW = (w - gap * (barCount + 1)) / barCount;
      const step = Math.floor(bufLen * 0.7 / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] / 255;
        const barH = val * specH;
        const x = gap + i * (barW + gap);
        const segH = 4;
        const segments = Math.floor(barH / segH);
        const totalSegments = Math.floor(specH / segH);

        // Draw segments
        for (let s = 0; s < segments; s++) {
          const ratio = s / totalSegments;
          const colorIdx = Math.min(COLORS.length - 1, Math.floor(ratio * COLORS.length));
          ctx.fillStyle = COLORS[colorIdx];
          ctx.fillRect(x, specY + specH - (s + 1) * segH, barW, segH - 1);
        }

        // Peak indicators
        if (val > peaksRef.current[i]) {
          peaksRef.current[i] = val;
          peakHoldRef.current[i] = 30;
        }
        if (peakHoldRef.current[i] > 0) {
          peakHoldRef.current[i]--;
        } else {
          peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.02);
        }
        const peakY = specY + specH - peaksRef.current[i] * specH;
        const peakRatio = peaksRef.current[i];
        const peakColorIdx = Math.min(COLORS.length - 1, Math.floor(peakRatio * COLORS.length));
        ctx.fillStyle = COLORS[peakColorIdx];
        ctx.fillRect(x, peakY, barW, 2);
      }

      // Divider line
      ctx.strokeStyle = "#1a3a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scopeH + 5);
      ctx.lineTo(w, scopeH + 5);
      ctx.stroke();
    } else {
      // Idle: flat line
      ctx.strokeStyle = "#004400";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(w, h * 0.2);
      ctx.stroke();
      
      // Text
      ctx.fillStyle = "#006600";
      ctx.font = `${Math.max(10, h * 0.06)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("▶ PRESS PLAY", w / 2, h * 0.5);
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

export default WinampVisualizer;
