"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import AnimatedText from "./AnimatedText";

const services = [
  {
    n: "01",
    title: "Brand Identity",
    desc: "Logo systems, typography, color, voice — the full visual & verbal language of your brand.",
    tags: ["Logo", "Type", "Guidelines", "Naming"],
    accent: "bg-electric",
  },
  {
    n: "02",
    title: "Motion & Direction",
    desc: "Kinetic identities, brand films, ad campaigns and storytelling that refuses to sit still.",
    tags: ["After Effects", "Cinema 4D", "Storyboarding"],
    accent: "bg-acid",
  },
  {
    n: "03",
    title: "Web Experience",
    desc: "High-fidelity, motion-driven websites that turn your brand into a destination.",
    tags: ["UX", "Prototype", "Framer", "Next.js"],
    accent: "bg-cobalt",
  },
  {
    n: "04",
    title: "Creative Strategy",
    desc: "Positioning, messaging, campaign concepts. Ideas with teeth, executions with taste.",
    tags: ["Workshops", "Research", "Concept"],
    accent: "bg-plum",
  },
];

export default function Services() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="services" className="relative py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-cream/60 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="block w-12 h-px bg-cream/40" />
          <span>02 — Services</span>
        </motion.div>

        <AnimatedText
          text="What I can do for you."
          className="font-display text-5xl md:text-7xl leading-[1.05] mb-20 max-w-4xl"
        />

        <div className="border-t border-cream/15">
          {services.map((s, i) => (
            <motion.div
              key={s.n}
              className="group relative border-b border-cream/15 py-8 md:py-12 cursor-pointer overflow-hidden"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              data-cursor="hover"
            >
              {/* Color slide */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    className={`absolute inset-0 ${s.accent}`}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10 grid grid-cols-12 gap-6 items-center">
                <span
                  className={`col-span-2 md:col-span-1 font-mono text-sm transition-colors ${
                    hovered === i ? "text-ink" : "text-cream/50"
                  }`}
                >
                  {s.n}
                </span>
                <h3
                  className={`col-span-10 md:col-span-4 font-display text-3xl md:text-5xl transition-colors ${
                    hovered === i ? "text-ink" : "text-cream"
                  }`}
                >
                  {s.title}
                </h3>
                <p
                  className={`col-span-12 md:col-span-5 text-base md:text-lg leading-relaxed transition-colors ${
                    hovered === i ? "text-ink/80" : "text-cream/70"
                  }`}
                >
                  {s.desc}
                </p>
                <div className="col-span-12 md:col-span-2 flex flex-wrap gap-2 justify-start md:justify-end">
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border transition-colors ${
                        hovered === i
                          ? "border-ink/40 text-ink"
                          : "border-cream/30 text-cream/70"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
