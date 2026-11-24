# VoxCPM2 voice design: "(description)text" -> wav
import sys, time, soundfile as sf
from voxcpm import VoxCPM
out = sys.argv[1]
desc_texts = list(zip(sys.argv[2::2], sys.argv[3::2]))
t = time.time(); m = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False); print("load", round(time.time() - t), "s", flush=True)
for i, (desc, text) in enumerate(desc_texts):
    t = time.time(); wav = m.generate(text=f"({desc}){text}", cfg_value=2.0, inference_timesteps=10)
    sf.write(f"{out}_{i}.wav", wav, m.tts_model.sample_rate); print(i, "gen", round(time.time() - t), "s", flush=True)
