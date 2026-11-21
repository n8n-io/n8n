# Tutorial video: the égérie explains each step while the real app recording plays inside a phone frame.
import json, subprocess, sys
SP = "/tmp/claude-0/-home-user-n8n/3a1d2361-6d15-5131-aa88-7efcec5ec51a/scratchpad"
CFG = json.load(open(sys.argv[1])); P = f"{SP}/hf/videos/{CFG['project']}"; V = f"{SP}/audio/v8"

def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
def speech_span(f):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-af", "silencedetect=n=-40dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(l.split("silence_start: ")[1]) for l in out.splitlines() if "silence_start" in l]
    en = [float(l.split("silence_end: ")[1].split(" ")[0]) for l in out.splitlines() if "silence_end" in l]
    d = dur(f); a = en[0] if en and st and st[0] < 0.05 else 0.0
    z = st[-1] if st and st[-1] > d - 1.5 and (not en or st[-1] > en[-1]) else d
    return a, z

vo, steps, t = [], [], 0.0
a, z = speech_span(f"{V}/{CFG['intro_vo']}.wav"); vo.append((CFG["intro_vo"], 0.3, a)); t = 0.3 + (z - a) + 0.5
intro_end = t
for st in CFG["steps"]:
    a, z = speech_span(f"{V}/{st['vo']}.wav"); vo.append((st["vo"], t + 0.25, a))
    segs, s0 = [], t
    for name, sa, sb, speed in st["segs"]:
        natural = (sb - sa) / speed; segs.append((name, s0, natural)); s0 += natural
    end = max(t + 0.25 + (z - a) + 0.6, s0 + 0.3)
    steps.append(dict(head=st["head"], word=st["word"], bg=st["bg"], t=round(t, 3), end=round(end, 3),
                      segs=[(n, round(s, 3), round(nat, 3)) for n, s, nat in segs], taps=st.get("taps", [])))
    t = end
END = t
a, z = speech_span(f"{V}/{CFG['outro_vo']}.wav"); vo.append((CFG["outro_vo"], END + 0.3, a))
DUR = END + 0.3 + (z - a) + 3.6
json.dump({"vo": vo, "dur": DUR, "steps": [dict(t=s["t"], end=s["end"]) for s in steps]}, open(f"{P}/timing.json", "w"), indent=1)

tpl = open(f"{SP}/hf/videos/pitup-tendance5/index.html").read()
css = tpl[tpl.index("<style>") + 7: tpl.index("</style>")]
end_html = tpl[tpl.index('          <div id="end">'): tpl.index('        <div id="anchor">')]
end_html = end_html[: end_html.rindex("</div>")]

# screen: content area of the 720x1280 recording is x 64..654 (591 px); scale it to 560 px wide
SW, SC = 560, 560 / 591
T0 = steps[0]["t"]
vids = [f'<video id="screenvid" class="clip vid" src="assets/seg/master.mp4" muted playsinline data-start="{T0:.3f}" data-duration="{END - T0:.3f}" data-track-index="2"></video>']
taps = [(s["segs"][0][1] + tt, (x - 64) * SC, y * SC) for s in steps for tt, x, y in s["taps"]]
html = f'''<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>{css}
      .stepbg {{ position: absolute; inset: 0; opacity: 0; }}
      .stepbg .giant {{ position: absolute; left: 0; right: 0; top: 1500px; text-align: center; font-weight: 800; font-size: 230px; letter-spacing: -8px; white-space: nowrap; }}
      .stepH {{ position: absolute; left: 76px; right: 76px; top: 250px; opacity: 0; z-index: 30; }}
      .stepH small {{ display: block; font-weight: 700; font-size: 34px; letter-spacing: 2px; text-transform: uppercase; color: #1f88c9; margin-bottom: 10px; }}
      .stepH b {{ display: block; font-weight: 800; font-size: 78px; letter-spacing: -2.5px; line-height: 1.02; color: #17120d; }}
      #introT {{ z-index: 30; position: absolute; left: 76px; top: 250px; font-weight: 800; font-size: 100px; letter-spacing: -3px; line-height: 1.02; color: #17120d; }}
      #introT b {{ color: #1f88c9; }}
      #anchor {{ z-index: 45; }}
      #stage {{ position: absolute; inset: 0; perspective: 2600px; perspective-origin: 50% 55%; z-index: 50; pointer-events: none; }}
      #pshadow {{ position: absolute; left: 290px; top: 1790px; width: 500px; height: 70px; border-radius: 50%; background: rgba(0,0,0,.35); filter: blur(26px); z-index: 49; }}
      #phone {{ position: absolute; left: {(1080 - SW - 36) / 2}px; top: 540px; width: {SW + 36}px; height: {1280 * SC + 36:.0f}px; transform-style: preserve-3d; }}
      .slab {{ position: absolute; inset: 0; border-radius: 84px; background: linear-gradient(90deg, #5d6167 0%, #c9cdd2 18%, #8b9096 50%, #d7dade 82%, #5a5e63 100%); }}
      .slab .btn {{ position: absolute; width: 8px; border-radius: 4px; background: linear-gradient(90deg, #8d9197, #c4c8cd); }}
      .slab.back {{ background: #1b1c20; }}
      #front {{ position: absolute; inset: 0; border-radius: 84px; background: #0b0c0f; padding: 18px; box-sizing: border-box; box-shadow: inset 0 0 0 3px #2b2d32, 0 0 0 2px #a9adb3; }}
      #screen {{ position: relative; width: {SW}px; height: {1280 * SC:.0f}px; border-radius: 66px; overflow: hidden; background: #f3f4f6; }}
      #island {{ position: absolute; left: 50%; top: 22px; width: 150px; height: 42px; margin-left: -75px; border-radius: 22px; background: #050506; z-index: 6; }}
      #glare {{ position: absolute; inset: 0; border-radius: 66px; z-index: 5; background: linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.16) 47%, rgba(255,255,255,0) 58%); background-size: 260% 100%; background-position: 100% 0; }}
      #screen .vid {{ position: absolute; left: {-64 * SC:.1f}px; top: 0; width: {720 * SC:.1f}px; height: {1280 * SC:.1f}px; }}
      .tap {{ position: absolute; width: 110px; height: 110px; margin: -55px 0 0 -55px; border-radius: 50%; border: 6px solid #1f88c9; background: rgba(31,136,201,.18); opacity: 0; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR:.3f}" data-width="1080" data-height="1920">
      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="{DUR:.3f}" data-track-index="11"></audio>
      <div id="scene" class="clip layer" data-start="0" data-duration="{DUR:.3f}" data-track-index="0">
        <div id="cam">
          <div id="introBg" class="stepbg" style="background:#EFE6D8;opacity:1"><div class="giant" style="color:#E3D6C2">BOUTIQUE</div></div>
          {"".join(f'<div id="bg{i}" class="stepbg" style="background:{s["bg"][0]}"><div class="giant" style="color:{s["bg"][1]}">{s["word"]}</div></div>' for i, s in enumerate(steps))}
          <div id="introT"><span style="display:block">{CFG["intro_l1"]}</span><b style="display:block">{CFG["intro_l2"]}</b></div>
          {"".join(f'<div id="h{i}" class="stepH"><small>Étape {i + 1}</small><b>{s["head"]}</b></div>' for i, s in enumerate(steps))}
{end_html}
        </div>
        <div id="anchor"><img id="anchorIcon" src="assets/icon.png" alt="" /><span id="anchorTxt">PitUp · Lubumbashi</span></div>
        <div id="flash"></div>
        <div id="vignette"></div>
        <div id="grain"></div>
      </div>
      <div id="pshadow"></div>
      <div id="stage"><div id="phone">
        {"".join(f'<div class="slab{" back" if k == 20 else ""}" style="transform:translateZ(-{k}px)">' + ("" if k in (1, 20) else '<i class="btn" style="left:-5px;top:300px;height:70px"></i><i class="btn" style="left:-5px;top:400px;height:120px"></i><i class="btn" style="left:-5px;top:540px;height:120px"></i><i class="btn" style="right:-5px;top:420px;height:180px"></i>') + '</div>' for k in range(20, 0, -1))}
        <div id="front"><div id="screen"><div id="island"></div><div id="glare"></div>
        <img id="still" src="assets/seg/first.jpg" alt="" style="position:absolute;left:{-64 * SC:.1f}px;top:0;width:{720 * SC:.1f}px;height:{1280 * SC:.1f}px" />
        {"".join(vids)}
        {"".join(f'<div class="tap" id="tap{k}" style="left:{x:.0f}px;top:{y:.0f}px"></div>' for k, (_, x, y) in enumerate(taps))}
      </div></div></div></div>
    </div>
    <script>
      // the égérie walks through each step; the app recording plays in the phone, cut to her words
      const S = {json.dumps(steps)}, TAPS = {json.dumps([round(t, 3) for t, _, _ in taps])};
      const INTRO_END = {intro_end:.3f}, END = {END:.3f}, DUR = {DUR:.3f};
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo("#introT", {{ yPercent: 30, opacity: 0 }}, {{ yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" }}, 0.1);
      tl.fromTo("#phone", {{ y: 900, rotationY: -75, rotationX: 14 }}, {{ y: 0, rotationY: -18, rotationX: 7, duration: 1.3, ease: "power3.out" }}, 0.2);
      tl.fromTo("#pshadow", {{ opacity: 0, scaleX: 0.5 }}, {{ opacity: 1, scaleX: 1, duration: 1.3, ease: "power3.out" }}, 0.2);
      tl.fromTo("#glare", {{ backgroundPositionX: "100%" }}, {{ backgroundPositionX: "20%", duration: 1.3, ease: "power2.out" }}, 0.2);
      tl.fromTo("#introBg .giant", {{ x: 40 }}, {{ x: -40, duration: INTRO_END, ease: "none" }}, 0);
      tl.to("#introT", {{ opacity: 0, duration: 0.2 }}, INTRO_END - 0.2);
      S.forEach((s, i) => {{
        tl.set("#bg" + i, {{ opacity: 1, zIndex: 2 + i }}, s.t);
        tl.fromTo("#bg" + i + " .giant", {{ x: 40 }}, {{ x: -40, duration: s.end - s.t, ease: "none" }}, s.t);
        tl.fromTo("#h" + i, {{ opacity: 0, yPercent: 25 }}, {{ opacity: 1, yPercent: 0, duration: 0.35, ease: "power3.out" }}, s.t + 0.05);
        tl.set("#h" + i, {{ opacity: 0 }}, s.end);
        const side = i % 2 ? -1 : 1;
        tl.to("#phone", {{ rotationY: 16 * side, rotationX: 6, duration: 1.2, ease: "sine.inOut" }}, s.t);
        tl.to("#phone", {{ rotationY: 11 * side, duration: Math.max(0.5, s.end - s.t - 1.2), ease: "sine.inOut" }}, s.t + 1.2);
        tl.fromTo("#glare", {{ backgroundPositionX: side > 0 ? "80%" : "10%" }}, {{ backgroundPositionX: side > 0 ? "10%" : "80%", duration: 1.2, ease: "sine.inOut" }}, s.t);
      }});
      TAPS.forEach((at, k) => {{
        tl.fromTo("#tap" + k, {{ scale: 0.4, opacity: 0.95 }}, {{ scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }}, at);
      }});
      tl.set("#still", {{ opacity: 0 }}, S[0].t);
      // end card
      tl.to("#phone", {{ y: 1600, rotationY: 40, duration: 0.5, ease: "power3.in" }}, END - 0.5);
      tl.to("#pshadow", {{ opacity: 0, duration: 0.4 }}, END - 0.5);
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
print(json.dumps({"steps": [(s["t"], s["end"]) for s in steps], "end": round(END, 2), "dur": round(DUR, 2)}))
