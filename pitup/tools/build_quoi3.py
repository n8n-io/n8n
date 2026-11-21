# "PitUp, c'est quoi ?" v3: real visuals, app and site always shown on a 3D phone / 3D laptop (satellite, city map, partner shops, real hands and phones, the real site).
import json
SP = "/tmp/claude-0/-home-user-n8n/3a1d2361-6d15-5131-aa88-7efcec5ec51a/scratchpad"
P = f"{SP}/hf/videos/pitup-quoi2"
tm = json.load(open(f"{SP}/hf/videos/pitup-quoi/timing.json"))
T = [round(v[1] - 0.15, 3) for v in tm["vo"]]            # scene starts = voice line starts - 0.15
T[0] = 0.0
DUR = tm["dur"]
last = tm["vo"][-1]
END = 43.391                                              # end card on "Rendez-vous sur l'appli…" (from build_quoi)
S = T + [END]
tpl = open(f"{SP}/hf/videos/pitup-tendance5/index.html").read()
css = tpl[tpl.index("<style>") + 7: tpl.index("</style>")]
end_html = tpl[tpl.index('          <div id="end">'): tpl.index('        <div id="anchor">')]
end_html = end_html[: end_html.rindex("</div>")]

vids, n = [], 0
def vid(name, start, d):
    global n; n += 1
    vids.append(f'<video id="v{n}" class="clip vid" src="assets/v/{name}.mp4" muted playsinline data-start="{start:.3f}" data-duration="{d:.3f}" data-track-index="{2 + n % 2}"></video>')
def beats(i, names):
    a, b = S[i], S[i + 1]; w = (b - a) / len(names)
    for k, nm in enumerate(names):
        if nm: vid(nm, a + k * w, w)
    return [round(a + k * w, 3) for k in range(len(names))], w
vid("sat", S[0], 2.5); vid("djA", 2.5, S[1] - 2.5)          # space -> drone shot over a Lubumbashi roundabout
vid("djD", S[1], 2.5); vid("djC", S[1] + 2.5, 0.9)        # real streets of Lubumbashi
OSM_T = S[1] + 3.4
SHOP_T = [round(S[2] + k * (S[3] - S[2]) / 4, 3) for k in range(4)]
vid("man", S[3], 2.3)
B4, w4 = beats(4, [None, "woman", "djB", "handoff"])
B5, w5 = beats(5, [None, None, "box"])
vid("djF", S[8], 2.0)                                     # Lubumbashi youth, before the flag

PW = [(S[3] + 2.3, S[4], "phs_a"), (B4[0], B4[1], "phs_b"), (B5[0], B5[1], "phapp"), (B5[1], B5[2], "phs_c"), (S[7], S[8], "phs_full")]
pv = "".join(f'<video id="pv{k}" class="clip pv" src="assets/v/{c}.mp4" muted playsinline data-start="{a:.3f}" data-duration="{b - a:.3f}" data-track-index="{5 + k % 2}"></video>' for k, (a, b, c) in enumerate(PW))
SW, SH = 520, 1126
slabs = "".join(f'<div class="slab{" back" if k == 20 else ""}" style="transform:translateZ(-{k}px)">' + ("" if k in (1, 20) else '<i class="btn" style="left:-5px;top:280px;height:64px"></i><i class="btn" style="left:-5px;top:370px;height:110px"></i><i class="btn" style="right:-5px;top:400px;height:160px"></i>') + '</div>' for k in range(20, 0, -1))
def cap(id_, txt, top=1500):
    return f'<div class="cap" id="{id_}" style="top:{top}px"><span>{txt}</span></div>'
html = f'''<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>{css}
      .vid {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; z-index: 1; }}
      #scene {{ z-index: 8; background: transparent !important; }}
      .full {{ position: absolute; inset: 0; opacity: 0; overflow: hidden; }}
      .full img.bg {{ position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; }}
      .shade {{ position: absolute; left: 0; right: 0; top: 0; height: 640px; background: linear-gradient(180deg, rgba(0,0,0,.78) 30%, rgba(0,0,0,0)); opacity: 0; z-index: 8; }}
      .shadeB {{ position: absolute; left: 0; right: 0; bottom: 0; height: 800px; background: linear-gradient(0deg, rgba(0,0,0,.6), rgba(0,0,0,0)); opacity: 0; z-index: 8; }}
      .hd {{ position: absolute; left: 76px; right: 76px; top: 250px; font-weight: 800; font-size: 96px; letter-spacing: -3px; line-height: 1.02; color: #fff; opacity: 0; z-index: 9; text-shadow: 0 6px 30px rgba(0,0,0,.35); }}
      .hd span, .hd b {{ display: block; }}
      .hd b {{ color: #8fd0f7; }}
      .tag {{ position: absolute; left: 76px; top: 330px; font-weight: 800; font-size: 40px; letter-spacing: 3px; color: #8fd0f7; opacity: 0; z-index: 9; }}
      .cap {{ position: absolute; left: 60px; right: 60px; text-align: center; opacity: 0; z-index: 9; }}
      .cap span {{ display: inline-block; background: #fff; color: #17120d; font-weight: 800; font-size: 66px; letter-spacing: -2px; padding: 22px 40px; border-radius: 30px; box-shadow: 0 20px 50px rgba(0,0,0,.3); }}
      .credit {{ position: absolute; right: 30px; bottom: 26px; font-size: 22px; color: rgba(255,255,255,.75); z-index: 9; opacity: 0; font-weight: 600; }}
      .pin {{ position: absolute; width: 90px; height: 90px; margin: -90px 0 0 -45px; opacity: 0; z-index: 3; }}
      #anchor {{ z-index: 45; }}
      #pbg {{ position: absolute; inset: 0; z-index: 3; opacity: 0; background: radial-gradient(120% 70% at 50% 40%, #39a4e6 0%, #1f88c9 45%, #0f5f93 100%); }}
      #stage {{ position: absolute; inset: 0; perspective: 2600px; perspective-origin: 50% 55%; z-index: 6; pointer-events: none; }}
      #phone {{ position: absolute; left: {(1080 - SW - 32) / 2}px; top: 560px; width: {SW + 32}px; height: {SH + 32}px; transform-style: preserve-3d; opacity: 0; }}
      .slab {{ position: absolute; inset: 0; border-radius: 80px; background: linear-gradient(90deg, #5d6167, #c9cdd2 18%, #8b9096 50%, #d7dade 82%, #5a5e63); }}
      .slab .btn {{ position: absolute; width: 8px; border-radius: 4px; background: linear-gradient(90deg, #8d9197, #c4c8cd); }}
      .slab.back {{ background: #1b1c20; }}
      #front {{ position: absolute; inset: 0; border-radius: 80px; background: #0b0c0f; padding: 16px; box-sizing: border-box; box-shadow: inset 0 0 0 3px #2b2d32, 0 0 0 2px #a9adb3; }}
      #screen {{ position: relative; width: {SW}px; height: {SH}px; border-radius: 64px; overflow: hidden; background: #fff; }}
      #screen .pv {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
      #island {{ position: absolute; left: 50%; top: 18px; width: 140px; height: 40px; margin-left: -70px; border-radius: 20px; background: #050506; z-index: 6; }}
      #glare {{ position: absolute; inset: 0; z-index: 5; background: linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.17) 47%, rgba(255,255,255,0) 58%); background-size: 260% 100%; background-position: 100% 0; }}
      #pshadow {{ position: absolute; left: 300px; top: 1730px; width: 480px; height: 60px; border-radius: 50%; background: rgba(0,0,0,.35); filter: blur(24px); z-index: 5; opacity: 0; }}
      #lapstage {{ position: absolute; inset: 0; perspective: 2400px; perspective-origin: 50% 40%; z-index: 5; opacity: 0; pointer-events: none; }}
      #lap {{ position: absolute; left: 60px; top: 640px; width: 960px; transform-style: preserve-3d; }}
      #lid {{ position: relative; width: 960px; height: 620px; border-radius: 30px 30px 8px 8px; background: #0d0e11; padding: 22px 22px 30px; box-sizing: border-box; box-shadow: 0 0 0 2px #b9bdc2; transform-origin: 50% 100%; }}
      #lscreen {{ position: relative; width: 916px; height: 568px; overflow: hidden; border-radius: 8px; background: #fff; }}
      #lscreen .hd2 {{ position: absolute; left: 0; top: 0; width: 916px; z-index: 2; }}
      #lscreen .body {{ position: absolute; left: 0; top: 41px; width: 916px; }}
      #deck {{ position: relative; width: 1060px; height: 34px; margin-left: -50px; border-radius: 0 0 26px 26px; background: linear-gradient(180deg, #d9dce0, #9ea2a8); box-shadow: 0 30px 50px rgba(0,0,0,.35); }}
      #deck i {{ position: absolute; left: 50%; top: 0; width: 170px; height: 10px; margin-left: -85px; border-radius: 0 0 10px 10px; background: #8d9196; }}
      #lglare {{ position: absolute; inset: 0; z-index: 3; background: linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.12) 50%, rgba(255,255,255,0) 60%); }}
      #big100 {{ position: absolute; left: 0; right: 0; top: 700px; text-align: center; font-weight: 800; font-size: 400px; letter-spacing: -20px; color: #fff; z-index: 9; text-shadow: 0 10px 50px rgba(0,0,0,.5); }}
      #flag {{ position: absolute; left: 190px; top: 760px; width: 700px; height: 525px; border-radius: 34px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,.45); z-index: 9; }}
      #browser {{ position: absolute; left: 40px; top: 600px; width: 760px; border-radius: 26px; overflow: hidden; background: #fff; box-shadow: 0 40px 80px rgba(0,0,0,.35); z-index: 9; }}
      #browser .bar {{ height: 64px; background: #eef0f3; display: flex; align-items: center; gap: 12px; padding: 0 24px; font-size: 30px; font-weight: 700; color: #1f88c9; }}
      #browser .bar i {{ width: 16px; height: 16px; border-radius: 50%; background: #d0d4da; display: inline-block; }}
      #browser img {{ display: block; width: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DUR:.3f}" data-width="1080" data-height="1920">
      <audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="{DUR:.3f}" data-track-index="11"></audio>
      {"".join(vids)}
      <div id="pbg"></div>
      <div id="lapstage"><div id="lap"><div id="lid"><div id="lscreen"><img class="hd2" src="assets/img/desk_head.png" alt="" style="width:916px"><img class="body" id="lbody" src="assets/img/desk_body.jpg" alt="" style="width:916px"><div id="lglare"></div></div></div><div id="deck"><i></i></div></div></div>
      <div id="pshadow"></div>
      <div id="stage"><div id="phone">{slabs}<div id="front"><div id="screen"><div id="island"></div><div id="glare"></div>{pv}</div></div></div></div>
      <div id="scene" class="clip layer" data-start="0" data-duration="{DUR:.3f}" data-track-index="0">
        <div id="cam">
          <div class="full" id="osm"><img class="bg" src="assets/img/osm.jpg" alt="">
            {"".join(f'<svg class="pin" id="pin{k}" viewBox="0 0 24 24" style="left:{x}px;top:{y}px"><path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0" fill="#1f88c9" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>' for k, (x, y) in enumerate([(260, 760), (790, 700), (560, 1060), (300, 1400), (820, 1460)]))}
            <svg id="route" width="1080" height="1920" style="position:absolute;inset:0;z-index:2"><path d="M260,760 L790,700 L560,1060 L300,1400 L820,1460" fill="none" stroke="#e5484d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3000" stroke-dashoffset="3000"/></svg></div>
          {"".join(f'<div class="full" id="shop{k}"><img class="bg" src="assets/img/{nm}.jpg" alt=""></div>' for k, nm in enumerate(["natty", "wees", "mb", "roga"]))}
          <div class="full" id="dim" style="background:rgba(0,0,0,.55);z-index:7"></div>
          <div class="full" id="mos"><img class="bg" src="assets/img/mosaic.jpg" alt="" style="height:auto;top:0"><div style="position:absolute;inset:0;background:rgba(10,14,20,.62)"></div></div>
          <div class="full" id="web" style="background:#1F88C9"></div>
          <div class="full" id="aer"><img class="bg" src="assets/img/aerial.jpg" alt=""><div style="position:absolute;inset:0;background:rgba(0,0,0,.25)"></div></div>
          <div class="shade" id="shade"></div><div class="shadeB" id="shadeB"></div>
          <div class="hd" id="h0"><span>À Lubumbashi,</span><b>tout existe.</b></div>
          <div class="hd" id="h1"><span>Mais il faut</span><b>savoir où.</b></div>
          <div class="hd" id="h2" style="font-size:84px"><span>Des boutiques pleines</span><b>de belles choses…</b></div>
          {cap("few", "…que trop peu de gens voient.", 1480)}
          <div class="hd" id="h3"><span>Toute la ville,</span><b>dans ton téléphone.</b></div>
          <div class="tag" id="t4">TU ACHÈTES ?</div>
          {"".join(cap(f"c4_{k}", t) for k, t in enumerate(["Tu trouves.", "Tu commandes.", "On te livre.", "Tu paies à la livraison."]))}
          <div class="tag" id="t5">TU VENDS ?</div>
          {"".join(cap(f"c5_{k}", t) for k, t in enumerate(["Ta boutique en ligne.", "Visible par toute la ville.", "La livraison ? On s'en occupe."]))}
          <div id="big100" style="opacity:0">+<span id="num">0</span></div>
          {cap("conf", "boutiques nous font déjà confiance.", 1200)}
          <div class="hd" id="h7"><span>Un téléphone</span><b>suffit.</b></div>
          
          {cap("c7", "L'appli ou le site.", 1740)}
          <div class="hd" id="h8"><span>Fièrement</span><b>congolaise.</b></div>
          <div id="flag" style="opacity:0"><svg viewBox="0 0 800 600" width="700" height="525"><rect width="800" height="600" fill="#007FFF"/>
            <polygon points="0,510 680,0 800,0 800,90 120,600 0,600" fill="#F7D618"/><polygon points="0,555 740,0 800,0 800,45 60,600 0,600" fill="#CE1021"/>
            <polygon id="star" points="150,40 172,108 244,108 186,150 208,218 150,176 92,218 114,150 56,108 128,108" fill="#F7D618"/></svg></div>
          <div class="credit" id="cr0">Imagerie © Esri, Maxar</div>
          <div class="credit" id="cr1">Carte © OpenStreetMap</div>
          <div class="credit" id="cr8">Imagerie © Esri, Maxar</div>
{end_html}
        </div>
        <div id="anchor"><img id="anchorIcon" src="assets/icon_white.png" alt="" /><span id="anchorTxt" style="color:#fff">PitUp · Lubumbashi</span></div>
        <div id="flash"></div>
        <div id="vignette"></div>
        <div id="grain"></div>
      </div>
    </div>
    <script>
      const S = {json.dumps(S)}, END = {END}, DUR = {DUR}, OSM_T = {OSM_T}, SHOP_T = {json.dumps(SHOP_T)}, B4 = {json.dumps(B4)}, B5 = {json.dumps(B5)};
      const tl = gsap.timeline({{ paused: true }});
      const show = (sel, a, b, fade = 0.25) => {{ tl.fromTo(sel, {{ opacity: 0 }}, {{ opacity: 1, duration: fade, ease: "power1.out" }}, a); tl.set(sel, {{ opacity: 0 }}, b); }};
      const hd = (sel, a, b) => {{ tl.fromTo(sel, {{ opacity: 0, yPercent: 25 }}, {{ opacity: 1, yPercent: 0, duration: 0.45, ease: "power3.out" }}, a + 0.05); tl.set(sel, {{ opacity: 0 }}, b); }};
      const cap = (sel, a, b) => {{ tl.fromTo(sel, {{ opacity: 0, scale: 0.85 }}, {{ opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }}, a + 0.05); tl.set(sel, {{ opacity: 0 }}, b); }};
      // dark gradient behind every headline, off on the end card
      tl.set("#shade", {{ opacity: 1 }}, 0); tl.set("#shade", {{ opacity: 0 }}, END);
      tl.set("#shadeB", {{ opacity: 1 }}, S[4]); tl.set("#shadeB", {{ opacity: 0 }}, S[6]);
      // 0 satellite zoom
      hd("#h0", 0.3, S[1]); show("#cr0", 0, 2.5);
      // 1 market crowd, then the city map: pins light up, the route draws
      hd("#h1", S[1], S[2]); show("#osm", OSM_T, S[2], 0.3); show("#cr1", OSM_T, S[2]);
      tl.fromTo("#osm img.bg", {{ scale: 1.15 }}, {{ scale: 1.0, duration: S[2] - OSM_T, ease: "none" }}, OSM_T);
      for (let k = 0; k < 5; k++) tl.fromTo("#pin" + k, {{ opacity: 0, y: -50 }}, {{ opacity: 1, y: 0, duration: 0.3, ease: "back.out(2)" }}, OSM_T + 0.1 + k * 0.45);
      tl.to("#route path", {{ strokeDashoffset: 0, duration: S[2] - OSM_T - 0.4, ease: "none" }}, OSM_T + 0.2);
      // 2 real partner shops, then the light drops
      SHOP_T.forEach((t, k) => {{ const b = k < 3 ? SHOP_T[k + 1] : S[3]; show("#shop" + k, t, b, 0.2); tl.fromTo("#shop" + k + " img", {{ scale: 1.12, xPercent: k % 2 ? -3 : 3 }}, {{ scale: 1.0, xPercent: 0, duration: b - t, ease: "none" }}, t); }});
      hd("#h2", S[2], S[3]);
      const dimT = S[2] + (S[3] - S[2]) * 0.58; show("#dim", dimT, S[3], 0.4); cap("#few", dimT, S[3]);
      // 3 real person, real phone, then the real site
      hd("#h3", S[3], S[4]);
      // 4 buyer beats
      show("#t4", S[4], S[5]); B4.forEach((t, k) => cap("#c4_" + k, t, k < 3 ? B4[k + 1] : S[5]));
      // 5 seller beats
      show("#t5", S[5], S[6]); B5.forEach((t, k) => cap("#c5_" + k, t, k < 2 ? B5[k + 1] : S[6]));
      // 6 one photo from each shop, then the count
      show("#mos", S[6], S[7], 0.2); tl.fromTo("#mos img", {{ y: 0 }}, {{ y: -60, duration: S[7] - S[6], ease: "none" }}, S[6]);
      show("#big100", S[6], S[7]); cap("#conf", S[6] + 0.3, S[7]);
      const cnt = {{ v: 0 }}; tl.fromTo(cnt, {{ v: 0 }}, {{ v: 100, duration: 1.4, ease: "power2.out", onUpdate: () => (document.getElementById("num").textContent = Math.round(cnt.v)) }}, S[6] + 0.1);
      // 7 real phone, then the real website
      hd("#h7", S[7], S[8]); const mid7 = S[7];
      cap("#c7", mid7 + 0.5, S[8]);
      // 8 aerial city, the flag rises
      show("#aer", S[8] + 2.0, END, 0.3); show("#cr8", S[8] + 2.0, END); tl.fromTo("#aer img", {{ scale: 1.0 }}, {{ scale: 1.12, duration: END - S[8] - 2.0, ease: "none" }}, S[8] + 2.0);
      hd("#h8", S[8], END);
      tl.fromTo("#flag", {{ opacity: 0, scale: 0.7, rotation: -4 }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.5)" }}, S[8] + 2.1); tl.set("#flag", {{ opacity: 0 }}, END);
      tl.fromTo("#star", {{ scale: 0, rotation: -90, transformOrigin: "150px 130px" }}, {{ scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }}, S[8] + 2.5);
      // 3D phone: turns in at each window, swings gently, glare follows; blue backdrop when no real footage sits behind
      const PW = {json.dumps(PW)};
      PW.forEach(([a, b], k) => {{
        const s7 = k === PW.length - 1, side = k % 2 ? -1 : 1;
        tl.set("#pbg", {{ opacity: 1 }}, a); tl.set("#pbg", {{ opacity: 0 }}, b);
        tl.set("#phone", {{ opacity: 1, x: s7 ? 250 : 0, y: s7 ? 330 : 0, scale: s7 ? 0.62 : 1 }}, a); tl.set("#phone", {{ opacity: 0 }}, b);
        tl.set("#pshadow", {{ opacity: s7 ? 0 : 1 }}, a); tl.set("#pshadow", {{ opacity: 0 }}, b);
        tl.fromTo("#phone", {{ rotationY: -60 * side, rotationX: 10 }}, {{ rotationY: -14 * side, rotationX: 6, duration: 0.7, ease: "power3.out" }}, a);
        tl.to("#phone", {{ rotationY: 12 * side, duration: Math.max(0.3, b - a - 0.7), ease: "sine.inOut" }}, a + 0.7);
        tl.fromTo("#glare", {{ backgroundPositionX: "100%" }}, {{ backgroundPositionX: "0%", duration: b - a, ease: "sine.inOut" }}, a);
      }});
      // 3D laptop with the real marketplace page scrolling, phone in front
      tl.set("#lapstage", {{ opacity: 1 }}, S[7]); tl.set("#lapstage", {{ opacity: 0 }}, S[8]);
      tl.fromTo("#lap", {{ rotationY: 22, rotationX: 8, y: 120 }}, {{ rotationY: 8, rotationX: 4, y: 0, duration: 0.8, ease: "power3.out" }}, S[7]);
      tl.to("#lap", {{ rotationY: -6, duration: S[8] - S[7] - 0.8, ease: "sine.inOut" }}, S[7] + 0.8);
      tl.fromTo("#lid", {{ rotationX: -70 }}, {{ rotationX: 0, duration: 0.8, ease: "power3.out" }}, S[7]);
      tl.fromTo("#lbody", {{ y: 0 }}, {{ y: -1150, duration: S[8] - S[7] - 0.6, ease: "sine.inOut" }}, S[7] + 0.5);
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
print(json.dumps({"S": S, "END": END, "DUR": DUR}))
