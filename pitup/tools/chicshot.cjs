const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'fr-FR'});
const p=await c.newPage();
await p.goto('https://www.pi-tup.com/marketplace',{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(2000);
await p.screenshot({path:'prod/app/m1_marche.png'});
const inp=p.locator('input[placeholder*="echercher"]').first();
await inp.fill('chic business');await p.waitForTimeout(3000);
await p.screenshot({path:'prod/app/m2_search.png'});
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,1200));
await p.evaluate(()=>window.scrollBy(0,500));await p.waitForTimeout(1500);await p.screenshot({path:'prod/app/m3_scroll.png'});
const link=p.locator('a[href*="/marketplace/store/"]').first();
console.log('links',await p.locator('a[href*="/marketplace/store/"]').count());
const href=await link.getAttribute('href').catch(()=>null);console.log('href',href);
if(href){await p.goto(new URL(href,'https://www.pi-tup.com').href,{waitUntil:'networkidle'});await p.waitForTimeout(2500);await p.screenshot({path:'prod/app/m4_store.png'});
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,1500));
await p.evaluate(()=>window.scrollBy(0,700));await p.waitForTimeout(1500);await p.screenshot({path:'prod/app/m5_store_scroll.png'});}
await b.close();})();
