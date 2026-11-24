const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},isMobile:true});const p=await c.newPage();
await p.goto('https://www.pi-tup.com/marketplace',{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(1500);
await p.locator('input[placeholder*="echercher"]').first().fill(process.argv[2]);await p.waitForTimeout(3000);
const r=await p.evaluate(()=>[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt})).filter(x=>/store_/.test(x.src)));
console.log(JSON.stringify(r));await b.close();})();
