"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Footer() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setTime(formatter.format(d));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="relative border-t border-cream/15 px-6 md:px-12 pt-16 pb-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="font-display text-[20vw] md:text-[14vw] leading-none italic select-none gradient-text"
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          linhtran.
        </motion.div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-cream/60">
          <div>
            <div className="text-xs uppercase tracking-widest text-cream/40 mb-2">
              Local time
            </div>
            <div className="font-mono text-cream">{time || "--:--:--"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-cream/40 mb-2">
              Currently
            </div>
            <div className="text-cream">
              <span className="inline-block w-2 h-2 rounded-full bg-acid mr-2 animate-pulse" />
              Open for 2026
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-cream/40 mb-2">
              Studio
            </div>
            <div className="text-cream">Hà Nội ✦ Sài Gòn</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-cream/40 mb-2">
              Credits
            </div>
            <div className="text-cream/80">
              Designed & coded with care.
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-cream/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs uppercase tracking-widest text-cream/50">
          <span>© {new Date().getFullYear()} Linh Tran. All rights reserved.</span>
          <a href="#top" className="hover:text-acid transition-colors">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
