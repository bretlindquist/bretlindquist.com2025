"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Header from "../components/Header";
import Image from "next/image";
import VimeoModal from '../components/VimeoModal';
import { WaveformVisualizer } from "../components/WaveformVisualizer"

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ActingSection />
        <VoiceActing />
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
    title: "Bret&apos;s Reel",
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
function VoiceActing() {
  const [currentClip, setCurrentClip] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  const handleClipClick = (file: string) => {
    if (currentClip === file) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentClip(file)
      setIsPlaying(true)
    }
  }

  return (
    <section className="mb-12">
      <h2 className="text-3xl font-semibold mb-4">Voice Acting</h2>
      <div className="bg-white p-4 rounded shadow relative">
        {currentClip && (
          <div className="relative">
            {/* The waveform visualizer is wrapped in a relative container */}
            <WaveformVisualizer audioUrl={currentClip} isPlaying={isPlaying} />
            {/* Floating play/pause button positioned to the right */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? "❚❚" : "►"}
            </button>
          </div>
        )}
        <ul className="space-y-2 mt-4">
          {audioFiles.map((clip) => (
            <li key={clip.file}>
              <button
                onClick={() => handleClipClick(clip.file)}
                className="text-left w-full p-2 hover:bg-gray-100 rounded transition-colors"
              >
                {clip.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <audio ref={audioRef} src={currentClip || undefined} />
    </section>
  )
}

function VoiceActingSection() {
  // Track the currently selected audio source and its playing status.
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for our audio element and canvas.
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Create a persistent AudioContext, analyser, and media source.
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize the AudioContext once.
  useEffect(() => {
    if (!audioContextRef.current) {
      const AudioContextConstructor =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextConstructor) {
        audioContextRef.current = new AudioContextConstructor();
      } else {
        console.error("Web Audio API not supported.");
      }
    }
  }, []);

  // Whenever a new audio source is selected, update the audio element and reconnect
  // the media element to the analyser.
  useEffect(() => {
    if (!audioRef.current || !audioContextRef.current || !currentAudioSrc) return;

    // Set the new source without re-mounting the element.
    audioRef.current.src = currentAudioSrc;
    audioRef.current.load();

    // Disconnect any previous source.
    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
    }
    try {
      mediaSourceRef.current = audioContextRef.current.createMediaElementSource(
        audioRef.current
      );
    } catch (err) {
      console.error("Error creating MediaElementSource:", err);
      return;
    }

    // Create (or recreate) the analyser.
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;

    // Connect the nodes: audio -> analyser -> destination.
    mediaSourceRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    // Start the visualizer.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lightblue";
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
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

    // Cleanup on source change.
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentAudioSrc]);

  // Toggle play/pause and ensure the AudioContext is running.
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !audioContextRef.current) return;

    // Resume the AudioContext if it’s suspended.
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(console.error);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback error:", err));
    }
  }, [isPlaying]);

  // When a new file is selected, if it’s already the current file then toggle play/pause.
  const handleSelectAudio = useCallback(
    (src: string) => {
      if (src === currentAudioSrc) {
        togglePlayPause();
      } else {
        // If a new source is selected, pause and reset the audio element.
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentAudioSrc(src);
      }
    },
    [currentAudioSrc, togglePlayPause]
  );

  // Auto-play when currentAudioSrc changes.
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
      <h2 className="text-2xl font-bold mb-4">Bret&apos;s Voice Samples</h2>
      <div className="mb-4 relative bg-black" style={{ height: "200px" }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          className="w-full h-full"
        />
        <button
          onClick={togglePlayPause}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white flex items-center justify-center shadow-lg"
          style={{ width: "150px", height: "150px", fontSize: "2rem" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      </div>
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
      {/* The audio element stays mounted so we can reuse it */}
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
