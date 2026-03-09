import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const AboutSection = () => {
  return (
    <section id="about" className="px-6 py-20 md:px-16 bg-background">
      <motion.h2
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-5xl md:text-6xl font-display text-foreground mb-12"
      >
        ABOUT
      </motion.h2>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="flex flex-col md:flex-row gap-12 items-start max-w-5xl"
      >
        <motion.img
          variants={fadeUp}
          src="/images/hero-headshot.webp"
          alt="Bret Lindquist"
          className="w-72 h-72 object-cover rounded-xl flex-shrink-0"
        />
        <div className="space-y-6">
          <motion.p variants={fadeUp} className="text-lg leading-relaxed text-foreground/80 font-body">
            I am a versatile actor with extensive experience in drama, action, and stunt roles
            across various Korean television series and movies. Based in South Korea, I bring
            authenticity and intensity to every role — from drug dealers to CIA operatives,
            from Marine snipers to yacht-driving assassins.
          </motion.p>
          <motion.p variants={fadeUp} className="text-lg leading-relaxed text-foreground/80 font-body">
            With credits spanning major networks like KBS, MBC, and SBS, and blockbuster films
            including Ashfall, Seobok, and Battle of Jangsari, I specialize in bringing
            international characters to life in Korean entertainment.
          </motion.p>
          <motion.p variants={fadeUp} className="text-lg leading-relaxed text-foreground/80 font-body">
            In addition to on-screen work, I am an experienced voice artist offering a range
            of vocal styles for commercials, narration, video games, and character work.
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutSection;
