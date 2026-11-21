import json,os,sys,urllib.request
from PIL import Image,ImageDraw,ImageFont
d={p['id']:p for p in json.load(open('prod/api_products.json'))}
C=[(770,'Brume Victoria\'s Secret'),(766,'Parfum Kayali'),(768,'Gloss'),(750,'Ballerines Mary Jane'),(749,'Sandales'),(715,'Sac à main'),(424,'Sac Coach'),
(509,'Ray-Ban Wayfarer'),(511,'Lunettes Tom Ford'),(533,'Casque AirPods Max'),(463,'Gourde Stanley'),(481,'Jacket en cuir'),(423,'Veste en cuir'),(457,'Jacket'),
(401,'Cargo'),(190,'Baggy'),(274,'Petite robe en jean'),(459,'Ensemble'),(420,'Corset'),(4,'The North Face'),
(30,'Adidas Samba'),(38,'Adidas Campus'),(72,'New Balance'),(641,'Asics'),(638,'Nike Shox TL'),(636,'Jordan 4 Nigel Sylvester'),(34,'Air Force 1'),(37,'Nike TN'),(489,'Jordan 11')]
os.makedirs('prod/api',exist_ok=True)
T=300;N=4;W=N*T;H=T+44
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
cols=3;rows=(len(C)+cols-1)//cols
sheet=Image.new('RGB',(cols*(W+20)+20,rows*(H+20)+20),'white');dr=ImageDraw.Draw(sheet)
for n,(i,lab) in enumerate(C):
  p=d[i];x0=20+(n%cols)*(W+20);y0=20+(n//cols)*(H+20)
  dr.text((x0,y0+8),f"{n+1}. {lab}  ({len(p['images'])} photos)",fill='black',font=font)
  for k,im in enumerate(p['images'][:N]):
    f=f'prod/api/{i}_{k}.jpg'
    if not os.path.exists(f):
      url=im['image'] if isinstance(im,dict) else im
      try: urllib.request.urlretrieve(url,f)
      except Exception as e: print('fail',i,k,e); continue
    t=Image.open(f).convert('RGB');t.thumbnail((T-6,T-6))
    sheet.paste(t,(x0+k*T+(T-t.width)//2,y0+44+(T-t.height)//2))
sheet.save('livrables/planche_tendance.jpg',quality=85);print(sheet.size)
