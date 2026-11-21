const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const p=await ctx.newPage();const vids=[];
p.on('response',r=>{const u=r.url();if((r.headers()['content-type']||'').includes('video'))vids.push(u);});
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:60000});await p.waitForTimeout(8000);
await p.screenshot({path:'page.png'});
const desc=await p.evaluate(()=>{const s=document.querySelector('script#__UNIVERSAL_DATA_FOR_REHYDRATION__');return s?s.textContent:'';});
fs.writeFileSync('data.json',desc);
if(vids.length){const r=await ctx.request.get(vids[0],{headers:{Referer:'https://www.tiktok.com/'}});fs.writeFileSync('video.mp4',await r.body());}
const meta=await p.evaluate(()=>document.title+' || '+(document.querySelector('[data-e2e="browse-video-desc"],[data-e2e="video-desc"]')||{}).innerText);console.log(meta);console.log('vids',vids.slice(0,3));await b.close();})();
