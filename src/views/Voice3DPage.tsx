"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { tracks } from "@/components/voice-cinematic/voiceData";

const Voice3DPage = () => {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [entered, setEntered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const track = tracks[currentTrack];

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audio.src = tracks[0].src;
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    const handleEnded = () => {
      setCurrentTrack((previousTrack) => (previousTrack + 1) % tracks.length);
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

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
        audio.play().catch(() => {});
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
    } catch (e) {
      console.warn("Web Audio API not available:", e);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    setupAnalyser();
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
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
          .then(() => setIsPlaying(true))
          .catch(() => {});
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
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.75, 0.95, 0.8] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: `
              radial-gradient(circle at 20% 20%, ${track.mood.glow} 0%, transparent 35%),
              radial-gradient(circle at 80% 18%, hsla(0,0%,100%,0.09) 0%, transparent 20%),
              radial-gradient(circle at 50% 52%, hsla(210,100%,56%,0.12) 0%, transparent 28%),
              linear-gradient(180deg, hsl(0,0%,2%) 0%, hsl(0,0%,1%) 100%)
            `,
          }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 h-[46vw] w-[46vw] min-h-[280px] min-w-[280px] max-h-[620px] max-w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          animate={{
            rotate: 360,
            scale: isPlaying ? [1, 1.04, 1] : [0.98, 1.01, 0.98],
          }}
          transition={{
            rotate: { duration: 40, repeat: Infinity, ease: "linear" },
            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{
            background: `
              radial-gradient(circle at 35% 35%, hsla(0,0%,100%,0.22) 0%, transparent 18%),
              radial-gradient(circle at 50% 50%, ${track.mood.accent}22 0%, ${track.mood.accent}08 45%, transparent 70%),
              linear-gradient(145deg, hsla(0,0%,100%,0.05), transparent 55%)
            `,
            boxShadow: `0 0 80px ${track.mood.glow}`,
            border: `1px solid ${track.mood.accent}33`,
          }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] min-h-[360px] min-w-[360px] max-h-[880px] max-w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          style={{
            boxShadow: `inset 0 0 60px ${track.mood.glow}`,
          }}
        />

        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{
            backgroundImage:
              "radial-gradient(circle, hsla(0,0%,100%,0.8) 0 1px, transparent 1.5px)",
            backgroundSize: "180px 180px",
          }}
        />
      </div>

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

        {/* Enter prompt (if not entered) */}
        <AnimatePresence>
          {!entered && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto cursor-pointer z-20"
              onClick={() => {
                setEntered(true);
                togglePlay();
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
                Click to begin the experience
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Voice3DPage;
