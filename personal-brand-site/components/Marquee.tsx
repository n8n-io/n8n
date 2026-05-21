"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const items = [
  "Brand Identity",
  "Motion Design",
  "Art Direction",
  "Creative Strategy",
  "Web Experience",
  "Editorial",
];

export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(scrollYProgress, [0, 1], ["10%", "-25%"]);
  const xReverse = useTransform(scrollYProgress, [0, 1], ["-10%", "5%"]);

  return (
    <div ref={ref} className="relative py-12 md:py-20 border-y border-cream/10 overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap gap-12 text-[8vw] md:text-[6vw] leading-none font-display"
        style={{ x }}
      >
        {[...items, ...items, ...items].map((it, i) => (
          <span key={`${it}-${i}`} className="flex items-center gap-12">
            <span
              className={
                i % 2 === 0 ? "text-cream" : "text-stroke text-cream italic"
              }
            >
              {it}
            </span>
            <span className="text-electric">✦</span>
          </span>
        ))}
      </motion.div>

      <motion.div
        className="flex whitespace-nowrap gap-12 text-[5vw] md:text-[3vw] leading-none font-display mt-6 text-cream/40"
        style={{ x: xReverse }}
      >
        {[...items, ...items, ...items].reverse().map((it, i) => (
          <span key={`r-${it}-${i}`} className="flex items-center gap-12">
            <span className="italic">{it}</span>
            <span className="text-acid">●</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
