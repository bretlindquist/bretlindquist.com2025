import Link from "next/link";
import { useState, useEffect, RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import VoiceFullVisualizer from "./VoiceFullVisualizer";
import { type Track } from "./voiceData";

interface Props {
  tracks: Track[];
  currentTrack: number;
  isPlaying: boolean;
  analyser: AnalyserNode | null;
  onTogglePlay: () => void;
  onSelectTrack: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
}

const VoiceBoothPlayer = ({
  tracks,
  currentTrack,
  isPlaying,
  analyser,
  onTogglePlay,
  onSelectTrack,
  onNext,
  onPrev,
  audioRef,
}: Props) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const track = tracks[currentTrack];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => setDuration(audio.duration);
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [audioRef]);

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
    <section className="relative min-h-screen flex flex-col">
      {/* Full-screen visualizer background with mood transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrack}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          style={{ background: track.mood.gradient }}
        >
          <VoiceFullVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            mood={track.mood}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,2%)] via-transparent to-[hsla(0,0%,2%,0.4)]" />

      {/* Back link */}
      <div className="relative z-10 p-6">
        <Link
          href="/"
          className="font-body text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </Link>
      </div>

      {/* Center: Now Playing */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrack}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {/* Mood badge */}
            <motion.span
              className="inline-block px-4 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] font-body mb-4 border"
              style={{
                borderColor: track.mood.accent,
                color: track.mood.accent,
                boxShadow: `0 0 20px ${track.mood.glow}`,
              }}
            >
              {track.mood.label}
            </motion.span>

            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider">
              {track.title}
            </h2>
            <p className="font-body text-muted-foreground text-sm md:text-base mt-3 max-w-md mx-auto">
              {track.description}
            </p>
            <span className="font-body text-xs uppercase tracking-widest text-muted-foreground/60 mt-2 inline-block">
              {track.category}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-12 flex items-center gap-8">
          <button
            onClick={onPrev}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <motion.button
            onClick={onTogglePlay}
            className="w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all"
            style={{
              borderColor: track.mood.accent,
              boxShadow: `0 0 40px ${track.mood.glow}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-foreground" />
            ) : (
              <Play className="w-8 h-8 text-foreground ml-1" />
            )}
          </motion.button>

          <button
            onClick={onNext}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-8 w-full max-w-lg">
          <div
            className="h-1 bg-[hsla(0,0%,100%,0.1)] rounded-full cursor-pointer group relative"
            onClick={handleProgressClick}
          >
            <motion.div
              className="h-full rounded-full relative"
              style={{
                width: `${progress}%`,
                background: track.mood.accent,
                boxShadow: `0 0 10px ${track.mood.glow}`,
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>
          <div className="flex justify-between mt-2 text-xs font-body text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              const v = volume === 0 ? 0.8 : 0;
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
            className="w-20 h-1 accent-primary bg-secondary rounded-full cursor-pointer"
          />
        </div>
      </div>

      {/* Bottom: Track list as horizontal scroll cards */}
      <div className="relative z-10 px-6 pb-8">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 max-w-4xl mx-auto">
          {tracks.map((t, i) => (
            <motion.button
              key={t.title}
              onClick={() => onSelectTrack(i)}
              className={`relative px-3 py-3 rounded-lg text-center transition-all font-body border ${
                i === currentTrack
                  ? "border-opacity-100"
                  : "border-[hsla(0,0%,100%,0.05)] hover:border-[hsla(0,0%,100%,0.15)]"
              }`}
              style={{
                borderColor: i === currentTrack ? t.mood.accent : undefined,
                background:
                  i === currentTrack
                    ? `linear-gradient(135deg, hsla(0,0%,100%,0.05), hsla(0,0%,100%,0.02))`
                    : "hsla(0,0%,100%,0.02)",
                boxShadow: i === currentTrack ? `0 0 20px ${t.mood.glow}` : "none",
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <span
                className="w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-medium mb-1.5"
                style={{
                  background:
                    i === currentTrack
                      ? t.mood.accent
                      : "hsla(0,0%,100%,0.08)",
                  color: i === currentTrack ? "hsl(0,0%,2%)" : "hsl(0,0%,55%)",
                }}
              >
                {i === currentTrack && isPlaying ? (
                  <span className="inline-flex gap-0.5 items-end h-3">
                    {[0, 1, 2].map((bar) => (
                      <span
                        key={bar}
                        className="w-0.5 rounded-full"
                        style={{
                          background: "hsl(0,0%,2%)",
                          height: `${40 + Math.random() * 60}%`,
                          animation: `visualizer-bar ${0.4 + bar * 0.15}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <p className="text-[11px] font-medium text-foreground leading-tight truncate">{t.title}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 truncate">
                {t.category}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VoiceBoothPlayer;
