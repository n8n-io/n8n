# Cleans every frame of a source span with LaMa, then rebuilds the 1080x1920 clip (optional motion-interpolated slow motion).
import sys, os, glob, subprocess, shutil
sys.path.insert(0, os.path.dirname(__file__))
from lama_wm import clean
from PIL import Image
src, name, a, b, speed, mfps, outdir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
tmp = f"{outdir}/_f_{name}"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
subprocess.run(["ffmpeg", "-v", "error", "-ss", a, "-to", b, "-i", src, "-an", f"{tmp}/%04d.png"], check=True)
for f in sorted(glob.glob(f"{tmp}/*.png")):
    clean(Image.open(f).convert("RGB")).save(f)
vf = (f"minterpolate=fps={mfps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=PTS/{speed}," if speed != 1 else "") + "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", f"{tmp}/%04d.png", "-vf", vf, "-c:v", "libx264", "-crf", "17", f"{outdir}/{name}.mp4"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/0005.png", "-vf", "scale=240:-1", f"{outdir}/_chk_{name}.jpg"])
shutil.rmtree(tmp); print(name, "ok")
