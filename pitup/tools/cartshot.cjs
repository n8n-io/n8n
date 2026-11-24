const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'fr-FR'});
const p=await c.newPage();
await p.goto('https://www.pi-tup.com/shopping',{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(2000);
const btn=p.locator('button:has-text("Panier")').first();await btn.click().catch(e=>console.log('click fail',e.message.slice(0,80)));
await p.waitForTimeout(2500);await p.screenshot({path:'prod/app/after_panier.png'});console.log('url1',p.url());
const txt=await p.evaluate(()=>document.body.innerText.slice(0,1500));console.log(txt);
await b.close();})();
