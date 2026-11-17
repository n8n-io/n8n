import subprocess, re, os, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = sorted(glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/*')))[-1]
TEMPLATE = '''<!doctype html><html><head><meta charset="utf-8"><title>pending</title>
<style>body{margin:0;background:#fff;font-family:-apple-system,Helvetica,Arial,sans-serif}#w{display:inline-block;padding:20px}</style></head>
<body><div id="w"><pre class="mermaid">%s</pre></div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({startOnLoad:false,theme:'neutral',fontSize:15,flowchart:{useMaxWidth:false,htmlLabels:true},sequence:{useMaxWidth:false}});
mermaid.run().then(()=>{const r=document.getElementById('w').getBoundingClientRect();document.title='SIZE:'+Math.ceil(r.width)+'x'+Math.ceil(r.height)}).catch(e=>{document.title='ERR:'+e.message});
</script></body></html>'''
for src in sorted(glob.glob(os.path.join(HERE, '*.mmd'))):
    name = os.path.splitext(os.path.basename(src))[0]
    html = os.path.join(HERE, name + '.html')
    code = open(src).read().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    open(html, 'w').write(TEMPLATE % code)
    base = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=10000']
    dom = subprocess.run(base + ['--dump-dom', 'file://' + html], capture_output=True, text=True, timeout=90).stdout
    m = re.search(r'<title>(SIZE:(\d+)x(\d+)|ERR:[^<]*)</title>', dom)
    if not m or not m.group(2):
        print(name, 'FAILED', m.group(1) if m else dom[:300]); continue
    w, h = int(m.group(2)), int(m.group(3))
    png = os.path.join(HERE, name + '.png')
    subprocess.run(base + ['--force-device-scale-factor=2', f'--window-size={w},{h}', '--screenshot=' + png, 'file://' + html], capture_output=True, text=True, timeout=90)
    print(name, w, h, os.path.exists(png) and os.path.getsize(png))
