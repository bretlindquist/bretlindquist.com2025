"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import Voice3DScene from "@/components/voice-3d/Voice3DScene";
import { tracks } from "@/components/voice-cinematic/voiceData";

const supportsWebGL = () => {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  return Boolean(
    canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
  );
};

function FallbackBackdrop({ accent }: { accent: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 50% 42%, ${accent}26 0%, transparent 22%),
          radial-gradient(circle at 50% 50%, ${accent}12 0%, transparent 34%),
          radial-gradient(circle at 20% 18%, hsla(210, 100%, 70%, 0.16) 0%, transparent 20%),
          radial-gradient(circle at 80% 72%, hsla(0, 0%, 100%, 0.08) 0%, transparent 18%),
          linear-gradient(180deg, hsl(0,0%,2%) 0%, hsl(0,0%,0%) 100%)
        `,
      }}
    />
  );
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Voice 3D canvas error", error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

const Voice3DPage = () => {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [entered, setEntered] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [canvasStatus, setCanvasStatus] = useState<"ready" | "unsupported" | "error">(() =>
    supportsWebGL() ? "ready" : "unsupported"
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const track = tracks[currentTrack];

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audio.src = tracks[0].src;
    audio.volume = 0.8;
    audioRef.current = audio;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleEnded = () => {
      setCurrentTrack((previousTrack) => (previousTrack + 1) % tracks.length);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
      analyserRef.current = null;
      setAnalyser(null);
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx) {
        void ctx.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextSrc = tracks[currentTrack].src;
    const resolvedNextSrc =
      typeof window === "undefined" ? nextSrc : new URL(nextSrc, window.location.origin).href;

    if (audio.src !== resolvedNextSrc) {
      audio.src = nextSrc;
      audio.load();
      if (isPlaying) {
        audio.play().catch((error) => {
          console.warn("Unable to continue playback for voice 3D track change", error);
          setIsPlaying(false);
          setPlaybackError("Playback paused. Tap play to continue.");
        });
      }
    }
  }, [currentTrack, isPlaying]);

  const setupAnalyser = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAnalyser(analyser);
    } catch (e) {
      console.warn("Web Audio API not available:", e);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return false;
    setupAnalyser();
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setPlaybackError(null);
      return true;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setPlaybackError(null);
      return true;
    } catch (error) {
      console.warn("Unable to start voice 3D playback", error);
      setIsPlaying(false);
      setPlaybackError("Tap to start audio again.");
      return false;
    }
  }, [isPlaying, setupAnalyser]);

  const selectTrack = useCallback(
    (index: number) => {
      setupAnalyser();
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      setCurrentTrack(index);
      if (audioRef.current) {
        audioRef.current.src = tracks[index].src;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setPlaybackError(null);
          })
          .catch((error) => {
            console.warn("Unable to switch tracks in voice 3D", error);
            setIsPlaying(false);
            setPlaybackError("Track switch needs another tap.");
          });
      }
    },
    [setupAnalyser]
  );

  const nextTrack = useCallback(
    () => selectTrack((currentTrack + 1) % tracks.length),
    [currentTrack, selectTrack]
  );
  const prevTrack = useCallback(
    () => selectTrack((currentTrack - 1 + tracks.length) % tracks.length),
    [currentTrack, selectTrack]
  );

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-[hsl(0,0%,1%)] text-foreground overflow-hidden">
      {/* 3D Canvas Background */}
      <FallbackBackdrop accent={track.mood.accent} />
      {canvasStatus === "ready" ? (
        <CanvasErrorBoundary onError={() => setCanvasStatus("error")}>
          <Canvas
            camera={{ position: [0, 0, 6], fov: 60 }}
            className="absolute inset-0"
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Suspense fallback={null}>
              <Voice3DScene
                analyser={analyser}
                isPlaying={isPlaying}
                mood={track.mood}
              />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      ) : null}

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="pointer-events-auto p-6 flex justify-between items-start">
          <Link
            href="/"
            className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <Link
            href="/voice"
            className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Studio View →
          </Link>
        </div>

        {canvasStatus !== "ready" ? (
          <div className="pointer-events-none absolute right-6 top-20 max-w-xs rounded-full border border-white/10 bg-black/30 px-4 py-2 text-right font-body text-[10px] uppercase tracking-[0.24em] text-muted-foreground/80 backdrop-blur-sm">
            {canvasStatus === "unsupported"
              ? "3D fallback active on this device"
              : "3D scene recovered with fallback backdrop"}
          </div>
        ) : null}

        {/* Enter prompt (if not entered) */}
        <AnimatePresence>
          {!entered && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto cursor-pointer z-20"
              onClick={async () => {
                const started = await togglePlay();
                if (started) {
                  setEntered(true);
                }
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="font-display text-5xl md:text-7xl tracking-wider mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  background:
                    "linear-gradient(135deg, hsl(0,0%,92%), hsl(210,100%,70%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                IMMERSE
              </motion.h1>
              <motion.p
                className="font-body text-muted-foreground text-sm tracking-widest uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {playbackError ?? "Click to begin the experience"}
              </motion.p>
              <motion.div
                className="mt-8 w-16 h-16 rounded-full border border-[hsla(210,100%,56%,0.4)] flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Play className="w-6 h-6 text-foreground ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center track info */}
        {entered && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
              >
                <span
                  className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] font-body mb-3 border"
                  style={{
                    borderColor: track.mood.accent,
                    color: track.mood.accent,
                  }}
                >
                  {track.mood.label}
                </span>
                <h2 className="font-display text-4xl md:text-6xl tracking-wider text-foreground/80">
                  {track.title}
                </h2>
                <p className="font-body text-muted-foreground/60 text-xs mt-2">
                  {track.category}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Bottom controls */}
        {entered && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 pointer-events-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Track selector pills */}
            <div className="flex justify-center gap-2 mb-4 px-4 flex-wrap">
              {tracks.map((t, i) => (
                <button
                  key={t.title}
                  onClick={() => selectTrack(i)}
                  className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-body transition-all ${
                    i === currentTrack
                      ? "text-foreground"
                      : "text-muted-foreground/50 hover:text-muted-foreground"
                  }`}
                  style={{
                    background:
                      i === currentTrack
                        ? "hsla(0,0%,100%,0.1)"
                        : "hsla(0,0%,100%,0.03)",
                    border: `1px solid ${
                      i === currentTrack
                        ? t.mood.accent
                        : "hsla(0,0%,100%,0.05)"
                    }`,
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>

            {/* Progress */}
            <div className="px-6 max-w-xl mx-auto">
              <div
                className="h-0.5 bg-[hsla(0,0%,100%,0.08)] rounded-full cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    background: track.mood.accent,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] font-body text-muted-foreground/40">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center justify-center gap-6 py-4 pb-8">
              <button
                onClick={prevTrack}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center border transition-all"
                style={{
                  borderColor: track.mood.accent,
                  boxShadow: `0 0 30px ${track.mood.glow}`,
                }}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-foreground" />
                ) : (
                  <Play className="w-6 h-6 text-foreground ml-0.5" />
                )}
              </button>
              <button
                onClick={nextTrack}
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    const v = volume === 0 ? 0.8 : 0;
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="w-16 h-0.5 accent-primary cursor-pointer"
                />
              </div>
            </div>
            {playbackError ? (
              <p className="pb-6 text-center font-body text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
                {playbackError}
              </p>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Voice3DPage;
