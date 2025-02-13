"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Header from "../components/Header";
import Image from "next/image";
import VimeoModal from '../components/VimeoModal';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ActingSection />
        <VoiceActingSection />
        <AboutMeSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

const HeroSection = () => {
  return (
    <section
      id="hero"
      className="w-full h-screen relative"
      style={{ backgroundColor: 'black' }} 
    >
      <Image
        src="https://ucarecdn.com/82d8fda7-534c-4576-805c-c048b96aaecd/BretLindquistActorHeadshot.webp"
        alt="Hero"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />
    </section>
  );
};

const ActingSection = () => {
  const [modalIsOpen1, setModalIsOpen1] = useState(false);
  const [modalIsOpen2, setModalIsOpen2] = useState(false);
  const posters = [
    "https://ucarecdn.com/cdf9bad4-9b3d-475f-b5ed-fdeb700b356c/21TheFieryPriestSeason2Episode1JeremyBrownBretLindquistActoratDinnerwithLeeHoney.webp",
    "https://ucarecdn.com/6de059a5-3700-4672-8232-d36e6dcab544/BretLindquistDynamiteManChiefDetective1958Season1Episode219582.webp",
    "https://ucarecdn.com/b62d831a-49d8-41b8-89c9-524eb4e759f4/BretLindquistJangsariActor.webp",
    "https://ucarecdn.com/d47a3788-44ef-4f19-aeb5-740d14559939/BretLindquistActorReelsScreenshots.webp",
  ];

  return (
    <section id="acting" className="p-8 bg-black">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div onClick={() => setModalIsOpen1(true)} style={{ cursor: 'pointer' }}>
          <Image
            src={posters[0]}
            alt="Poster 1"
            width={500}
            height={750}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div onClick={() => setModalIsOpen2(true)} style={{ cursor: 'pointer' }}>
          <Image
            src={posters[1]}
            alt="Poster 2"
            width={500}
            height={750}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div>
          <Image
            src={posters[2]}
            alt="Poster 3"
            width={500}
            height={750}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div>
          <Image
            src={posters[3]}
            alt="Poster 4"
            width={500}
            height={750}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      </div>

      <VimeoModal
        isOpen={modalIsOpen1}
        onRequestClose={() => setModalIsOpen1(false)}
        vimeoUrl="https://vimeo.com/1046306068"
      />
      <VimeoModal
        isOpen={modalIsOpen2}
        onRequestClose={() => setModalIsOpen2(false)}
        vimeoUrl="https://vimeo.com/940387499"
      />
    </section>
  );
};


interface AudioFile {
  src: string;
  title: string;
}

const audioFiles: AudioFile[] = [
  {
    src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3",
    title: "Brets Reel",
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
    src: "https://ucarecdn.com/1e10d202-e465-4f1a-9477-8630078312ef/calltoduty4.mp3",
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


function VoiceActingSection() {
  // 1) Track which audio file is selected
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  // 2) Playback state
  const [isPlaying, setIsPlaying] = useState(false);

  // 3) Refs for audio element and the visualizer
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 4) Refs for the AudioContext and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // ------------------------------------------------------------------------------
  // INITIALIZE AUDIOCONTEXT / ANALYSER ONCE (on mount)
  // ------------------------------------------------------------------------------
  useEffect(() => {
    // Create and store a single AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error("Web Audio API not supported in this browser.");
      return;
    }
    audioContextRef.current = new AudioContextClass();

    // Create a single AnalyserNode
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048; // Adjust if you want more or fewer waveform points

    // Connect audio element -> analyser -> destination
    // We'll do this once the audio element is available in the DOM
    const audioEl = audioRef.current;
    if (audioEl && audioContextRef.current && analyserRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audioEl);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    // Cleanup if needed
    return () => {
      if (audioContextRef.current) {
        // Not strictly necessary to close, but good practice
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ------------------------------------------------------------------------------
  // SET UP THE WAVEFORM DRAW LOOP (once on mount)
  // ------------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // 1) Clear the canvas
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2) Get the time-domain data
      analyser.getByteTimeDomainData(dataArray);

      // 3) Draw the waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lightblue";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2; // wave ranges from 0..255, center at half height
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // 4) Schedule next frame
      animationIdRef.current = requestAnimationFrame(draw);
    };

    // Start drawing
    animationIdRef.current = requestAnimationFrame(draw);

    // Clean up on unmount
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  // ------------------------------------------------------------------------------
  // PLAY / PAUSE LOGIC
  // ------------------------------------------------------------------------------
  const handlePlayPause = useCallback(() => {
    const audioEl = audioRef.current;
    const audioCtx = audioContextRef.current;
    if (!audioEl || !audioCtx) return;

    // iOS Safari: resume() must be called inside a user gesture
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch((err) => {
        console.error("Error resuming audio context:", err);
      });
    }

    if (isPlaying) {
      // Pause
      audioEl.pause();
      setIsPlaying(false);
    } else {
      // Play
      audioEl.play().then(
        () => {
          setIsPlaying(true);
        },
        (err) => {
          console.error("Playback error:", err);
        }
      );
    }
  }, [isPlaying]);

  // ------------------------------------------------------------------------------
  // WHEN THE USER SELECTS A TRACK
  // ------------------------------------------------------------------------------
  const handleSelectTrack = (index: number) => {
    // If user clicked the same track, just toggle
    if (index === currentIndex) {
      handlePlayPause();
      return;
    }

    // Different track: set it up, reset playback
    setCurrentIndex(index);
    setIsPlaying(false);

    const audioEl = audioRef.current;
    if (!audioEl) return;

    // Pause/Reset old track
    audioEl.pause();
    audioEl.currentTime = 0;

    // Set new src
    audioEl.src = audioFiles[index].src;
    // Let user press play button (or auto-play if you prefer)
  };

  return (
    <section id="voice" className="p-8 bg-black text-white">
      <h2 className="text-2xl font-bold mb-4">Bret&apos;s Voice Samples</h2>

      {/* Visualizer Container */}
      <div className="mb-4 relative bg-black" style={{ height: "200px" }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          className="w-full h-full"
          style={{ display: "block", backgroundColor: "black" }}
        />
        <button
          onClick={handlePlayPause}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full
                     bg-gradient-to-r from-blue-400 to-blue-600 text-white
                     flex items-center justify-center shadow-lg"
          style={{ width: "150px", height: "150px", fontSize: "2rem" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>

      {/* Track List */}
      <ol className="list-decimal pl-6 space-y-2">
        {audioFiles.map((file, i) => (
          <li key={file.src}>
            <button
              onClick={() => handleSelectTrack(i)}
              className="text-left hover:underline"
            >
              {file.title}
            </button>
            {i === currentIndex && (
              <span className="ml-2 text-sm text-gray-400">(Selected)</span>
            )}
          </li>
        ))}
      </ol>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </section>
  );
}


const AboutMeSection = () => {
  return (
    <section id="about" className="p-8 flex flex-col md:flex-row items-center gap-8 bg-black">
      <Image
        src="https://ucarecdn.com/82d8fda7-534c-4576-805c-c048b96aaecd/BretLindquistActorHeadshot.webp"
        alt="About Me"
        width={300}
        height={300}
        className="rounded-lg"
      />
      <p className="text-lg leading-relaxed">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vehicula, nisi ut aliquet scelerisque, sapien arcu tristique lectus, nec tincidunt velit nisl vel metus.
      </p>
    </section>
  );
};

const ContactSection = () => {
  return (
    <section id="contact" className="p-8 bg-black">
      <form action="#" method="POST" className="flex flex-col gap-4 max-w-md mx-auto">
        <input type="text" name="name" placeholder="Your Name" className="p-2 rounded-md text-black" />
        <input type="email" name="email" placeholder="Your Email" className="p-2 rounded-md text-black" />
        <textarea name="message" placeholder="Your Message" rows={5} className="p-2 rounded-md text-black"></textarea>
        <button type="submit" className="bg-white text-black px-4 py-2 rounded-md">Send</button>
      </form>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-black text-white p-4 text-center">
      &copy; {new Date().getFullYear()} Bret Lindquist. All rights reserved.
    </footer>
  );
};
