import sys
from rembg import remove, new_session
from PIL import Image
s=new_session('isnet-general-use')
src,dst=sys.argv[1],sys.argv[2]
for a in sys.argv[3:]:
    i,name=a.split(':')
    im=Image.open(f'{src}/{i}.jpg').convert('RGB')
    out=remove(im,session=s)
    bb=out.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox()
    out=out.crop(bb); out.save(f'{dst}/{name}.png'); print(name,out.size)
