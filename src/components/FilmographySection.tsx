import { motion } from "framer-motion";
import { Film, Swords, Clapperboard } from "lucide-react";

const dramaRoles = [
  "Supporting Role - KBS [24-Hour Health Club] Ep. 7, 38, 39 — Knock-off ICE Agent",
  "Recurring Supporting — The Fiery Priest 2 — Jeremy Brown, Drug Dealer (Ep. 1 & 2)",
  "Recurring Supporting — Polaris — Red Feather, Billie Grey, Marine Sniper Hitman",
  "Recurring Supporting — The Brave and Dashing Yongjujeong — James Weaver",
  "Supporting Role — Influenza",
  "ADR — Ask the Stars",
  "Supporting Role — MBC Investigation Team: The Beginning — Dynamite Man",
  "Supporting Role — Ask the Stars — Investigation Team Leader (Ep. 14)",
  "Supporting Role — High Class — Yacht Driver / Mafia Assassin",
  "Supporting Role — Remarriage & Desires — Yacht Captain",
  "Supporting Role — SBS Racket Boys — Match Announcer",
  "Supporting Role — Dali and Cocky Prince — Hotel Manager",
  "Supporting Role — Run On — American Journalist",
  "Supporting Role — Start-Up — CEO",
  "Supporting Role — SBS One the Woman — Secretary",
  "Supporting Role — King Maker: The Change of Destiny — Soldier",
  "Recurring Supporting — When I Was the Prettiest",
  "Supporting Role — Itaewon Class (2020)",
  "Anchor — The King: Eternal Monarch (Voice/ADR)",
  "Main Recurring Supporting — Spring Turns to Spring (Ep. 3–7) — Stunt",
  "Supporting Role — My Strange Hero (2019)",
  "Lead Supporting — Twelve Nights (Ep. 5–8, 2018)",
  "Recurring Supporting — I Am Also a Mother (Ep. 46, 57)",
  "Supporting Role — Welcome to Waikiki (Ep. 12, 2018)",
  "Supporting Role — Where Stars Land (Ep. 5, 2018)",
];

const stuntRoles = [
  "Knock-off — Miami USA — Gun & Weapons Training",
  "The Fiery Priest 2 — Drug Dealer Gun Fight & Hand-to-Hand Combat",
  "French Expedition to Korea — Action Fighting Scene",
  "My Strange Hero (2019) — Stunt",
  "King Maker — Soldier (Stunt)",
  "When I Was the Prettiest — Action",
  "High Class — Yacht Driver / Mafia Assassin",
  "MBC Investigation Team — Dynamite Man",
  "Polaris — Red Feather, Marine Sniper Hitman",
];

const movies = [
  "Ashfall (백두산) — CIA",
  "Seobok (서복) — Soldier/CIA",
  "Battle of Jangsari (장사리 9.15)",
  "Hunt",
  "Carter",
  "Boston Marathon",
];

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface CreditGroupProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  delay?: number;
}

const CreditGroup = ({ title, icon, items, delay = 0 }: CreditGroupProps) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, delay }}
  >
    <div className="flex items-center gap-3 mb-6">
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 300, delay: delay + 0.2 }}
        className="p-2 rounded-lg bg-secondary text-primary"
      >
        {icon}
      </motion.div>
      <h3 className="text-3xl font-display text-foreground">{title}</h3>
    </div>
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      className="space-y-2"
    >
      {items.map((item, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="px-4 py-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors text-sm font-body text-foreground/80"
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

const FilmographySection = () => {
  return (
    <section id="filmography" className="px-6 py-20 md:px-16 bg-background">
      <motion.h2
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-5xl md:text-6xl font-display text-foreground mb-16"
      >
        FILMOGRAPHY
      </motion.h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <CreditGroup
          title="DRAMA"
          icon={<Film className="w-5 h-5" />}
          items={dramaRoles}
        />
        <div className="space-y-16">
          <CreditGroup
            title="STUNT / ACTION"
            icon={<Swords className="w-5 h-5" />}
            items={stuntRoles}
            delay={0.15}
          />
          <CreditGroup
            title="MOVIES"
            icon={<Clapperboard className="w-5 h-5" />}
            items={movies}
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
};

export default FilmographySection;
