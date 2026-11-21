# Removes the creator watermark from 720x1280 frames with LaMa inpainting (no blur): the masked zones are redrawn.
import sys, numpy as np, onnxruntime as ort
from PIL import Image, ImageDraw, ImageFilter
sess = ort.InferenceSession("/root/.cache/lama/lama.onnx", providers=["CPUExecutionProvider"])
X0, Y0 = 208, 0                                  # 512x512 work window, top-right of the frame
RECTS = [(550, 82, 690, 136), (617, 296, 674, 354), (532, 364, 674, 402)]   # signature, IG icon, @handle
def mask_img():
    m = Image.new("L", (512, 512), 0); d = ImageDraw.Draw(m)
    for a, b, c, e in RECTS: d.rectangle((a - X0, b - Y0, c - X0, e - Y0), fill=255)
    return m
M = mask_img(); MN = (np.asarray(M) > 127).astype(np.float32)[None, None]
FEATHER = M.filter(ImageFilter.GaussianBlur(3))
def clean(im):
    win = im.crop((X0, Y0, X0 + 512, Y0 + 512))
    x = (np.asarray(win, dtype=np.float32) / 255.0).transpose(2, 0, 1)[None]
    out = sess.run(None, {"image": x, "mask": MN})[0][0].transpose(1, 2, 0)
    if out.max() <= 1.5: out = out * 255
    rec = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    win.paste(rec, (0, 0), FEATHER); im.paste(win, (X0, Y0)); return im
if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    clean(Image.open(src).convert("RGB")).save(dst)
