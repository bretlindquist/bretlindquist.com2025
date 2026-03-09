import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  onEnter: () => void;
}

const VoiceHeroEntrance = ({ onEnter }: Props) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center bg-[hsl(0,0%,2%)] z-50 cursor-pointer"
      onClick={onEnter}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Ambient fog layers */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, hsl(210, 100%, 56%), transparent 70%)",
            top: "30%",
            left: "40%",
          }}
          animate={{ scale: [1, 1.3, 1], x: [-20, 20, -20] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, hsl(35, 100%, 55%), transparent 70%)",
            bottom: "20%",
            right: "30%",
          }}
          animate={{ scale: [1.2, 1, 1.2], y: [-15, 15, -15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Microphone glow */}
      <motion.div
        className="relative mb-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1 }}
      >
        <div className="relative">
          {/* Glow ring */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(210, 100%, 56%, 0.15), transparent 70%)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Mic icon */}
          <svg
            viewBox="0 0 64 96"
            className="w-16 h-24 md:w-20 md:h-28"
            fill="none"
            stroke="hsl(210, 100%, 56%)"
            strokeWidth="2"
          >
            {/* Mic body */}
            <rect x="16" y="4" width="32" height="48" rx="16" strokeWidth="2.5" />
            {/* Grille lines */}
            {[16, 22, 28, 34, 40].map((y) => (
              <line key={y} x1="20" y1={y} x2="44" y2={y} strokeWidth="1" opacity="0.4" />
            ))}
            {/* Stand */}
            <path d="M8 52 Q8 68 32 68 Q56 68 56 52" strokeWidth="2.5" fill="none" />
            <line x1="32" y1="68" x2="32" y2="84" strokeWidth="2.5" />
            <line x1="20" y1="84" x2="44" y2="84" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        style={{
          background: "linear-gradient(135deg, hsl(0, 0%, 92%), hsl(210, 100%, 70%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        STEP INTO THE BOOTH
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="font-body text-muted-foreground text-sm md:text-base mt-4 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        A Voice Experience by Bret Lindquist
      </motion.p>

      {/* Enter CTA */}
      <motion.div
        className="mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
          className="relative px-10 py-4 font-display text-lg tracking-[0.3em] text-foreground border border-[hsla(210,100%,56%,0.3)] rounded-sm overflow-hidden group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(135deg, hsla(210,100%,56%,0.1), hsla(35,100%,55%,0.05))",
            }}
          />
          <span className="relative z-10">ENTER</span>
        </motion.button>

        <motion.p
          className="text-center text-muted-foreground/50 text-xs mt-4 font-body"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          click anywhere to begin
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default VoiceHeroEntrance;
