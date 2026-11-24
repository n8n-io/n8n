import json,os,sys,urllib.request
from PIL import Image,ImageDraw,ImageFont
d={p['id']:p for p in json.load(open('prod/api_products.json'))}
ids=[int(x) for x in sys.argv[2].split(',')]
T=180;N=15
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
sheet=Image.new('RGB',(N*T+20,len(ids)*(T+34)+10),'white');dr=ImageDraw.Draw(sheet)
for r,i in enumerate(ids):
  p=d[i];y0=10+r*(T+34)
  dr.text((10,y0),f"#{i} {p['name'][:40]} | {p['store']['store_name'][:25]} | {len(p['images'])}",fill='black',font=font)
  for k,im in enumerate(p['images'][:N]):
    f=f'prod/api/{i}_{k}.jpg'
    if not os.path.exists(f):
      url=im['image'] if isinstance(im,dict) else im
      try: urllib.request.urlretrieve(url,f)
      except Exception as e: print('fail',i,k,e); continue
    t=Image.open(f).convert('RGB');t.thumbnail((T-4,T-4))
    sheet.paste(t,(10+k*T,y0+28))
sheet.save(sys.argv[1],quality=80);print(sheet.size)
