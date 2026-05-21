"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import MagneticButton from "./MagneticButton";

const links = [
  { label: "Work", href: "#portfolio" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

export default function Navigation() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(latest > prev && latest > 200);
  });

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40 px-6 md:px-12 py-6 flex items-center justify-between mix-blend-difference"
      variants={{ visible: { y: 0 }, hidden: { y: "-110%" } }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      initial={{ y: -100 }}
    >
      <motion.a
        href="#top"
        className="font-display text-2xl text-cream"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        linh<span className="text-electric">.</span>
      </motion.a>

      <nav className="hidden md:flex items-center gap-1 text-sm uppercase tracking-widest">
        {links.map((l, i) => (
          <motion.a
            key={l.href}
            href={l.href}
            className="relative px-4 py-2 text-cream group"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 + i * 0.08 }}
          >
            <span className="relative z-10">{l.label}</span>
            <span className="absolute inset-x-4 -bottom-px h-px bg-cream origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
          </motion.a>
        ))}
      </nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <MagneticButton>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-cream text-sm uppercase tracking-widest hover:bg-cream hover:text-ink transition-colors"
          >
            Let&apos;s talk
            <span className="block w-2 h-2 rounded-full bg-electric animate-pulse" />
          </a>
        </MagneticButton>
      </motion.div>
    </motion.header>
  );
}
