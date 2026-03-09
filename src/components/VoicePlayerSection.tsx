import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import BarsVisualizer from "./visualizers/BarsVisualizer";
import PsychedelicVisualizer from "./visualizers/PsychedelicVisualizer";
import WinampVisualizer from "./visualizers/WinampVisualizer";

interface Track {
  title: string;
  src: string;
}

const tracks: Track[] = [
  { title: "Bret's Reel", src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3" },
  { title: "Characters", src: "https://ucarecdn.com/93e6ae68-18a5-4253-8e5d-6174f4c608f9/2025BretCharDemo.mp3" },
  { title: "Characters More", src: "https://ucarecdn.com/237b8f2e-4b83-457f-8740-0e85f069a004/VariousCharacters.mp3" },
  { title: "Video Game", src: "https://ucarecdn.com/1e10d202-e465-4f1a-9477-8630078312ef/calltoduty4.mp3" },
  { title: "TV Prime Time", src: "https://ucarecdn.com/a5879b78-89a7-483d-b668-aa1c423fa1a8/firecountry.mp3" },
  { title: "TV Ad", src: "https://ucarecdn.com/c5ad268d-24f5-47f6-a52c-5f2bd4f9d9b7/Project1.mp3" },
  { title: "Narration", src: "https://ucarecdn.com/5adfdf11-a726-4abb-820d-3969b4b3d07b/rainforests_of_borneo5.mp3" },
];

const VISUALIZER_BARS = 48;
type VisualizerMode = "bars" | "psychedelic" | "winamp";

const VISUALIZER_LABELS: Record<VisualizerMode, string> = {
  bars: "Bars",
  psychedelic: "Psychedelic",
  winamp: "Winamp",
};

const VoicePlayerSection = () => {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [vizMode, setVizMode] = useState<VisualizerMode>("bars");
  const [volume, setVolume] = useState(0.8);
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array(VISUALIZER_BARS).fill(0.05)
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const currentTrackRef = useRef(0);

  const loadTrack = useCallback((index: number, autoPlay = false) => {
    if (!audioRef.current) return;
    currentTrackRef.current = index;
    setCurrentTrack(index);
    audioRef.current.src = tracks[index].src;
    audioRef.current.load();
    setProgress(0);
    setCurrentTime(0);
    if (autoPlay) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audio.src = tracks[0].src;
    audioRef.current = audio;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnded = () => {
      const next = (currentTrackRef.current + 1) % tracks.length;
      loadTrack(next, true);
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
      cancelAnimationFrame(animationRef.current);
    };
  }, [loadTrack]);

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
      sourceRef.current = source;
    } catch (e) {
      console.warn("Web Audio API not available:", e);
    }
  }, []);

  // Bars visualizer data update (only used for bars mode)
  const updateVisualizer = useCallback(function updateVisualizerFrame() {
    if (vizMode === "bars") {
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        const step = Math.floor(bufferLength / VISUALIZER_BARS);
        const bars = Array.from({ length: VISUALIZER_BARS }, (_, i) => {
          const value = dataArray[i * step] / 255;
          return Math.max(0.05, value);
        });
        setVisualizerData(bars);
      } else if (!isPlaying) {
        setVisualizerData((prev) => prev.map((v) => Math.max(0.05, v * 0.9)));
      }
    }
    animationRef.current = requestAnimationFrame(updateVisualizerFrame);
  }, [isPlaying, vizMode]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animationRef.current);
  }, [updateVisualizer]);

  const togglePlay = async () => {
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
  };

  const selectTrack = (index: number) => {
    setupAnalyser();
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    loadTrack(index, true);
  };

  const nextTrack = () => selectTrack((currentTrack + 1) % tracks.length);
  const prevTrack = () => selectTrack((currentTrack - 1 + tracks.length) % tracks.length);

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

  const modes: VisualizerMode[] = ["bars", "psychedelic", "winamp"];

  return (
    <section id="voice" className="px-6 py-20 md:px-16 bg-background">
      <motion.h2
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="text-5xl md:text-6xl font-display text-foreground mb-12"
      >
        VOICE SAMPLES
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        {/* Visualizer */}
        <div className="relative h-48 md:h-64 bg-secondary/50 rounded-t-xl overflow-hidden">
          {vizMode === "bars" && (
            <BarsVisualizer data={visualizerData} isPlaying={isPlaying} />
          )}
          {vizMode === "psychedelic" && (
            <PsychedelicVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
          )}
          {vizMode === "winamp" && (
            <WinampVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
          )}

          {/* Overlay info */}
          <div className="absolute top-4 left-6 z-10">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-body">
              Now Playing
            </span>
            <p className="text-xl font-display text-foreground mt-1">
              {tracks[currentTrack].title}
            </p>
          </div>
          <div className="absolute top-4 right-6 z-10 text-muted-foreground flex items-center gap-2">
            <span className="text-xs font-body">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <Volume2 className="w-5 h-5" />
          </div>

          {/* Visualizer mode switcher */}
          <div className="absolute bottom-3 right-4 z-10 flex gap-1">
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => setVizMode(mode)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded font-body transition-all ${
                  vizMode === mode
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {VISUALIZER_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 bg-secondary cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full transition-all duration-100 ease-linear relative"
            style={{
              width: `${progress}%`,
              background: "var(--gradient-accent)",
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 py-6 bg-secondary/30 rounded-b-xl">
          <button onClick={prevTrack} className="text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-background" />
            ) : (
              <Play className="w-7 h-7 text-background ml-1" />
            )}
          </button>
          <button onClick={nextTrack} className="text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward className="w-6 h-6" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => {
                const newVol = volume === 0 ? 0.8 : 0;
                setVolume(newVol);
                if (audioRef.current) audioRef.current.volume = newVol;
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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

        {/* Track list */}
        <div className="mt-6 space-y-1">
          {tracks.map((track, i) => (
            <button
              key={track.title}
              onClick={() => selectTrack(i)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-lg text-left transition-all font-body ${
                i === currentTrack
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <span className="w-8 text-center text-sm font-medium">
                {i === currentTrack && isPlaying ? (
                  <span className="inline-flex gap-0.5 items-end h-4">
                    {[0, 1, 2].map((bar) => (
                      <span
                        key={bar}
                        className="w-1 bg-primary rounded-full"
                        style={{
                          height: `${40 + Math.random() * 60}%`,
                          animation: `visualizer-bar ${0.4 + bar * 0.15}s ease-in-out infinite`,
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  `${i + 1}`
                )}
              </span>
              <span className="text-sm font-medium">{track.title}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default VoicePlayerSection;
