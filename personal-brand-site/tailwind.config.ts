import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        cream: "#f5f1ea",
        electric: "#ff2d55",
        acid: "#d4ff3a",
        cobalt: "#3a5cff",
        plum: "#7a2dff",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "marquee-slow": "marquee 60s linear infinite",
        "marquee-reverse": "marquee-reverse 40s linear infinite",
        blob: "blob 12s ease-in-out infinite",
        "spin-slow": "spin 14s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.1)" },
          "66%": { transform: "translate(-30px,30px) scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
