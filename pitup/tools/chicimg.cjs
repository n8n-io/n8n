const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,locale:'fr-FR'});
const p=await c.newPage();
await p.goto('https://www.pi-tup.com/marketplace/store/b6fc0277-73d4-4fa0-9ef4-9362e16a1a67',{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(2500);
const imgs=await p.evaluate(()=>[...document.images].map(i=>({src:i.currentSrc||i.src,w:i.naturalWidth,h:i.naturalHeight,alt:i.alt})));console.log(JSON.stringify(imgs.slice(0,12)));
await p.getByText('Mini ventilateur').first().click();await p.waitForTimeout(3000);console.log('url',p.url());
const pimgs=await p.evaluate(()=>[...document.images].map(i=>({src:i.currentSrc||i.src,w:i.naturalWidth,h:i.naturalHeight})));console.log(JSON.stringify(pimgs.slice(0,10)));
console.log((await p.evaluate(()=>document.body.innerText)).slice(0,900));
await b.close();})();
