# Satellite zoom from Africa down to Lubumbashi city centre, rendered as a 1080x1920 clip.
import math, os, sys, urllib.request, io, subprocess
from PIL import Image
LAT, LON = -11.6647, 27.4793
OUT = sys.argv[1]; Z0, Z1, SECS, FPS = int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), 30
SRC = sys.argv[5] if len(sys.argv) > 5 else "sat"
D = os.path.dirname(OUT) + f"/tiles_{SRC}"; os.makedirs(D, exist_ok=True)
URL = {"sat": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
       "osm": "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}[SRC]
W, H = 1080, 1920
def px(z):
    n = 256 * 2 ** z; x = (LON + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(LAT)) + 1 / math.cos(math.radians(LAT))) / math.pi) / 2 * n
    return x, y
def tile(z, x, y):
    f = f"{D}/{z}_{x}_{y}.png"
    if not os.path.exists(f):
        import time
        for k in range(6):                                    # the proxy sometimes drops a tunnel: retry
            try:
                req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={"User-Agent": "PitUp-video-maker/1.0"})
                Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB").save(f); break
            except Exception:
                time.sleep(2 ** k)
    return Image.open(f)
def level(z, w, h):  # w x h canvas centred on the city at zoom z
    cx, cy = px(z); x0, y0 = cx - w / 2, cy - h / 2
    c = Image.new("RGB", (w, h))
    for tx in range(int(x0 // 256), int((x0 + w) // 256) + 1):
        for ty in range(int(y0 // 256), int((y0 + h) // 256) + 1):
            c.paste(tile(z, tx, ty), (int(tx * 256 - x0), int(ty * 256 - y0)))
    return c
levels = {z: level(z, W * 3, H * 3) for z in range(Z0, Z1 + 1)}
def view(z, k):  # frame showing level z magnified k times relative to "fits 1080 px = 1080 level px"
    img = levels[z]; cw, ch = W / k, H / k; cx, cy = W * 1.5, H * 1.5
    return img.resize((W, H), Image.LANCZOS, box=(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2))
N = int(SECS * FPS)
p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                      "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-pix_fmt", "yuv420p", OUT], stdin=subprocess.PIPE)
for i in range(N):
    u = i / (N - 1); u = u * u * (3 - 2 * u)                 # ease in-out
    s = Z0 + 1 + u * (Z1 - Z0 - 1)                            # continuous zoom; view(z, 2**(s-z)) shows the same ground
    z = int(s); f = s - z
    if f < 0.4 or z >= Z1:
        fr = view(z, 2 ** f) if f < 0.4 or z >= Z1 else None
    if z >= Z1:
        fr = view(Z1, 2 ** (s - Z1))
    elif f >= 0.4:
        a = view(z, 2 ** f); b = view(z + 1, 2 ** (f - 1))   # level z+1 at k<1 needs a crop up to 3W: canvas is 3W
        fr = Image.blend(a, b, min(1, (f - 0.4) / 0.6))
    p.stdin.write(fr.tobytes())
p.stdin.close(); p.wait(); print(OUT)
