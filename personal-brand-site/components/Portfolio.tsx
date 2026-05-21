"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import AnimatedText from "./AnimatedText";

const projects = [
  {
    title: "Maison Loa",
    year: "2025",
    cat: "Beauty / Identity",
    tagline: "Reimagining heritage fragrance for a Gen-Z audience.",
    bg: "from-electric to-plum",
    accent: "Maison",
  },
  {
    title: "Tide Finance",
    year: "2025",
    cat: "Fintech / Motion",
    tagline: "A kinetic identity that makes saving feel like winning.",
    bg: "from-cobalt to-acid",
    accent: "Tide",
  },
  {
    title: "Bãi Sau Records",
    year: "2024",
    cat: "Culture / Web",
    tagline: "Indie music label site driven by sound-reactive visuals.",
    bg: "from-plum to-electric",
    accent: "Bãi Sau",
  },
  {
    title: "Hư Vô Studio",
    year: "2024",
    cat: "Lifestyle / Direction",
    tagline: "A minimal ceramics brand with a maximalist launch film.",
    bg: "from-acid to-cobalt",
    accent: "Hư Vô",
  },
];

export default function Portfolio() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);

  return (
    <section id="portfolio" className="relative py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-cream/60 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="block w-12 h-px bg-cream/40" />
          <span>03 — Selected Work</span>
        </motion.div>

        <div className="flex items-end justify-between gap-6 mb-16 flex-wrap">
          <AnimatedText
            text="Recent obsessions."
            className="font-display text-5xl md:text-7xl leading-[1.05] max-w-4xl"
          />
          <motion.a
            href="#contact"
            className="text-sm uppercase tracking-widest text-cream/70 hover:text-acid transition-colors flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            View archive
            <span>→</span>
          </motion.a>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {projects.map((p, i) => {
            const isOffset = i % 2 === 1;
            return (
              <motion.a
                key={p.title}
                href="#"
                className={`group relative ${
                  isOffset
                    ? "md:col-span-6 md:col-start-7 md:mt-32"
                    : "md:col-span-6"
                }`}
                style={i === 0 ? { y } : undefined}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                data-cursor="view"
              >
                <div className="overflow-hidden rounded-sm">
                  <motion.div
                    className={`aspect-[4/5] bg-gradient-to-br ${p.bg} relative flex items-center justify-center`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.div
                      className="font-display text-[5rem] md:text-[7rem] italic text-cream/90 leading-none text-center px-6"
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 4 + i,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {p.accent}
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background:
                          "radial-gradient(circle at center, rgba(10,10,10,0.4), transparent 70%)",
                      }}
                    />
                  </motion.div>
                </div>

                <div className="mt-6 flex items-start justify-between gap-6">
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl">
                      {p.title}
                    </h3>
                    <p className="text-cream/60 mt-1 text-sm md:text-base">
                      {p.tagline}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs uppercase tracking-widest text-cream/50">
                      {p.cat}
                    </div>
                    <div className="font-mono text-sm text-acid mt-1">
                      {p.year}
                    </div>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
