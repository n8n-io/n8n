"use client";

import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";
import { Instagram, Linkedin, Github, Mail, ArrowUpRight } from "lucide-react";

const socials = [
  { label: "Instagram", href: "#", icon: Instagram, handle: "@linh.designs" },
  { label: "LinkedIn", href: "#", icon: Linkedin, handle: "in/linhtran" },
  { label: "Behance", href: "#", icon: ArrowUpRight, handle: "be/linhtran" },
  { label: "GitHub", href: "#", icon: Github, handle: "@linhtran" },
];

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative py-32 px-6 md:px-12 overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, #ff2d55, #d4ff3a, #3a5cff, #ff2d55)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-4 text-xs uppercase tracking-[0.3em] text-cream/60 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="block w-12 h-px bg-cream/40" />
          <span>04 — Contact</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <motion.h2
              className="font-display text-6xl md:text-[10vw] leading-[0.95]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="block overflow-hidden">
                <motion.span
                  className="inline-block"
                  initial={{ y: "110%" }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  Let&apos;s build
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="inline-block italic gradient-text"
                  initial={{ y: "110%" }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.9,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  something
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="inline-block text-stroke"
                  initial={{ y: "110%" }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.9,
                    delay: 0.2,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  unforgettable.
                </motion.span>
              </span>
            </motion.h2>

            <motion.div
              className="mt-12 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <MagneticButton strength={0.5}>
                <a
                  href="mailto:hello@linhtran.studio"
                  className="group inline-flex items-center gap-4 px-8 py-5 rounded-full bg-cream text-ink text-sm uppercase tracking-widest font-medium"
                >
                  <Mail className="w-4 h-4" />
                  hello@linhtran.studio
                  <motion.span
                    className="block w-5 h-5"
                    animate={{ rotate: [0, 45, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </motion.span>
                </a>
              </MagneticButton>
            </motion.div>
          </div>

          <div className="lg:col-span-4 lg:col-start-9 flex flex-col gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-xs uppercase tracking-widest text-cream/50 mb-3">
                Based in
              </div>
              <div className="font-display text-2xl">
                Hà Nội, Việt Nam — GMT+7
              </div>
              <div className="text-cream/60 text-sm mt-2">
                Working remotely with teams across Asia, EU & US.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-xs uppercase tracking-widest text-cream/50 mb-4">
                Elsewhere
              </div>
              <div className="grid grid-cols-2 gap-3">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      className="group flex items-center gap-3 px-4 py-3 rounded-full border border-cream/20 hover:border-acid hover:text-acid transition-colors"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{s.handle}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
