import sys, subprocess, numpy as np
f=sys.argv[1]; SR=22050
a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
hop=512; n=1024
fr=np.lib.stride_tricks.sliding_window_view(a,n)[::hop]*np.hanning(n)
S=np.abs(np.fft.rfft(fr,axis=1)); freqs=np.fft.rfftfreq(n,1/SR)
flux=np.maximum(np.diff(np.log1p(S*10),axis=0),0).sum(1); flux=(flux-flux.mean())/(flux.std()+1e-9)
t=np.arange(len(flux))*hop/SR
# tempo via autocorrelation in 70-180 bpm
ac=np.correlate(flux,flux,'full')[len(flux)-1:]
lags=np.arange(len(ac))*hop/SR; m=(lags>60/180)&(lags<60/70)
bpm=60/lags[m][np.argmax(ac[m])]
# band energy share
tot=S.sum(); band=lambda lo,hi:S[:,(freqs>=lo)&(freqs<hi)].sum()/tot
rms=np.sqrt((fr**2).mean(1)); 
print(f"BPM~{bpm:.0f} | sub<120Hz {band(0,120):.0%} | voice 300-3k {band(300,3000):.0%} | air>6k {band(6000,11025):.0%}")
# strongest onsets
pk=[i for i in range(1,len(flux)-1) if flux[i]>flux[i-1] and flux[i]>=flux[i+1] and flux[i]>2.5]
pk=sorted(pk,key=lambda i:-flux[i])[:25]; on=np.sort(t[pk])
print("onsets:", " ".join(f"{x:.2f}" for x in on))
# visual cuts: mean abs frame diff on 48x86 gray
W,H=48,86
v=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-vf',f'scale={W}:{H},format=gray','-f','rawvideo','-'],capture_output=True).stdout,dtype=np.uint8)
v=v.reshape(-1,H,W).astype(float); d=np.abs(np.diff(v,axis=0)).mean((1,2))
fps=30; z=(d-np.median(d))/(d.std()+1e-9)
cuts=[i for i in range(1,len(z)-1) if z[i]>z[i-1] and z[i]>=z[i+1] and z[i]>2]
ct=np.array(cuts)/fps+1/fps
print("visual peaks:", " ".join(f"{x:.2f}" for x in ct))
if len(ct) and len(on):
  dist=np.array([np.min(np.abs(on-c)) for c in ct]); print(f"visual peaks within 80ms of a strong onset: {np.mean(dist<0.08):.0%} ({len(ct)} peaks)")
