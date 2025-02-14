"use client";

import React, { useRef, useEffect, useState } from 'react';
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




// Same data you had
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
  // Which track is selected
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  // Whether the current track is playing
  const [isPlaying, setIsPlaying] = useState(false);

  // AudioContext
  const audioContextRef = useRef<AudioContext | null>(null);

  // Analyser
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Buffer storage: so we don't fetch/decode the same track over and over
  // { [srcUrl]: AudioBuffer }
  const bufferCacheRef = useRef<{ [src: string]: AudioBuffer }>({});

  // The currently playing AudioBufferSourceNode
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Our animation frame ID for the visualizer
  const animationIdRef = useRef<number | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize AudioContext + analyser once
  useEffect(() => {
    if (!audioContextRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AC();
    }
    if (!analyserRef.current && audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }
  }, []);

  // Set up the fancy draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const safeAnalyser = analyser;
    if (!canvas) return; 
    const safeCanvas = canvas;
    const ctx = safeCanvas.getContext("2d");
    if (!ctx) return;
    // For time-domain data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // We’ll store a simple particle system for “echo” effects
    // Each particle: { x, y, alpha, radius, dx, dy }
    const particles: Array<{
      x: number;
      y: number;
      alpha: number;
      radius: number;
      dx: number;
      dy: number;
    }> = [];

    function spawnParticle(x: number, y: number) {
      // A random direction and speed
      const angle = Math.random() * 2 * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      particles.push({
        x,
        y,
        alpha: 1,
        radius: 2 + Math.random() * 3,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
      });
    }

    function draw() {
      safeAnalyser.getByteTimeDomainData(dataArray);

      // Clear canvas each frame
      if (!ctx) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)"; 
      // Slightly transparent fill gives a “trail” effect
      ctx.fillRect(0, 0, safeCanvas.width, safeCanvas.height);

      ctx.lineWidth = 2;

      // Main waveform
      ctx.beginPath();
      ctx.strokeStyle = "#00ffff"; // bright cyan
      const sliceWidth = safeCanvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * safeCanvas.height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        // spawn a particle occasionally for visual spice
        if (i % 50 === 0 && Math.random() < 0.3 && isPlaying) {
          spawnParticle(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Echo layers behind (re-draw wave multiple times, offset, fade color)
      const echoCount = 3;
      for (let e = 1; e <= echoCount; e++) {
        ctx.beginPath();
        // more “echo-y,” each layer more transparent
        const alpha = 0.3 / e; 
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;

        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          // shift each echo layer a bit
          const y = (v * safeCanvas.height) / 2 + e * 10; 
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
      }

      // Update and draw the particle system
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.01; // fade out
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fill();
      }

      animationIdRef.current = requestAnimationFrame(draw);
    }

    animationIdRef.current = requestAnimationFrame(draw);

    // Cleanup on unmount
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying]); 
  // re-run the draw if isPlaying changes (so that it spawns particles only if playing)

  // Handle track selection
  function handleSelectTrack(index: number) {
    if (index === currentIndex) {
      // if same track, just toggle
      handlePlayPause();
      return;
    }
    setCurrentIndex(index);
    // stop old track if playing
    stopAudio();
    // once user clicks play, we’ll fetch+decode
  }

  // Actually fetch+decode the selected track
  async function loadAndPlayBuffer(src: string) {
    if (!audioContextRef.current || !analyserRef.current) return;
    const audioCtx = audioContextRef.current;
    // make sure context is resumed
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    // if we already have it in the cache, use that
    if (bufferCacheRef.current[src]) {
      startBuffer(bufferCacheRef.current[src]);
      return;
    }

    try {
      const response = await fetch(src);
      const arrayBuf = await response.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
      bufferCacheRef.current[src] = audioBuf;
      startBuffer(audioBuf);
    } catch (err) {
      console.error("Decode error:", err);
    }
  }

  function startBuffer(audioBuf: AudioBuffer) {
    stopAudio(); // ensure no old source is playing
    if (!audioContextRef.current || !analyserRef.current) return;

    const audioCtx = audioContextRef.current;
    const analyser = analyserRef.current;
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuf;
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    sourceNodeRef.current = sourceNode;
    sourceNode.start(0);
    setIsPlaying(true);

    // If you want it to stop automatically after it ends, you can do:
    sourceNode.onended = () => {
      setIsPlaying(false);
    };
  }

  function stopAudio() {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {}
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }

  async function handlePlayPause() {
    if (isPlaying) {
      // pause
      stopAudio();
    } else {
      // play
      if (currentIndex == null) {
        return; // no track selected
      }
      const selectedTrack = audioFiles[currentIndex];
      await loadAndPlayBuffer(selectedTrack.src);
    }
  }

  return (
    <section id="voice" className="p-8 bg-black text-white">
      <h2 className="text-2xl font-bold mb-4">Bret&apos;s Voice Samples</h2>
      <div className="mb-4 relative bg-black" style={{ height: "240px" }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={240}
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

      <ol className="list-decimal pl-6 space-y-2">
        {audioFiles.map((file, idx) => (
          <li key={file.src}>
            <button
              onClick={() => handleSelectTrack(idx)}
              className="text-left hover:underline"
            >
              {file.title}
            </button>
            {idx === currentIndex && (
              <span className="ml-2 text-sm text-gray-400">(Selected)</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}


const AboutMeSection = () => {
  return (
    <section id="about" className="p-8 flex flex-col md:flex-row items-start gap-8 bg-black text-white">
      <Image
        src="https://ucarecdn.com/82d8fda7-534c-4576-805c-c048b96aaecd/BretLindquistActorHeadshot.webp"
        alt="About Me"
        width={300}
        height={300}
        className="rounded-lg"
      />
      <div className="flex-1 overflow-y-auto max-h-[80vh]">
        <h2 className="text-2xl font-bold mb-4">About Me</h2>
        <p className="text-lg leading-relaxed mb-6">
          I am a versatile actor with extensive experience in drama, action, and stunt roles across various Korean television series and movies.
        </p>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Drama Roles</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Supporting Role - KBS [24-Hour Health Club] Episodes 7, 38, 39 - Knock-off ICE agent</li>
              <li>Recurring Supporting Role - The Fiery Priest 2 - Jeremy Brown, Drug Dealer (Episodes 1 & 2)</li>
              <li>Recurring Supporting Role - Polaris - Red Feather, Billie Grey, Marine Sniper Hitman</li>
              <li>Recurring Supporting Role - The Brave and Dashing Yongjujeong - James Weaver, U.S. Businessman and Traveler</li>
              <li>Supporting Role - Influenza</li>
              <li>ADR - Ask the Stars</li>
              <li>Recurring Supporting Role - The Brave and Dashing Yongsujeong</li>
              <li>Supporting Role - MBC Investigation Team: The Beginning - Dynamite Man</li>
              <li>Supporting Role - Ask the Stars - Investigation Team Leader (Episode 14)</li>
              <li>Supporting Role - High Class - Yacht Driver / Mafia Assassin</li>
              <li>Supporting Role - Remarriage & Desires - Yacht Captain</li>
              <li>Supporting Role - SBS Racket Boys - Match Announcer</li>
              <li>Supporting Role - Revolutionary Sisters - Tourist</li>
              <li>Supporting Role - Dali and Cocky Prince - Hotel Manager</li>
              <li>Supporting Role - Run On - American Journalist</li>
              <li>Supporting Role - Start-Up - CEO</li>
              <li>Supporting Role - SBS One the Woman - Secretary</li>
              <li>Supporting Role - King Maker: The Change of Destiny - Soldier (Stunt)</li>
              <li>Recurring Supporting Role - When I Was the Prettiest</li>
              <li>Supporting Role - Itaewon Class (February 17, 2020)</li>
              <li>Anchor - The King: Eternal Monarch (Voice/ADR)</li>
              <li>Main Recurring Supporting Role - Spring Turns to Spring (Episodes 3, 4, 5, 6, 7) - Stunt (Driving/Fighting)</li>
              <li>Supporting Role - My Strange Hero (2019)</li>
              <li>Lead Supporting Role - Twelve Nights (Episodes 5, 6, 7, 8, 2018)</li>
              <li>Recurring Supporting Role - I Am Also a Mother (Episodes 46, 57) [46 - 2018/08/01, 57 - 2018/08/16]</li>
              <li>Supporting Role - Welcome to Waikiki (Episode 12, March 20, 2018)</li>
              <li>Supporting Role - Where Stars Land (Episode 5, 2018/10/15)</li>
              <li>Supporting Role - Hold My Hand and Look at the Setting Sun (Episode 3, 2018/03/22)</li>
              <li>Recurring Supporting Role - Run On (October-November 2020)</li>
              <li>Recurring Supporting Role - Start-Up - CEO</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Stunt / Action Roles</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Knock-off - Miami USA - Gun & Weapons Training</li>
              <li>The Fiery Priest 2 - Drug Dealer Gun Fight and Hand-to-Hand Combat</li>
              <li>French Expedition to Korea - Action Fighting Scene</li>
              <li>Supporting Role - My Strange Hero (2019)</li>
              <li>Supporting Role - King Maker: The Change of Destiny - Soldier (Stunt)</li>
              <li>Recurring Supporting Role - When I Was the Prettiest</li>
              <li>Supporting Role - High Class - Yacht Driver / Mafia Assassin</li>
              <li>Supporting Role - Remarriage & Desires - Yacht Captain</li>
              <li>Supporting Role - MBC Investigation Team: The Beginning - Dynamite Man</li>
              <li>Recurring Supporting Role - The Fiery Priest 2 - Jeremy Brown, Drug Dealer</li>
              <li>Recurring Supporting Role - Polaris - Red Feather, Billie Grey, Marine Sniper Hitman</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Movie Appearances</h3>
            <ul className="list-inline">
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Ashfall (백두산) - CIA</li>
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Seobok (서복) - Soldier/CIA</li>
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Battle of Jangsari (장사리 9.15)</li>
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Hunt</li>
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Carter</li>
              <li className="inline-block bg-gray-800 px-3 py-1 rounded-full text-sm mb-2 mr-2">Boston Marathon</li>
            </ul>
          </div>
        </div>
      </div>
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
