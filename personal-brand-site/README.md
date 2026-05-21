# Personal Brand Website — Motion Edition

Bold, creative personal brand website built with Next.js 14, Framer Motion, and Tailwind CSS. Designed to feel like a kinetic poster — heavy typography, animated gradients, magnetic interactions, and a custom cursor.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Framer Motion** for all motion
- **Tailwind CSS** for styling
- **Lucide** for icons

## Sections

1. **Hero** — animated headline reveal, parallax blobs, scroll-driven fade
2. **Marquee** — scroll-coupled bi-directional ticker
3. **About** — split layout with rotating "Available" badge and animated stats
4. **Services** — interactive list with color-slide hover reveal
5. **Portfolio** — offset grid with parallax cards and "View" cursor
6. **Contact** — magnetic email CTA, conic-gradient halo, socials
7. **Footer** — live local time, big gradient wordmark

## Motion features

- Custom mix-blend cursor with `default`, `hover`, and `view` states
- Page-load curtain transition with column reveal
- Scroll progress bar at top
- Magnetic buttons (CTA + email)
- Scroll-linked parallax (hero, portfolio cards, marquee, about image)
- Animated radial blobs and conic gradient halo
- Text reveal animations (line-mask + word-stagger)
- Scroll-driven nav hide/show

## Getting started (local)

```bash
cd personal-brand-site
npm install        # or pnpm install / yarn
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel (phone-friendly)

This folder ships with a `vercel.json` that pre-configures framework, build & install commands, and security headers — so you only need to do one thing on first import.

1. On your phone, open **vercel.com/new** and sign in with GitHub.
2. Import the repo `nhinhtt/n8n`.
3. On the configuration screen:
   - **Root Directory** → click **Edit** and select `personal-brand-site` _(this is the only manual step)_
   - **Branch** → `claude/personal-brand-motion-website-zSyiL`
   - Everything else (framework, build command, install command) is read from `vercel.json` automatically.
4. Hit **Deploy**. ~60 seconds later you get a URL like `personal-brand-site-xxx.vercel.app`.

After that first import, **every push to the branch auto-builds and gives you a fresh preview URL** — perfect for iterating from a phone.

## Customize

- Replace placeholder name/bio in `components/Hero.tsx`, `About.tsx`, `Contact.tsx`, `Footer.tsx`.
- Swap project cards in `components/Portfolio.tsx`.
- Tweak palette in `tailwind.config.ts` (`electric`, `acid`, `cobalt`, `plum`).
- Replace the big "L" portrait placeholder with a real image in `About.tsx`.

## Notes

- Custom cursor is automatically hidden on touch devices.
- All animations respect `viewport={{ once: true }}` to avoid jank on re-scroll.
- Color palette is deliberately bold — designed to be remembered, not blended in.
