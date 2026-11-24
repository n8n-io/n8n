# Builds one continuous screen video for the tutorial: each step's pieces play at gentle speeds,
# the last piece of a step holds its final frame until the next step, and pieces dissolve into each other.
import json, subprocess, sys, os
from PIL import Image
SRC, cfg, timing, out = sys.argv[1], json.load(open(sys.argv[2])), json.load(open(sys.argv[3])), sys.argv[4]
X = 0.25                                   # dissolve length
tmp = os.path.dirname(out) + "/pieces"; os.makedirs(tmp, exist_ok=True)
pieces = []                                # (file, duration on the timeline)
for st, win in zip(cfg["steps"], timing["steps"]):
    t = win["t"]
    for k, (name, a, b, speed) in enumerate(st["segs"]):
        nat = (b - a) / speed
        last = k == len(st["segs"]) - 1
        d = (win["end"] - t) if last else nat
        pieces.append((name, a, b, speed, d)); t += d
n = len(pieces); files = []
for i, (name, a, b, speed, d) in enumerate(pieces):
    L = d + (X if i < n - 1 else 0)        # each piece overlaps the next by the dissolve
    vf = f"setpts=(PTS-STARTPTS)/{speed},fps=30,tpad=stop_mode=clone:stop_duration=30"
    inputs = ["-ss", str(a), "-to", str(b), "-i", SRC]
    banner = cfg.get("banner")
    if name == "s8" and banner and os.path.exists(banner):
        # the shop banner "arrives" in the upload box half a second into the shot
        x0, y0, x1, y1 = cfg["banner_box"]
        im = Image.open(banner).convert("RGB"); w, h = x1 - x0, y1 - y0
        if cfg.get("banner_fit") == "contain":   # square logo: show it whole on white, like the upload preview
            r = min(w / im.width, h / im.height) * 0.94; im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
            c = Image.new("RGB", (w, h), (255, 255, 255)); c.paste(im, ((w - im.width) // 2, (h - im.height) // 2)); im = c
        else:
            r = max(w / im.width, h / im.height); im = im.resize((int(im.width * r + 1), int(im.height * r + 1)))
            im = im.crop(((im.width - w) // 2, (im.height - h) // 2, (im.width - w) // 2 + w, (im.height - h) // 2 + h))
        im.save(tmp + "/banner.png")
        inputs += ["-loop", "1", "-i", tmp + "/banner.png"]
        vf = (f"[0:v]{vf}[base];[1:v]format=rgba,fade=t=in:st=0.5:d=0.35:alpha=1,setpts=PTS-STARTPTS[bn];"
              f"[base][bn]overlay={x0}:{y0}:shortest=0")
        cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", vf, "-t", f"{L:.3f}", "-an", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", f"{tmp}/p{i}.mp4"]
    else:
        cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + ["-vf", vf, "-t", f"{L:.3f}", "-an", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", f"{tmp}/p{i}.mp4"]
    subprocess.run(cmd, check=True); files.append(f"{tmp}/p{i}.mp4")
# xfade chain
args = []; [args.extend(["-i", f]) for f in files]
chain, prev, off = [], "[0:v]", 0.0
for i in range(1, n):
    off += pieces[i - 1][4]
    lab = f"[x{i}]"; chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={X}:offset={off:.3f}{lab}"); prev = lab
subprocess.run(["ffmpeg", "-v", "error", "-y"] + args + ["-filter_complex", ";".join(chain), "-map", prev, "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "-g", "30", out], check=True)
print("master", out, round(sum(p[4] for p in pieces), 2), "s; pieces start:", [round(timing["steps"][0]["t"] + sum(p[4] for p in pieces[:i]), 2) for i in range(n)])
