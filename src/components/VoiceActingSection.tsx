// src/components/VoiceActingSection.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface AudioFile {
  src: string;
  title: string;
}

const audioFiles: AudioFile[] = [
  {
    src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3",
    title: "Bret's Reel",
  },
  {
    src: "https://ucarecdn.com/93e6ae68-18a5-4253-8e5d-6174f4c608f9/2025BretCharDemo.mp3",
    title: "Characters",
  },
  {
    src: "https://ucarecdn.com/237b8f2e-4b83-457f-8740-0e85f069a004/VariousCharacters.mp3",
    title: "Characters More",
  },
  {
    src: "https://ucarecdn.com/1e10d202-e465-4f1a-a9477-8630078312ef/calltoduty4.mp3",
    title: "TV Ad",
  },
  {
    src: "https://ucarecdn.com/a5879b78-89a7-483d-b668-aa1c423fa1a8/firecountry.mp3",
    title: "TV Prime Time",
  },
  {
    src: "https://ucarecdn.com/c5ad268d-24f5-47f6-a52c-5f2bd4f9d9b7/Project1.mp3",
    title: "Video Game",
  },
  {
    src: "https://ucarecdn.com/5adfdf11-a726-4abb-820d-3969b4b3d07b/rainforests_of_borneo5.mp3",
    title: "Narration",
  },
];

const VoiceActingSection: React.FC = () => {
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Play/pause toggle function.
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Play returns a promise (some browsers require a user gesture).
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  }, [isPlaying]);

  // When a new audio sample is selected.
  const handleSelectAudio = useCallback((src: string) => {
    // If clicking on the already loaded file, toggle play/pause.
    if (src === currentAudioSrc) {
      togglePlayPause();
      return;
    }
    // Otherwise, stop any current playback and switch the source.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentAudioSrc(src);
  }, [currentAudioSrc, togglePlayPause]);

  // Setup the waveform visualizer using the Web Audio API.
  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;

    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create a new AudioContext.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Adjust for smoothness.
    
    // Connect the audio element to the analyser.
    let source;
    try {
      source = audioContext.createMediaElementSource(audio);
    } catch (err) {
      console.error("Error creating MediaElementSource:", err);
      return;
    }
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Drawing function to render the waveform.
    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Clear canvas with black background.
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the waveform as a light blue line.
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lightblue";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize around 1.
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [currentAudioSrc]);

  // Auto-play the new audio when currentAudioSrc changes.
  useEffect(() => {
    if (currentAudioSrc && audioRef.current) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Auto-play error:", err));
    }
  }, [currentAudioSrc]);

  return (
    <section id="voice" className="p-8 bg-black text-white">
      <h2 className="text-2xl font-bold mb-4">Bret's Voice Samples</h2>

      {/* Visualizer & Play/Pause Button */}
      <div className="mb-4 relative bg-black" style={{ height: "200px" }}>
        {/* The canvas for waveform visualization */}
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          className="w-full h-full"
        />
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white flex items-center justify-center shadow-lg"
          style={{ width: "150px", height: "150px", fontSize: "2rem" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>

      {/* List of audio samples as an ordered list */}
      <ol className="list-decimal pl-6 space-y-2">
        {audioFiles.map((file, index) => (
          <li key={index}>
            <button
              onClick={() => handleSelectAudio(file.src)}
              className="text-left hover:underline"
            >
              {file.title}
            </button>
          </li>
        ))}
      </ol>

      {/* Hidden audio element for playback */}
      {currentAudioSrc && (
        <audio key={currentAudioSrc} ref={audioRef} src={currentAudioSrc} />
      )}
    </section>
  );
};

export default VoiceActingSection;
