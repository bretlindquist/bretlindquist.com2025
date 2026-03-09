"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceHeroEntrance from "@/components/voice-cinematic/VoiceHeroEntrance";
import VoiceBoothPlayer from "@/components/voice-cinematic/VoiceBoothPlayer";
import VoiceSpectrumGrid from "@/components/voice-cinematic/VoiceSpectrumGrid";
import VoiceContactCTA from "@/components/voice-cinematic/VoiceContactCTA";
import { tracks } from "@/components/voice-cinematic/voiceData";

const VoiceCinematicPage = () => {
  const [entered, setEntered] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audio.src = tracks[0].src;
    audioRef.current = audio;

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

  // Update src when track changes externally
  useEffect(() => {
    if (!audioRef.current) return;
    const nextSrc =
      typeof window === "undefined"
        ? tracks[currentTrack].src
        : new URL(tracks[currentTrack].src, window.location.origin).href;

    if (audioRef.current.src !== nextSrc) {
      audioRef.current.src = tracks[currentTrack].src;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
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

  const selectTrack = useCallback((index: number) => {
    setupAnalyser();
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    setCurrentTrack(index);
    if (audioRef.current) {
      audioRef.current.src = tracks[index].src;
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [setupAnalyser]);

  const nextTrack = useCallback(() => {
    selectTrack((currentTrack + 1) % tracks.length);
  }, [currentTrack, selectTrack]);

  const prevTrack = useCallback(() => {
    selectTrack((currentTrack - 1 + tracks.length) % tracks.length);
  }, [currentTrack, selectTrack]);

  const handleEnter = useCallback(() => {
    setEntered(true);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,2%)] text-foreground overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!entered ? (
          <VoiceHeroEntrance key="entrance" onEnter={handleEnter} />
        ) : (
          <motion.div
            key="booth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <VoiceBoothPlayer
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              analyser={analyser}
              onTogglePlay={togglePlay}
              onSelectTrack={selectTrack}
              onNext={nextTrack}
              onPrev={prevTrack}
              audioRef={audioRef}
            />
            <VoiceSpectrumGrid onSelectTrack={selectTrack} />
            <VoiceContactCTA />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceCinematicPage;
