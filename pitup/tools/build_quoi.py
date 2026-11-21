# "PitUp, concrètement c'est quoi ?" — explainer for 15-35 year olds, one scene per voice line.
import json, subprocess, sys
SP = "/tmp/claude-0/-home-user-n8n/3a1d2361-6d15-5131-aa88-7efcec5ec51a/scratchpad"
P = f"{SP}/hf/videos/pitup-quoi"; V = f"{SP}/audio/v8"
LINES = ["pq_0", "pq_1", "pq_2", "pqc_0", "fx_0", "pq_4", "pq_5", "pq_6", "fz_0"]

def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
def speech_span(f):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-af", "silencedetect=n=-40dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(l.split("silence_start: ")[1]) for l in out.splitlines() if "silence_start" in l]
    en = [float(l.split("silence_end: ")[1].split(" ")[0]) for l in out.splitlines() if "silence_end" in l]
    d = dur(f); a = en[0] if en and st and st[0] < 0.05 else 0.0
    z = st[-1] if st and st[-1] > d - 1.5 and (not en or st[-1] > en[-1]) else d
    return a, z

vo, T, t = [], [], 0.3
for k, f in enumerate(LINES):
    a, z = speech_span(f"{V}/{f}.wav"); vo.append((f, t + 0.15, a)); T.append((round(t, 3), round(z - a, 3)))
    t = t + 0.15 + (z - a) + 0.45
last_t, last_d = T[-1]
END = round(last_t + 0.15 + last_d * 0.47, 3)        # end card lands on "Rendez-vous sur l'appli…"
DUR = round(last_t + 0.15 + last_d + 3.6, 3)
json.dump({"vo": vo, "dur": DUR}, open(f"{P}/timing.json", "w"), indent=1)

tpl = open(f"{SP}/hf/videos/pitup-tendance5/index.html").read()
css = tpl[tpl.index("<style>") + 7: tpl.index("</style>")]
end_html = tpl[tpl.index('          <div id="end">'): tpl.index('        <div id="anchor">')]
end_html = end_html[: end_html.rindex("</div>")]

I = {  # Lucide-style stroke icons
 "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 "cart": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
 "truck": '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
 "cash": '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
 "store": '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
 "eye": '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
 "phone": '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
 "laptop": '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
 "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 "pin": '<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
}
def ico(n, size, color, sw=1.8):
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{I[n]}</svg>'
def head(l1, l2, ink="#17120d", acc="#1f88c9", top=250, size=96):
    return f'<div class="hd" style="top:{top}px;color:{ink};font-size:{size}px"><span>{l1}</span><b style="color:{acc}">{l2}</b></div>'
def steps(items, ink, card="#ffffff", sid=""):
    return "".join(f'<div class="st" id="{sid}st{k}" style="top:{760 + k * 250}px"><div class="ic" style="background:{card}">{ico(n, 92, "#1f88c9")}</div><div class="lb" style="color:{ink}">{txt}</div></div>' for k, (n, txt) in enumerate(items))

PRODS = ["sandale", "coach_rose", "samba", "kayali", "tn", "longchamp", "rayban", "robe_jean"]
floats = "".join(f'<div class="fl" id="fl{k}"><img src="assets/prod/{p}.png" alt=""></div>' for k, p in enumerate(PRODS))
pins = [(170, 900), (820, 820), (520, 1180), (230, 1420), (860, 1500)]
pin_html = "".join(f'<div class="pin" id="pin{k}" style="left:{x - 60}px;top:{y - 120}px">{ico("pin", 120, "#5fb6ee", 1.6)}</div>' for k, (x, y) in enumerate(pins))
path_d = "M" + " L".join(f"{x},{y}" for x, y in pins)
shops = "".join(f'<div class="shop" id="shop{k}" style="left:{70 + k * 330}px"><div class="sp"><img src="assets/prod/{p}.png" alt=""></div>{ico("store", 230, "#17120d", 1.4)}</div>' for k, p in enumerate(["kayali", "coach", "samba"]))
SW, SC = 520, 520 / 591
slabs = "".join(f'<div class="slab{" back" if k == 20 else ""}" style="transform:translateZ(-{k}px)"></div>' for k in range(20, 0, -1))

html = f'''<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>{css}
      .sc {{ position: absolute; inset: 0; opacity: 0; overflow: hidden; }}
      .hd {{ position: absolute; left: 76px; right: 76px; font-weight: 800; letter-spacing: -3px; line-height: 1.02; z-index: 5; }}
      .hd span, .hd b {{ display: block; }}
      .tag {{ position: absolute; left: 76px; top: 330px; font-weight: 800; font-size: 36px; letter-spacing: 3px; color: #1f88c9; }}
      .sub {{ position: absolute; left: 76px; right: 76px; font-weight: 600; font-size: 46px; line-height: 1.2; letter-spacing: -1px; }}
      .giant {{ position: absolute; left: 0; right: 0; text-align: center; font-weight: 800; white-space: nowrap; letter-spacing: -8px; }}
      .fl {{ position: absolute; width: 300px; height: 300px; }}
      .fl img, .sp img {{ width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 24px 22px rgba(0,0,0,.25)); }}
      .pin {{ position: absolute; opacity: 0; }}
      .shop {{ position: absolute; top: 980px; width: 280px; display: flex; flex-direction: column; align-items: center; }}
      .shop .sp {{ width: 200px; height: 200px; margin-bottom: -20px; }}
      .st {{ position: absolute; left: 76px; right: 76px; height: 200px; display: flex; align-items: center; gap: 44px; opacity: 0; }}
      .st .ic {{ width: 190px; height: 190px; border-radius: 52px; display: flex; align-items: center; justify-content: center; box-shadow: 0 24px 40px rgba(0,0,0,.10); flex: none; }}
      .st .lb {{ font-weight: 800; font-size: 64px; letter-spacing: -2px; line-height: 1.02; }}
      #stage {{ position: absolute; inset: 0; perspective: 2600px; perspective-origin: 50% 60%; }}
      #phone {{ position: absolute; left: {(1080 - SW - 32) / 2}px; top: 720px; width: {SW + 32}px; height: {1280 * SC + 32:.0f}px; transform-style: preserve-3d; }}
      .slab {{ position: absolute; inset: 0; border-radius: 76px; background: linear-gradient(90deg, #5d6167, #c9cdd2 18%, #8b9096 50%, #d7dade 82%, #5a5e63); }}
      .slab.back {{ background: #1b1c20; }}
      #front {{ position: absolute; inset: 0; border-radius: 76px; background: #0b0c0f; padding: 16px; box-sizing: border-box; box-shadow: inset 0 0 0 3px #2b2d32, 0 0 0 2px #a9adb3; }}
      #screen {{ position: relative; width: {SW}px; height: {1280 * SC:.0f}px; border-radius: 60px; overflow: hidden; background: #fff; }}
      #screen img {{ position: absolute; left: {-64 * SC:.1f}px; top: 0; width: {720 * SC:.1f}px; height: {1280 * SC:.1f}px; }}
      #island {{ position: absolute; left: 50%; top: 20px; width: 140px; height: 40px; margin-left: -70px; border-radius: 20px; background: #050506; z-index: 3; }}
      #glare {{ position: absolute; inset: 0; z-index: 2; background: linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.18) 47%, rgba(255,255,255,0) 58%); background-size: 260% 100%; background-position: 100% 0; }}
      #big100 {{ position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-weight: 800; font-size: 420px; letter-spacing: -20px; color: #5fb6ee; }}
      .dev {{ position: absolute; top: 820px; width: 420px; display: flex; flex-direction: column; align-items: center; gap: 30px; opacity: 0; }}
      .dev .lb {{ font-weight: 800; font-size: 64px; letter-spacing: -2px; color: #17120d; }}
      #anchor {{ z-index: 45; }}
      #flag {{ position: absolute; left: 140px; top: 720px; width: 800px; height: 600px; border-radius: 40px; overflow: hidden; box-shadow: 0 40px 70px rgba(0,0,0,.25); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR:.3f}" data-width="1080" data-height="1920">
      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="{DUR:.3f}" data-track-index="11"></audio>
      <div id="scene" class="clip layer" data-start="0" data-duration="{DUR:.3f}" data-track-index="0">
        <div id="cam">
          <div class="sc" id="s0" style="background:#EFE6D8"><div class="giant" style="top:1560px;font-size:190px;color:#E3D6C2">LUBUMBASHI</div>{head("À Lubumbashi,", "tout existe.")}{floats}</div>
          <div class="sc" id="s1" style="background:#0D0F13">{head("Mais il faut", "savoir où.", "#ffffff", "#5fb6ee")}
            <svg id="route" width="1080" height="1920" style="position:absolute;inset:0"><path d="{path_d}" fill="none" stroke="#5fb6ee" stroke-width="6" stroke-dasharray="18 18" stroke-linecap="round" opacity=".7"/></svg>{pin_html}
            <div id="clk" style="position:absolute;left:800px;top:1660px">{ico("clock", 150, "#ffffff", 1.4)}</div>
            <div class="sub" style="top:1690px;color:#c9ccd2;right:300px">Le tour des boutiques… sans être sûr de trouver.</div></div>
          <div class="sc" id="s2" style="background:#D9CCB6">{head("Des boutiques", "pleines de belles choses…", top=250, size=84)}{shops}
            <div id="dim" style="position:absolute;inset:0;background:rgba(23,18,13,.55);opacity:0"></div>
            <div class="sub" id="few" style="top:1500px;color:#fff;text-align:center;font-size:62px;font-weight:800;opacity:0">…que trop peu de gens voient.</div></div>
          <div class="sc" id="s3" style="background:#1F88C9"><img src="assets/icon_white.png" alt="" style="position:absolute;left:76px;top:150px;width:110px">{head("Toute la ville,", "dans ton téléphone.", "#ffffff", "#bfe3f8", 300, 92)}
            <div id="stage"><div id="phone">{slabs}<div id="front"><div id="screen"><div id="island"></div><div id="glare"></div><img src="assets/marche.jpg" alt=""></div></div></div></div></div>
          <div class="sc" id="s4" style="background:#F6D9E2"><div class="tag">TU ACHÈTES ?</div>{head("C'est simple.", "", top=390)}{steps([("search", "Tu trouves."), ("cart", "Tu commandes."), ("truck", "On te livre."), ("cash", "Tu paies à la livraison.")], "#3a1020", sid="a")}</div>
          <div class="sc" id="s5" style="background:#DCEBF5"><div class="tag">TU VENDS ?</div>{head("On t'ouvre", "toute la ville.", top=390)}{steps([("store", "Ta boutique en ligne."), ("eye", "Visible par toute la ville."), ("truck", "La livraison ? On s'en occupe.")], "#17120d", sid="b")}</div>
          <div class="sc" id="s6" style="background:#0D0F13"><div id="big100">+<span id="num">0</span></div><div class="sub" style="top:1180px;text-align:center;color:#fff;font-size:70px;font-weight:800">boutiques nous font<br>déjà confiance.</div></div>
          <div class="sc" id="s7" style="background:#EFE6D8">{head("Un téléphone", "suffit.")}
            <div class="dev" id="d0" style="left:90px">{ico("phone", 300, "#1f88c9", 1.3)}<div class="lb">L'appli</div></div>
            <div class="dev" id="d1" style="left:570px">{ico("laptop", 300, "#1f88c9", 1.3)}<div class="lb">Le site</div></div></div>
          <div class="sc" id="s8" style="background:#F4F1EA">{head("Fièrement", "congolaise.", top=300, size=110)}
            <div id="flag"><svg viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="#007FFF"/>
              <polygon id="fy" points="0,510 680,0 800,0 800,90 120,600 0,600" fill="#F7D618"/><polygon id="fr" points="0,555 740,0 800,0 800,45 60,600 0,600" fill="#CE1021"/>
              <polygon id="star" points="150,40 172,108 244,108 186,150 208,218 150,176 92,218 114,150 56,108 128,108" fill="#F7D618"/></svg></div>
            <div class="sub" style="top:1420px;color:#17120d;text-align:center;font-size:56px;font-weight:800">Une solution digitale,<br>faite au Congo.</div></div>
{end_html}
        </div>
        <div id="anchor"><img id="anchorIcon" src="assets/icon.png" alt="" /><span id="anchorTxt">PitUp · Lubumbashi</span></div>
        <div id="flash"></div>
        <div id="vignette"></div>
        <div id="grain"></div>
      </div>
    </div>
    <script>
      // one scene per sentence of the égérie; every scene enters softly
      const T = {json.dumps(T)}, END = {END}, DUR = {DUR};
      const tl = gsap.timeline({{ paused: true }});
      const nextT = (i) => (i + 1 < T.length ? T[i + 1][0] : END);
      const ink = (c, at) => {{ tl.set("#anchorTxt", {{ color: c }}, at); tl.set("#anchorIcon", {{ attr: {{ src: c === "#ffffff" ? "assets/icon_white.png" : "assets/icon.png" }} }}, at); }};
      T.forEach(([t], i) => {{
        if (i === T.length) return;
        tl.set("#s" + i, {{ opacity: 1, zIndex: 2 + i }}, t);
        tl.fromTo("#s" + i + " .hd", {{ yPercent: 30, opacity: 0 }}, {{ yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out" }}, t + 0.05);
        if (i > 0) tl.fromTo("#s" + i, {{ clipPath: "circle(0% at 50% 50%)" }}, {{ clipPath: "circle(150% at 50% 50%)", duration: 0.55, ease: "power2.inOut" }}, t);
      }});
      ["#3a1020", "#ffffff", "#17120d", "#ffffff", "#3a1020", "#17120d", "#ffffff", "#17120d", "#17120d"].forEach((c, i) => ink(c, T[i][0]));
      // s0: products float in around the city name
      const FP = [[60, 760, -8], [400, 700, 5], [730, 760, -4], [90, 1110, 6], [420, 1060, -5], [740, 1110, 7], [230, 1400, -3], [590, 1400, 4]];
      FP.forEach(([x, y, r], k) => {{
        gsap.set("#fl" + k, {{ left: x, top: y, rotation: r }});
        tl.fromTo("#fl" + k, {{ y: 260, opacity: 0, scale: 0.6 }}, {{ y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.5)" }}, T[0][0] + 0.2 + k * 0.12);
        tl.to("#fl" + k, {{ y: -26, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: 3 }}, T[0][0] + 1.2 + k * 0.05);
      }});
      tl.fromTo("#s0 .giant", {{ x: 60 }}, {{ x: -60, duration: nextT(0) - T[0][0], ease: "none" }}, T[0][0]);
      // s1: pins pop one after another, the route draws between them, the clock turns
      const s1 = T[1][0], s1d = nextT(1) - s1;
      for (let k = 0; k < 5; k++) tl.fromTo("#pin" + k, {{ y: -60, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" }}, s1 + 0.3 + k * (s1d - 1) / 5);
      tl.fromTo("#route path", {{ strokeDashoffset: 2400, strokeDasharray: "2400 2400" }}, {{ strokeDashoffset: 0, duration: s1d - 0.6, ease: "none" }}, s1 + 0.3);
      tl.fromTo("#clk", {{ rotation: 0 }}, {{ rotation: 360, duration: s1d, ease: "none" }}, s1);
      // s2: three shops fill with products, then the light dims
      const s2 = T[2][0], s2d = nextT(2) - s2;
      for (let k = 0; k < 3; k++) tl.fromTo("#shop" + k, {{ y: 120, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }}, s2 + 0.2 + k * 0.15);
      tl.to("#dim", {{ opacity: 1, duration: 0.5 }}, s2 + s2d * 0.55);
      tl.to("#s2 .hd span", {{ color: "#ffffff", duration: 0.5 }}, s2 + s2d * 0.55);
      tl.to("#s2 .hd b", {{ color: "#8fd0f7", duration: 0.5 }}, s2 + s2d * 0.55);
      tl.fromTo("#few", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, s2 + s2d * 0.58);
      // s3: the phone turns in, glare slides
      const s3 = T[3][0], s3d = nextT(3) - s3;
      tl.fromTo("#phone", {{ y: 900, rotationY: -70, rotationX: 12 }}, {{ y: 0, rotationY: -16, rotationX: 6, duration: 1.2, ease: "power3.out" }}, s3);
      tl.to("#phone", {{ rotationY: 14, duration: s3d - 1.2, ease: "sine.inOut" }}, s3 + 1.2);
      tl.fromTo("#glare", {{ backgroundPositionX: "100%" }}, {{ backgroundPositionX: "0%", duration: s3d, ease: "sine.inOut" }}, s3);
      // s4, s5: steps light up across the sentence
      [[4, 4, "a"], [5, 3, "b"]].forEach(([s, n, p]) => {{
        const t0 = T[s][0], d = nextT(s) - t0;
        for (let k = 0; k < n; k++) tl.fromTo(`#${{p}}st${{k}}`, {{ x: -80, opacity: 0 }}, {{ x: 0, opacity: 1, duration: 0.45, ease: "power3.out" }}, t0 + 0.35 + k * (d - 0.9) / n);
      }});
      // s6: count to 100
      const s6 = T[6][0];
      const cnt = {{ v: 0 }};
      tl.fromTo(cnt, {{ v: 0 }}, {{ v: 100, duration: 1.6, ease: "power2.out", onUpdate: () => (document.getElementById("num").textContent = Math.round(cnt.v)) }}, s6 + 0.1);
      tl.fromTo("#big100", {{ scale: 0.8 }}, {{ scale: 1, duration: 1.6, ease: "power2.out" }}, s6 + 0.1);
      // s7: two devices
      tl.fromTo("#d0", {{ y: 80, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }}, T[7][0] + 0.4);
      tl.fromTo("#d1", {{ y: 80, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }}, T[7][0] + 0.9);
      // s8: the flag builds: sky blue, stripe, star
      const s8 = T[8][0];
      tl.fromTo("#flag", {{ scale: 0.7, opacity: 0, rotation: -4 }}, {{ scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: "back.out(1.5)" }}, s8 + 0.1);
      tl.fromTo(["#fy", "#fr"], {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4, stagger: 0.1 }}, s8 + 0.5);
      tl.fromTo("#star", {{ scale: 0, rotation: -90, transformOrigin: "150px 130px" }}, {{ scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }}, s8 + 0.8);
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
      tl.fromTo("#stores .bdg", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: "back.out(1.6)" }}, END + 1.4);
      for (let f = 0; f < DUR * 12; f++) {{ const ox = ((f * 137) % 512) - 256, oy = ((f * 251) % 512) - 256; tl.set("#grain", {{ x: ox / 8, y: oy / 8 }}, f / 12); }}
      tl.set({{}}, {{}}, DUR);
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
'''
open(f"{P}/index.html", "w").write(html)
print(json.dumps({"scenes": T, "end": END, "dur": DUR}))
