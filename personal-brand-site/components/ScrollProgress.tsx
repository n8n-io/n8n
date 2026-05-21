"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] origin-left z-50"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, #ff2d55 0%, #d4ff3a 50%, #3a5cff 100%)",
      }}
    />
  );
}
