import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const HeroSection = () => {
  const ref = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Reverse-play the video onto a canvas so the headshot (frame 0) is the last frame shown
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const video = document.createElement("video");
    video.src = "/videos/hero-turn-away.mp4";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let stopped = false;

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Start at the last frame
      video.currentTime = video.duration - 0.05;
    });

    video.addEventListener("seeked", function startReverse() {
      video.removeEventListener("seeked", startReverse);

      const step = 1 / 30; // ~30fps
      const drawFrame = () => {
        if (stopped) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (video.currentTime <= 0.05) {
          // Reached the first frame (the headshot) — freeze here
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setVideoEnded(true);
          return;
        }

        video.currentTime = Math.max(0, video.currentTime - step);
      };

      video.addEventListener("seeked", () => {
        animId = requestAnimationFrame(drawFrame);
      });

      // Kick off
      drawFrame();
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section id="hero" ref={ref} className="relative w-full h-screen overflow-hidden">
      {/* Static headshot underneath — revealed after video ends */}
      <motion.img
        src="/images/hero-headshot.webp"
        alt="Bret Lindquist - Actor Headshot"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ y: imgY }}
      />

      {/* Canvas plays video in reverse, ending on the headshot frame */}
      {!videoEnded && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-20 left-8 md:left-16"
        style={{ y: textY, opacity }}
      >
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-display tracking-wider text-foreground">
          BRET
          <br />
          LINDQUIST
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mt-4 font-body font-light tracking-widest uppercase">
          Actor · Voice Artist · Stunt Performer
        </p>
      </motion.div>
      <motion.a
        href="#acting"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors"
        style={{ opacity }}
      >
        <ChevronDown className="w-8 h-8 animate-bounce" />
      </motion.a>
    </section>
  );
};

export default HeroSection;
