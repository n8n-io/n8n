# Real-ESRGAN x4 (ONNX, fixed 64x64 tiles): tiled inference with overlap, stitched from tile centres
import sys, numpy as np, onnxruntime as ort
from PIL import Image
sess = ort.InferenceSession('/root/.cache/esrgan/model.onnx', providers=['CPUExecutionProvider'])
T, O = 64, 8                      # tile size, overlap on each side
S = T - 2 * O
def up(im):
    a = np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    ph, pw = -(-h // S) * S, -(-w // S) * S
    p = np.pad(a, ((O, ph - h + O), (O, pw - w + O), (0, 0)), mode='reflect')
    out = np.zeros((ph * 4, pw * 4, 3), np.float32)
    tiles, pos = [], []
    for y in range(0, ph, S):
        for x in range(0, pw, S):
            tiles.append(p[y:y + T, x:x + T].transpose(2, 0, 1)); pos.append((y, x))
    for i in range(0, len(tiles), 16):
        for t, (y, x) in zip(tiles[i:i + 16], pos[i:i + 16]):
            r = sess.run(None, {'input.1': t[None]})[0][0].transpose(1, 2, 0)
            out[y * 4:(y + S) * 4, x * 4:(x + S) * 4] = r[O * 4:(O + S) * 4, O * 4:(O + S) * 4]
    out = np.clip(out[:h * 4, :w * 4], 0, 1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8))
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    up(Image.open(src)).save(dst, quality=95); print(dst)
