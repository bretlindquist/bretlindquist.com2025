"use client";

import React, { useState, useRef } from 'react';
import AudioVisualizer from '../components/AudioVisualizer';
import Header from "../components/Header";
import AudioPlayer from '../components/AudioPlayer';
import Image from "next/image";
import VimeoModal from '../components/VimeoModal';


export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-[60px]">
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
    <section id="hero" className="w-full h-screen">
      <Image
        src="https://ucarecdn.com/82d8fda7-534c-4576-805c-c048b96aaecd/BretLindquistActorHeadshot.webp"
        alt="Hero"
        fill
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
    <section id="acting" className="p-8">
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



const VoiceActingSection = () => {
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const audioFiles = [
    { src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3", title: "Bret's Reel" },
    { src: "https://ucarecdn.com/93e6ae68-18a5-4253-8e5d-6174f4c608f9/2025BretCharDemo.mp3", title: "Characters" },
    { src: "https://ucarecdn.com/237b8f2e-4b83-457f-8740-0e85f069a004/VariousCharacters.mp3", title: "Characters More" },
    { src: "https://ucarecdn.com/1e10d202-e465-4f1a-9477-8630078312ef/calltoduty4.mp3", title: "TV Ad" },
    { src: "https://ucarecdn.com/a5879b78-89a7-483d-b668-aa1c423fa1a8/firecountry.mp3", title: "TV Prime Time" },
    { src: "https://ucarecdn.com/c5ad268d-24f5-47f6-a52c-5f2bd4f9d9b7/Project1.mp3", title: "Video Game" },
    { src: "https://ucarecdn.com/5adfdf11-a726-4abb-820d-3969b4b3d07b/rainforests_of_borneo5.mp3", title: "Narration" },
  ];

  const handlePlay = (src: string) => {
    // Stop currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Create a new audio element and play it
    const newAudio = new Audio(src);
    setCurrentAudio(newAudio);
    newAudio.play().catch((e) => console.error("Audio playback failed:", e));
  };

  return (
    <section id="voice" className="p-8">
      <h2 className="text-2xl font-bold mb-4">Bret's Voice Samples</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {audioFiles.map((file, index) => (
          <button
            key={index}
            onClick={() => handlePlay(file.src)}
            className="text-left p-2 hover:bg-gray-700 rounded"
          >
            {file.title}
          </button>
        ))}
      </div>
    </section>
  );
};





const AboutMeSection = () => {
  return (
    <section id="about" className="p-8 flex flex-col md:flex-row items-center gap-8">
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
    <section id="contact" className="p-8">
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
