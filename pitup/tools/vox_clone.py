# VoxCPM2 cloning from a reference recording: three modes for comparison
import sys, time, soundfile as sf
from voxcpm import VoxCPM
ref, ref_text, out, text = sys.argv[1:5]
m = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
modes = [
    ("ref", dict(text=text, reference_wav_path=ref)),
    ("cont", dict(text=text, reference_wav_path=ref, prompt_wav_path=ref, prompt_text=ref_text)),
    ("doux", dict(text="(voix douce et posée, chaleureuse, avec le sourire)" + text, reference_wav_path=ref)),
]
for name, kw in modes:
    t = time.time(); wav = m.generate(cfg_value=2.0, inference_timesteps=10, **kw)
    sf.write(f"{out}_{name}.wav", wav, m.tts_model.sample_rate); print(name, round(time.time() - t), "s", flush=True)
