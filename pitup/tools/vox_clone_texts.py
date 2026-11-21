# VoxCPM2: one reference voice + one style, several texts (spelling variants)
import sys, time, soundfile as sf
from voxcpm import VoxCPM
ref, style, out = sys.argv[1:4]
m = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
for i, text in enumerate(sys.argv[4:]):
    t = time.time(); wav = m.generate(text=f"({style}){text}", reference_wav_path=ref, cfg_value=2.0, inference_timesteps=10)
    sf.write(f"{out}_{i}.wav", wav, m.tts_model.sample_rate); print(i, round(time.time() - t), "s", flush=True)
