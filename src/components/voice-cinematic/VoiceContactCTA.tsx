import Link from "next/link";
import { motion } from "framer-motion";

const VoiceContactCTA = () => {
  return (
    <section className="relative px-6 py-32 md:py-40 overflow-hidden">
      {/* Spotlight effect */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px]"
        style={{
          background: "radial-gradient(ellipse at center, hsla(210,100%,56%,0.06), transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2
            className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider mb-6"
            style={{
              background: "linear-gradient(135deg, hsl(0,0%,92%), hsl(210,100%,70%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            BOOK THE VOICE
          </h2>
          <p className="font-body text-muted-foreground text-sm md:text-base mb-10 max-w-md mx-auto">
            Ready to bring your project to life? Let&apos;s talk about your vision.
          </p>

          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/#contact"
              className="inline-block px-12 py-4 font-display text-lg tracking-[0.2em] text-foreground rounded-sm border border-[hsla(210,100%,56%,0.4)] relative overflow-hidden group"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(135deg, hsla(210,100%,56%,0.15), hsla(35,100%,55%,0.08))",
                }}
              />
              <span className="relative z-10">GET IN TOUCH</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsla(0,0%,100%,0.08)] to-transparent" />

      <footer className="relative z-10 mt-20 text-center">
        <p className="font-body text-muted-foreground/40 text-xs">
          © {new Date().getFullYear()} Bret Lindquist. All rights reserved.
        </p>
      </footer>
    </section>
  );
};

export default VoiceContactCTA;
