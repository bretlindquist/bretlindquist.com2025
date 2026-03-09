import { motion } from "framer-motion";
import { categories } from "./voiceData";

interface Props {
  onSelectTrack: (index: number) => void;
}

const VoiceSpectrumGrid = ({ onSelectTrack }: Props) => {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <h2
            className="font-display text-5xl md:text-7xl tracking-wider"
            style={{
              background: "linear-gradient(135deg, hsl(0,0%,92%), hsl(0,0%,50%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            THE SPECTRUM
          </h2>
          <p className="font-body text-muted-foreground text-sm mt-3 max-w-md">
            Explore the full range — from thundering battle cries to whispered narration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              onClick={() => {
                onSelectTrack(cat.trackIndex);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group relative overflow-hidden rounded-xl p-8 md:p-10 text-left border border-[hsla(0,0%,100%,0.05)] hover:border-[hsla(0,0%,100%,0.15)] transition-all duration-500"
              style={{
                background: "hsla(0,0%,100%,0.02)",
              }}
              whileHover={{ scale: 1.01 }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
                style={{
                  background: "radial-gradient(circle at 50% 50%, hsla(210,100%,56%,0.05), transparent 70%)",
                }}
              />

              <span className="text-4xl mb-4 block">{cat.icon}</span>
              <h3 className="font-display text-3xl md:text-4xl tracking-wider text-foreground mb-2">
                {cat.name}
              </h3>
              <p className="font-body text-sm text-muted-foreground">
                {cat.description}
              </p>

              {/* Arrow */}
              <div className="mt-6 flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <span className="font-body text-xs uppercase tracking-widest">Listen</span>
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VoiceSpectrumGrid;
