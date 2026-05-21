"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown } from "lucide-react";

const heroWords = ["Bold.", "Brave.", "Boundless."];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 1.8 },
  },
};

const lineVariants = {
  hidden: { y: "110%" },
  visible: {
    y: 0,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);

  return (
    <section
      ref={ref}
      id="top"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-32 pb-12 px-6 md:px-12"
    >
      {/* Animated blobs */}
      <motion.div
        aria-hidden
        className="absolute top-1/4 -left-32 w-[40rem] h-[40rem] rounded-full bg-electric/40 blur-3xl"
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-0 right-0 w-[35rem] h-[35rem] rounded-full bg-cobalt/40 blur-3xl"
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 w-[28rem] h-[28rem] rounded-full bg-acid/30 blur-3xl"
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10"
        style={{ y, opacity, scale }}
      >
        {/* Meta row */}
        <motion.div
          className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-cream/60 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
        >
          <span>Portfolio / 2026</span>
          <span className="hidden md:inline">Hanoi → Worldwide</span>
          <span>Available for projects</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-display text-[14vw] md:text-[10vw] leading-[0.9] tracking-tight"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {heroWords.map((word, i) => (
            <span key={word} className="block overflow-hidden">
              <motion.span
                className="inline-block"
                variants={lineVariants}
              >
                {i === 1 ? (
                  <span className="italic gradient-text">{word}</span>
                ) : i === 2 ? (
                  <span className="text-stroke">{word}</span>
                ) : (
                  word
                )}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        {/* Subhead grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
          <motion.div
            className="md:col-span-5 md:col-start-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.8 }}
          >
            <p className="text-lg md:text-xl leading-relaxed text-cream/80">
              I&apos;m <span className="text-acid font-semibold">Linh Tran</span>, a creative
              director & motion designer crafting unforgettable brand
              identities for founders who refuse to be forgettable.
            </p>
          </motion.div>

          <motion.div
            className="md:col-span-3 md:col-start-9 flex flex-col items-start gap-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.8, duration: 0.8 }}
          >
            <div className="flex items-center gap-3">
              <span className="block w-12 h-px bg-cream/40" />
              <span className="text-xs uppercase tracking-widest text-cream/60">
                Currently
              </span>
            </div>
            <p className="text-cream/90">
              Building motion systems for fintech, lifestyle and culture
              brands across Southeast Asia.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.3em] text-cream/60"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2, duration: 1 }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}
