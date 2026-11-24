# Uniform cutout: 2x upscale, isnet mask, same cleanup for every object in the frame
import sys, numpy as np
from rembg import remove, new_session
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
s = new_session('isnet-general-use')
src, dst = sys.argv[1], sys.argv[2]
for a in sys.argv[3:]:
    i, name = a.split(':')
    im = Image.open(f'{src}/{i}.jpg').convert('RGB')
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    m = np.array(remove(im, session=s, only_mask=True), dtype=np.float32) / 255
    hard = m > 0.5
    lab, n = ndi.label(hard)
    if n:
        areas = ndi.sum(hard, lab, range(1, n + 1))
        # keep every object at least 12% of the largest: identical items survive together, specks go
        keep = [k + 1 for k, ar in enumerate(areas) if ar >= 0.12 * areas.max()]
        hard = np.isin(lab, keep)
    # close pinholes inside objects, never real openings (bag handles)
    holes = ndi.binary_fill_holes(hard) & ~hard
    hl, hn = ndi.label(holes)
    if hn:
        ha = ndi.sum(holes, hl, range(1, hn + 1))
        small = [k + 1 for k, ar in enumerate(ha) if ar < 0.002 * hard.sum()]
        hard |= np.isin(hl, small)
    hard = ndi.binary_erosion(hard, iterations=2)        # same 1px (at 1x) inset everywhere: no halo
    alpha = Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    out = im.copy(); out.putalpha(alpha)
    bb = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    out = out.crop(bb); out.save(f'{dst}/{name}.png'); print(name, out.size, 'objects', len(keep) if n else 0)
