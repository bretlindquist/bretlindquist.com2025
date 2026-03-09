"use client";

import { useState, useCallback } from "react";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import PostersSection from "@/components/PostersSection";
import VoicePlayerSection from "@/components/VoicePlayerSection";
import FilmographySection from "@/components/FilmographySection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import IntroAnimation from "@/components/IntroAnimation";

const HomePage = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const handleIntroComplete = useCallback(() => setIntroComplete(true), []);

  return (
    <div className="min-h-screen bg-background">
      {!introComplete && <IntroAnimation onComplete={handleIntroComplete} />}
      <Navigation />
      <HeroSection />
      <PostersSection />
      <VoicePlayerSection />
      <FilmographySection />
      <AboutSection />
      <ContactSection />
      <footer className="px-6 py-8 text-center text-muted-foreground text-sm font-body border-t border-border">
        © {new Date().getFullYear()} Bret Lindquist (홍보). All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
