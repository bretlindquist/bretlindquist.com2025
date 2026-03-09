import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IntroAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"name" | "subtitle" | "exit">("name");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("subtitle"), 1200);
    const t2 = setTimeout(() => setPhase("exit"), 2800);
    const t3 = setTimeout(onComplete, 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="intro"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          {/* Accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-24 h-0.5 mb-8 origin-center"
            style={{ background: "var(--gradient-accent)" }}
          />

          {/* Name */}
          <motion.h1
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            animate={{ opacity: 1, letterSpacing: "0.15em" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-display text-foreground text-center"
          >
            BRET LINDQUIST
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={
              phase !== "name"
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 10 }
            }
            transition={{ duration: 0.6 }}
            className="mt-4 text-sm md:text-base text-muted-foreground font-body tracking-[0.3em] uppercase"
          >
            Actor · Voice Artist · 배우 · 성우
          </motion.p>

          {/* Bottom line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="w-24 h-0.5 mt-8 origin-center"
            style={{ background: "var(--gradient-accent)" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default IntroAnimation;
