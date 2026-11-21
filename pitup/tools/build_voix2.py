# Builds the voiced P1 product video: one shot per voice line, cut on the beat grid of the music.
import json, subprocess, sys

SP = "/tmp/claude-0/-home-user-n8n/3a1d2361-6d15-5131-aa88-7efcec5ec51a/scratchpad"
CFG = json.load(open(sys.argv[1]))      # per-video config: project, voice prefix, tempo, shots, intro
P = f"{SP}/hf/videos/{CFG['project']}"
V = f"{SP}/audio/v8"
B = 60 / CFG["bpm"]

def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)

def speech_span(f):
    # trim VoxCPM's leading/trailing near-silence so shots follow the words, not the padding
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-af", "silencedetect=n=-40dB:d=0.12", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(l.split("silence_start: ")[1]) for l in out.splitlines() if "silence_start" in l]
    ends = [float(l.split("silence_end: ")[1].split(" ")[0]) for l in out.splitlines() if "silence_end" in l]
    d = dur(f)
    a = ends[0] if ends and starts and starts[0] < 0.05 else 0.0
    z = starts[-1] if starts and starts[-1] > d - 1.5 and (not ends or starts[-1] > ends[-1]) else d
    return a, z

# shot list: (product file, voice clip, headline, giant word, bg, tone, ink, giant size)
CREAM, BLUE, SAND, INK, ROSE = ("#EFE6D8", "#E3D6C2", "#17120d"), ("#1F88C9", "#2793D4", "#ffffff"), \
    ("#D9CCB6", "#CDBEA5", "#17120d"), ("#0D0F13", "#171B22", "#ffffff"), ("#F6D9E2", "#EEC8D4", "#3a1020")
PAL = {"CREAM": CREAM, "BLUE": BLUE, "SAND": SAND, "INK": INK, "ROSE": ROSE}
SHOTS = [(f, v, h, w, PAL[c], z) for f, v, h, w, c, z in CFG["shots"]]

snap = lambda t: round(t / B) * B
# intro
t = 0.0
vo = []                                   # (file, start, trim_a)
a, z = speech_span(f"{V}/{CFG['intro_vo']}.wav")
vo.append((CFG["intro_vo"], 0.25, a))
intro_end = snap(0.25 + (z - a) + CFG.get('gap', 0.45))
t = intro_end
shot_t = []
for (pf, vf, *_rest) in SHOTS:
    a, z = speech_span(f"{V}/{vf}.wav")
    vo.append((vf, t + 0.18, a))
    shot_t.append(t)
    t = snap(t + 0.18 + (z - a) + CFG.get('gap', 0.35))   # gap = room for the music between lines
    if t - shot_t[-1] < 4 * B: t = shot_t[-1] + 4 * B
recap_t = t
a, z = speech_span(f"{V}/{CFG['outro_vo']}.wav")
vo.append((CFG["outro_vo"], recap_t + 0.3, a))
outro_speech = (recap_t + 0.3, recap_t + 0.3 + (z - a))
end_t = snap(recap_t + 4 * B)            # end card while the URL is spelled
DUR = max(outro_speech[1] + 3.6, end_t + 6.0)   # a few seconds of full music after she stops
json.dump({"vo": vo, "shot_t": shot_t, "intro_end": intro_end, "recap_t": recap_t, "end_t": end_t, "dur": DUR,
           "outro": outro_speech}, open(f"{P}/timing.json", "w"), indent=1)

tpl = open(f"{SP}/hf/videos/pitup-tendance5/index.html").read()
css = tpl[tpl.index("<style>") + 7: tpl.index("</style>")]
end_html = tpl[tpl.index('          <div id="end">'): tpl.index('        <div id="anchor">')]
end_html = end_html[: end_html.rindex("</div>")]  # drop the closing tag of #cam
end_html = end_html.replace('<div id="cta">pi-tup.com</div>',
    '<div id="cta">' + "".join(f'<span class="ch" id="ch{i}">{c}</span>' for i, c in enumerate("pi-tup.com")) + "</div>")

shots_js = json.dumps([dict(f=s[0], head=s[2], word=s[3], bg=s[4][0], tone=s[4][1], ink=s[4][2], size=s[5]) for s in SHOTS])
html = f'''<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>{css}
      #intro {{ position: absolute; inset: 0; background: #F6D9E2; }}
      #intro .giant {{ position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-weight: 800; font-size: 150px; letter-spacing: -6px; color: #EEC8D4; white-space: nowrap; }}
      #introT {{ position: absolute; left: 76px; top: 300px; font-weight: 800; font-size: 104px; letter-spacing: -3px; line-height: 1.02; color: #3a1020; white-space: nowrap; }}
      #introT b {{ color: #1f88c9; }}
      #intro .mini {{ position: absolute; width: 300px; height: 300px; }}
      #intro .mini img, .shot .prod img {{ width: 100%; height: 100%; object-fit: contain; }}
      #recap {{ position: absolute; inset: 0; opacity: 0; background: #0D0F13; }}
      #recapT {{ position: absolute; left: 76px; top: 300px; font-weight: 800; font-size: 96px; letter-spacing: -3px; line-height: 1.04; color: #fff; white-space: nowrap; }}
      #recapT b {{ color: #5fb6ee; }}
      #recap .mini {{ position: absolute; width: 270px; height: 270px; display: flex; align-items: center; justify-content: center; }}
      #recap .mini img {{ width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 20px 18px rgba(0,0,0,.5)); }}
      #cta .ch {{ display: inline-block; }}
      {CFG.get('extra_css', '')}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR:.3f}" data-width="1080" data-height="1920">
      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="{DUR:.3f}" data-track-index="11"></audio>
      <div id="scene" class="clip layer" data-start="0" data-duration="{DUR:.3f}" data-track-index="0">
        <div id="cam">
          <div id="intro"><div class="giant">{CFG["intro_word"]}</div><div id="introT"><span style="display:block">{CFG["intro_l1"]}</span><b style="display:block">{CFG["intro_l2"]}</b></div></div>
          <div id="shots"></div>
          <div id="recap"><div id="recapT"><span style="display:block">{CFG.get("recap_l1", "Tout ça,")}</span><b style="display:block">{CFG.get("recap_l2", "sur PitUp.")}</b></div></div>
{end_html}
        </div>
        <div id="anchor"><img id="anchorIcon" src="assets/icon.png" alt="" /><span id="anchorTxt">PitUp · Lubumbashi</span></div>
        <div id="flash"></div>
        <div id="vignette"></div>
        <div id="grain"></div>
      </div>
    </div>
    <script>
      // shots follow the ambassador's voice lines; every cut sits on the 130 BPM grid of the chosen song
      const P = {shots_js};
      const ST = {json.dumps([round(x, 3) for x in shot_t])};
      const INTRO_END = {intro_end:.3f}, RECAP = {recap_t:.3f}, END = {end_t:.3f}, DUR = {DUR:.3f};
      const tl = gsap.timeline({{ paused: true }});
      const shots = document.getElementById("shots");
      P.forEach((p, i) => {{
        const d = document.createElement("div"); d.className = "shot"; d.id = "shot" + i;
        d.innerHTML = `<div class="bg" style="background:${{p.bg}}"></div><div class="giant" style="font-size:${{p.size}}px;color:${{p.tone}}">${{p.word}}</div>` +
          `<div class="prod"><img src="assets/prod/${{p.f}}.png" alt=""></div><div class="head" style="color:${{p.ink}}">${{p.head}}</div>`;
        shots.appendChild(d);
      }});
      const ink = (c) => {{ tl.set("#anchorTxt", {{ color: c }}, 0); }};
      const setInk = (c, at) => {{ tl.set("#anchorTxt", {{ color: c }}, at); tl.set("#anchorIcon", {{ attr: {{ src: c === "#ffffff" ? "assets/icon_white.png" : "assets/icon.png" }} }}, at); }};

      // intro: three products drop in around the title
      const im = document.getElementById("intro");
      {json.dumps(CFG["intro_minis"])}.forEach(([f, x, y, r], i) => {{
        const m = document.createElement("div"); m.className = "mini"; m.id = "im" + i; m.innerHTML = `<img src="assets/prod/${{f}}.png" alt="">`; im.appendChild(m);
        gsap.set(m, {{ left: x, top: y, rotation: r }});
        tl.fromTo(m, {{ y: 300, opacity: 0, scale: 0.6 }}, {{ y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" }}, 0.35 + i * 0.12);
      }});
      setInk("#3a1020", 0);
      tl.fromTo("#introT", {{ yPercent: 30, opacity: 0 }}, {{ yPercent: 0, opacity: 1, duration: 0.4, ease: "power3.out" }}, 0.1);
      tl.fromTo("#intro .giant", {{ x: 40 }}, {{ x: -40, duration: INTRO_END, ease: "none" }}, 0);
      tl.set("#intro", {{ opacity: 0 }}, INTRO_END);

      // product shots: hard cut, product settles, headline rises, light sweep, giant word drifts
      P.forEach((p, i) => {{
        const el = "#shot" + i, at = ST[i], next = i + 1 < P.length ? ST[i + 1] : RECAP, span = next - at;
        tl.set(el, {{ opacity: 1, zIndex: 10 + i }}, at); tl.set(el, {{ opacity: 0 }}, next);
        setInk(p.ink, at);
        tl.fromTo(el + " .prod", {{ scale: 1.06, y: 26 }}, {{ scale: 1, y: 0, duration: 0.4, ease: "power3.out" }}, at);
        tl.fromTo(el + " .prod img", {{ scale: 1 }}, {{ scale: 1.04, duration: span, ease: "none" }}, at);
        tl.fromTo(el + " .giant", {{ x: 30 }}, {{ x: -30, duration: span, ease: "none" }}, at);
        tl.fromTo(el + " .head", {{ yPercent: 40, opacity: 0 }}, {{ yPercent: 0, opacity: 1, duration: 0.25, ease: "power2.out" }}, at + 0.05);
        tl.fromTo(el + " .sweep", {{ backgroundPositionX: "100%" }}, {{ backgroundPositionX: "0%", duration: Math.min(0.8, span), ease: "power1.inOut" }}, at + 0.1);
      }});

      // recap: every item pops into a grid while "Commande sur l'appli…" plays
      const rc = document.getElementById("recap");
      P.forEach((p, i) => {{
        const m = document.createElement("div"); m.className = "mini"; m.id = "rm" + i; m.innerHTML = `<img src="assets/prod/${{p.f}}.png" alt="">`; rc.appendChild(m);
        const r = Math.floor(i / 3), c = i % 3, n = Math.min(3, P.length - r * 3), ox = (1080 - n * 300) / 2;
        gsap.set(m, {{ left: ox + c * 300 + 15, top: 560 + r * 300 }});
        tl.fromTo(m, {{ scale: 0.4, opacity: 0, rotation: i % 2 ? 8 : -8 }}, {{ scale: 1, opacity: 1, rotation: 0, duration: 0.36, ease: "back.out(1.8)" }}, RECAP + 0.15 + i * 0.07);
      }});
      tl.set("#recap", {{ opacity: 1, zIndex: 40 }}, RECAP);
      setInk("#ffffff", RECAP);
      tl.fromTo("#recapT", {{ yPercent: 30, opacity: 0 }}, {{ yPercent: 0, opacity: 1, duration: 0.35, ease: "power3.out" }}, RECAP);
      tl.set("#recap", {{ opacity: 0 }}, END + 0.05);

      // end card
      tl.set("#flash", {{ opacity: 1 }}, END); tl.set("#flash", {{ opacity: 0 }}, END + 1 / 30);
      tl.set("#end", {{ opacity: 1, zIndex: 43 }}, END);
      tl.set("#anchor", {{ opacity: 0 }}, END);
      tl.fromTo("#icon", {{ scale: 1.15, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.32, ease: "expo.out" }}, END);
      tl.fromTo("#ring", {{ scale: 0.7, opacity: 0.9 }}, {{ scale: 1.5, opacity: 0, duration: 0.7, ease: "power2.out" }}, END + 0.05);
      tl.fromTo("#word", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, END + 0.4);
      tl.fromTo("#tag", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, END + 0.7);
      tl.fromTo("#count", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }}, END + 1.0);
      tl.fromTo("#cta", {{ scale: 0.7, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.42, ease: "back.out(2)" }}, END + 0.2);
      LETTERS.forEach(([k, at]) => tl.fromTo("#ch" + k, {{ scale: 1, color: "#1f88c9" }}, {{ scale: 1.45, color: "#d6332a", duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }}, at));
      tl.fromTo("#stores .bdg", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: "back.out(1.6)" }}, END + 1.4);

      tl.fromTo("#cam", {{ x: 0, y: 0, rotation: 0 }}, {{ x: 6, y: -5, rotation: 0.25, duration: 2.1, ease: "sine.inOut", yoyo: true, repeat: Math.ceil(DUR / 2.1) }}, 0);
      for (let f = 0; f < DUR * 12; f++) {{ const ox = ((f * 137) % 512) - 256, oy = ((f * 251) % 512) - 256; tl.set("#grain", {{ x: ox / 8, y: oy / 8 }}, f / 12); }}
      tl.set({{}}, {{}}, DUR);
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
'''
letters = json.load(open(f"{P}/letters.json")) if len(sys.argv) > 2 else []
html = html.replace("LETTERS.forEach", f"{json.dumps(letters)}.forEach")
open(f"{P}/index.html", "w").write(html)
print(json.dumps({"shot_t": [round(x, 2) for x in shot_t], "recap": round(recap_t, 2), "end": round(end_t, 2), "dur": round(DUR, 2)}))
