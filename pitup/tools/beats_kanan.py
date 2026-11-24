import sys, subprocess, numpy as np
f=sys.argv[1]; t0=float(sys.argv[2]); t1=float(sys.argv[3]); SR=22050
a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-ss',str(t0),'-t',str(t1-t0),'-i',f,'-vn','-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
hop=256;n=1024
fr=np.lib.stride_tricks.sliding_window_view(a,n)[::hop]*np.hanning(n)
S=np.abs(np.fft.rfft(fr,axis=1));fq=np.fft.rfftfreq(n,1/SR)
low=S[:,fq<150].sum(1); lowf=np.maximum(np.diff(np.log1p(low)),0)
full=np.maximum(np.diff(np.log1p(S*10),axis=0),0).sum(1)
t=t0+np.arange(len(full))*hop/SR
# tempo fine search 140-156 on full flux
best=None
for bpm in np.arange(136,144,0.01):
  P=60/bpm
  for ph in np.arange(0,P,0.01):
    idx=((np.arange(t0+ph,t1,P)-t0)*SR/hop).astype(int); idx=idx[idx<len(full)]
    s=full[idx].sum()
    if best is None or s>best[0]: best=(s,bpm,ph)
_,bpm,ph=best; P=60/bpm
print(f"BPM {bpm:.2f} period {P:.4f}s first beat {t0+ph:.3f}")
# per-beat strength: kick (low flux) and rms
rms=np.sqrt((fr**2).mean(1))
for k,bt in enumerate(np.arange(t0+ph,t1,P)):
  i=int((bt-t0)*SR/hop)
  if i>=len(lowf)-3: break
  w=slice(max(i-2,0),i+3)
  print(f"{k:3d} {bt:7.3f} kick {lowf[w].max():5.2f} rms {rms[i:i+int(P*SR/hop)].mean():.3f}")
