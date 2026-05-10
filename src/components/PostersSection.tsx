import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const posters = [
  {
    src: "/images/poster-fiery-priest.webp",
    alt: "The Fiery Priest 2 - Jeremy Brown",
    href: "https://vimeo.com/1046306068",
  },
  {
    src: "/images/poster-dynamite-man.webp",
    alt: "Chief Detective 1958 - Dynamite Man",
    href: "https://vimeo.com/940387499",
  },
  { src: "/images/poster-jangsari.webp", alt: "Battle of Jangsari" },
  {
    src: "/images/poster-hwaja-scarlet.webp",
    alt: "Hwaja's Scarlet",
    href: "https://player.vimeo.com/video/1190790512?h=1ef23a0b3f",
  },
  {
    src: "/images/poster-reels.webp",
    alt: "Acting Reels Screenshots",
    href: "https://player.vimeo.com/video/792160179?h=e868574304",
  },
];

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const PostersSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  return (
    <section id="acting" ref={ref} className="px-6 py-20 md:px-16 bg-background overflow-hidden">
      <motion.h2
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-5xl md:text-6xl font-display text-foreground mb-12"
      >
        FEATURED WORK
      </motion.h2>
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        style={{ y: bgY }}
      >
        {posters.map((poster) => (
          <motion.div
            key={poster.alt}
            variants={fadeUp}
            className="group relative overflow-hidden rounded-lg"
          >
            {poster.href ? (
              <a
                href={poster.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open video for ${poster.alt}`}
                className="block"
              >
                <Image
                  src={poster.src}
                  alt={poster.alt}
                  width={960}
                  height={1440}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                  <span className="text-foreground font-display text-2xl tracking-wide">
                    {poster.alt}
                  </span>
                </div>
              </a>
            ) : (
              <>
                <Image
                  src={poster.src}
                  alt={poster.alt}
                  width={960}
                  height={1440}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                  <span className="text-foreground font-display text-2xl tracking-wide">
                    {poster.alt}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default PostersSection;
