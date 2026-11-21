# VoxCPM2 controllable cloning: reference voice timbre + "(style)" instruction
import sys, time, soundfile as sf
from voxcpm import VoxCPM
ref, out, text = sys.argv[1], sys.argv[2], sys.argv[3]
styles = sys.argv[4:]
m = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
for i, st in enumerate(styles):
    t = time.time()
    wav = m.generate(text=f"({st}){text}", reference_wav_path=ref, cfg_value=2.0, inference_timesteps=10)
    sf.write(f"{out}_{i}.wav", wav, m.tts_model.sample_rate); print(i, round(time.time() - t), "s", flush=True)
