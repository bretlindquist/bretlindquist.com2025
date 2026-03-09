import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const ContactSection = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Message sent! (Connect form to email service)");
  };

  return (
    <section id="contact" className="px-6 py-20 md:px-16 bg-background border-t border-border">
      <motion.h2
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="text-5xl md:text-6xl font-display text-foreground mb-12"
      >
        GET IN TOUCH
      </motion.h2>

      <motion.form
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
        onSubmit={handleSubmit}
        className="max-w-lg space-y-4"
      >
        <motion.input
          variants={fadeUp}
          type="text"
          placeholder="Your Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body"
        />
        <motion.input
          variants={fadeUp}
          type="email"
          placeholder="Your Email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body"
        />
        <motion.textarea
          variants={fadeUp}
          placeholder="Your Message"
          rows={5}
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body resize-none"
        />
        <motion.button
          variants={fadeUp}
          type="submit"
          className="flex items-center gap-2 px-8 py-3 rounded-lg font-body font-medium text-sm transition-all hover:scale-105"
          style={{
            background: "var(--gradient-accent)",
            color: "hsl(var(--background))",
          }}
        >
          <Send className="w-4 h-4" />
          Send Message
        </motion.button>
      </motion.form>
    </section>
  );
};

export default ContactSection;
