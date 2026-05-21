"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import AnimatedText from "./AnimatedText";

const stats = [
  { value: "07", label: "Years of practice" },
  { value: "82+", label: "Brands shipped" },
  { value: "14", label: "Design awards" },
  { value: "∞", label: "Cups of cà phê sữa" },
];

export default function About() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imgY = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);

  return (
    <section
      id="about"
      ref={ref}
      className="relative py-32 px-6 md:px-12 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-cream/60 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="block w-12 h-px bg-cream/40" />
          <span>01 — About</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          {/* Visual */}
          <motion.div
            className="lg:col-span-5 relative"
            style={{ y: imgY, rotate }}
            data-cursor="view"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-gradient-to-br from-electric via-plum to-cobalt">
              {/* Stylized portrait placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="font-display text-[18rem] leading-none text-cream/90 italic"
                  initial={{ scale: 1.2, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  L
                </motion.div>
              </div>
              <motion.div
                className="absolute inset-0 mix-blend-overlay"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(212,255,58,0.4), transparent 60%)",
                }}
              />
              <motion.div
                className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-acid flex items-center justify-center text-ink font-display text-sm uppercase tracking-widest"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <path
                        id="circle"
                        d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                      />
                    </defs>
                    <text className="text-[10px] fill-ink font-bold tracking-widest">
                      <textPath href="#circle">
                        AVAILABLE · 2026 · AVAILABLE · 2026 ·{" "}
                      </textPath>
                    </text>
                  </svg>
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Text */}
          <div className="lg:col-span-7">
            <AnimatedText
              text="I design brands that move — literally and emotionally."
              className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight"
            />

            <motion.div
              className="mt-10 space-y-6 text-cream/80 text-lg leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <p>
                For the past seven years, I&apos;ve helped founders, studios and
                cultural institutions translate their ideas into identities
                that vibrate. From kinetic logos to full-stack design
                systems, every project starts with a single question:{" "}
                <em className="text-acid not-italic font-medium">
                  what makes this unforgettable?
                </em>
              </p>
              <p>
                I previously led brand at a SEA-based studio, art-directed
                campaigns for global beauty houses, and shipped products
                read by millions. Now I work independently with a small
                circle of clients I deeply believe in.
              </p>
            </motion.div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="border-t border-cream/20 pt-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                >
                  <div className="font-display text-4xl md:text-5xl">
                    {s.value}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-cream/60 mt-2">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
