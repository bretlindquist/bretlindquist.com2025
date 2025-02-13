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
        <AudioTests />
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

const AudioTests = () => {
  const audioFiles = [
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

  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSimpleAudio = (src: string) => {
    const audio = new Audio(src);
    audio.play().catch(console.error);
  };

  const playControlledAudio = (src: string) => {
    setCurrentAudio(src);
    setIsPlaying(false);
  };

  useEffect(() => {
    if (currentAudio && audioRef.current) {
      audioRef.current.src = currentAudio;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [currentAudio]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section id="audio-tests" className="p-8 bg-black text-white">
      <h2>Audio Tests</h2>

      <h3>Simple Audio (No Controls)</h3>
      <ul>
        {audioFiles.map((file, index) => (
          <li key={index}>
            <button onClick={() => playSimpleAudio(file.src)}>{file.title}</button>
          </li>
        ))}
      </ul>

      <h3>Controlled Audio (Play/Pause)</h3>
      <ul>
        {audioFiles.map((file, index) => (
          <li key={index}>
            <button onClick={() => playControlledAudio(file.src)}>{file.title}</button>
          </li>
        ))}
      </ul>
      {currentAudio && (
        <audio ref={audioRef} controls style={{display: 'none'}}/>
      )}
      {currentAudio && (
        <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
      )}
    </section>
  );
};

/*
  Sample data using escaped apostrophes:
  { src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3", title: "Bret&apos;s Reel" },
  ...
*/

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

function VoiceActingSection() {
  // State for the current audio source and playback status.
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for the hidden audio element and the waveform canvas.
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Toggle play/pause.
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
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

  // Handle selecting a new audio file.
  const handleSelectAudio = useCallback(
    (src: string) => {
      if (src === currentAudioSrc) {
        togglePlayPause();
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentAudioSrc(src);
    },
    [currentAudioSrc, togglePlayPause]
  );

  // Set up the waveform visualizer.
  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create a new AudioContext.
    interface ExtendedWindow extends Window {
      webkitAudioContext?: typeof AudioContext;
    }
    const extendedWindow = window as ExtendedWindow;
    const AudioContextConstructor = window.AudioContext || extendedWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      console.error("Web Audio API not supported.");
      return;
    }
    const audioContext = new AudioContextConstructor();

    // Resume the AudioContext if it is suspended.
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

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

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
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

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [currentAudioSrc]);

  // Auto-play new audio when currentAudioSrc changes.
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
          key={currentAudioSrc || "empty"}
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
      {currentAudioSrc && (
        <audio key={currentAudioSrc} ref={audioRef} src={currentAudioSrc} />
      )}
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
