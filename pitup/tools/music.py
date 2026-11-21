import sys, subprocess, numpy as np
f=sys.argv[1]; SR=22050
a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-vn','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
hop=512;n=2048
fr=np.lib.stride_tricks.sliding_window_view(a,n)[::hop]*np.hanning(n)
S=np.abs(np.fft.rfft(fr,axis=1));fq=np.fft.rfftfreq(n,1/SR)
flux=np.maximum(np.diff(np.log1p(S*10),axis=0),0).sum(1);flux=(flux-flux.mean())/flux.std()
x=flux[:20000];L=len(x);ac=np.correlate(x,x,"full")[L-1:];lags=np.arange(len(ac))*hop/SR
m=(lags>60/170)&(lags<60/60);bpm=60/lags[m][np.argmax(ac[m])]
tot=S.sum();b=lambda lo,hi:S[:,(fq>=lo)&(fq<hi)].sum()/tot
print(f"dur {len(a)/SR:.0f}s BPM~{bpm:.1f} (or x2 {bpm*2:.0f}) | sub<100 {b(0,100):.0%} low-mid 100-300 {b(100,300):.0%} vocal 300-3k {b(300,3000):.0%} hi>6k {b(6000,11025):.0%}")
# energy per 4s block, sub-bass & vocal per block
blk=int(4*SR/hop); E=[];V=[];B=[]
vm=(fq>=300)&(fq<3000); bm=fq<100
for i in range(0,len(S)-blk,blk):
  s=S[i:i+blk]; E.append(np.sqrt((s**2).mean())); V.append(s[:,vm].sum()/s.sum()); B.append(s[:,bm].sum()/s.sum())
E=np.array(E)/max(E)
print("t(s) energy/vocal%/sub%: "+" ".join(f"{i*4}:{e:.2f}/{v*100:.0f}/{bb*100:.0f}" for i,(e,v,bb) in enumerate(zip(E,V,B))))
