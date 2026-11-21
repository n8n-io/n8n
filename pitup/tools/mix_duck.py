# Music + égérie voice: music stays very low from her first word to her last, then comes back in full on the end card.
import json, subprocess, sys, numpy as np, soundfile as sf
SP = "/tmp/claude-0/-home-user-n8n/3a1d2361-6d15-5131-aa88-7efcec5ec51a/scratchpad"
cfg = json.load(open(sys.argv[1])); P = f"{SP}/hf/videos/{cfg['project']}"; out = sys.argv[2]
T = json.load(open(f"{P}/timing.json")); SR = 48000; DUR = T["dur"]
HI, LO, VOX = 0.45, 0.45 * 0.07, 1.65          # LO ≈ -23 dB under the voice
RAMP_DOWN, RAMP_UP, PAD, MIN_GAP = 0.12, 0.6, 0.08, 1e9   # MIN_GAP: never swell between lines
def load(f, ss=0, t=None, filt=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(ss)] + (["-t", str(t)] if t else []) + ["-i", f] + (["-af", filt] if filt else []) + ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).reshape(-1, 2)
n = int(DUR * SR)
mus = load(f"{SP}/livrables/Playlist-PitUp/autorises/{cfg['song']}", cfg["song_off"], DUR + 1, "bass=g=3")[:n]
mus = np.pad(mus, ((0, n - len(mus)), (0, 0)))
fade = int(1.2 * SR); mus[-fade:] *= np.linspace(1, 0, fade)[:, None]
vox = np.zeros((n, 2), np.float32); spans = []
for f, start, a in T["vo"]:
    v = load(f"{SP}/audio/v8/{f}.wav", a)
    # drop the trailing near-silence so the duck releases when she stops talking
    e = np.abs(v).max(1); idx = np.where(e > 10 ** (-40 / 20))[0]; v = v[: idx[-1] + int(0.05 * SR)] if len(idx) else v
    i = int(start * SR); v = v[: n - i]; vox[i:i + len(v)] += v * VOX
    spans.append((start - PAD, start + len(v) / SR + PAD))
# merge spans separated by gaps too short for a musical swell
merged = []
for s, e in sorted(spans):
    if merged and s - merged[-1][1] < MIN_GAP: merged[-1][1] = max(merged[-1][1], e)
    else: merged.append([s, e])
t = np.arange(n) / SR; g = np.full(n, HI, np.float32)
for s, e in merged:
    down = np.clip((t - (s - RAMP_DOWN)) / RAMP_DOWN, 0, 1); up = np.clip(((e + RAMP_UP) - t) / RAMP_UP, 0, 1)
    duck = np.minimum(down, up)                      # 0 outside, 1 inside the span
    g = np.minimum(g, HI - (HI - LO) * duck)
mix = mus * g[:, None] + vox
sf.write(out + ".raw.wav", mix, SR, subtype="FLOAT")
# two-pass loudnorm to -14 LUFS
m = subprocess.run(["ffmpeg", "-v", "info", "-i", out + ".raw.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out + ".raw.wav", "-af",
    f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
    "-ar", str(SR), "-c:a", "pcm_s16le", out], check=True)
print("ducked spans:", [(round(s, 2), round(e, 2)) for s, e in merged])
