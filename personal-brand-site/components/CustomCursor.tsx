"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const ringX = useSpring(cursorX, { stiffness: 200, damping: 20, mass: 0.5 });
  const ringY = useSpring(cursorY, { stiffness: 200, damping: 20, mass: 0.5 });
  const [variant, setVariant] = useState<"default" | "hover" | "view">(
    "default",
  );

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cursor='view']")) setVariant("view");
      else if (target.closest("a,button,[data-cursor='hover']"))
        setVariant("hover");
      else setVariant("default");
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[60] mix-blend-difference"
        style={{ x: cursorX, y: cursorY }}
      >
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-cream"
          animate={{
            width: variant === "default" ? 8 : variant === "view" ? 72 : 24,
            height: variant === "default" ? 8 : variant === "view" ? 72 : 24,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </motion.div>
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[60] mix-blend-difference"
        style={{ x: ringX, y: ringY }}
      >
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-cream/60 flex items-center justify-center text-[10px] uppercase tracking-widest text-cream"
          animate={{
            width: variant === "view" ? 96 : 36,
            height: variant === "view" ? 96 : 36,
            opacity: variant === "default" ? 0.5 : 1,
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {variant === "view" ? "View" : ""}
        </motion.div>
      </motion.div>
    </>
  );
}
