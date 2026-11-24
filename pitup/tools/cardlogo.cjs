const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:430,height:900}});
await p.goto('https://www.pi-tup.com/shopping',{waitUntil:'networkidle',timeout:60000});
for(let i=0;i<45;i++){await p.mouse.wheel(0,1800);await p.waitForTimeout(500);}
const r=await p.evaluate(()=>{const out={};document.querySelectorAll('img').forEach(i=>{const s=i.currentSrc||i.src;if(!/store_logos/.test(s))return;let c=i;for(let k=0;k<4&&c;k++)c=c.parentElement;const t=(c?.innerText||'').split('\n')[0].trim();if(t&&!out[t])out[t]=s;});return out;});
console.log(JSON.stringify(r,null,0));await b.close();})();
