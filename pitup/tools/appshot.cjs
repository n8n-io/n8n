const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:'fr-FR',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const p=await c.newPage();
for (const [n,u] of [['home','https://www.pi-tup.com/'],['market','https://www.pi-tup.com/marketplace'],['shopping','https://www.pi-tup.com/shopping'],['product','https://www.pi-tup.com/marketplace/product/f88751a3-60cf-41d2-ad35-4ece8180aaa5'],['store','https://www.pi-tup.com/marketplace/store/5b62ce17-a9c2-4aff-938a-056f4d426764']]){
 try{await p.goto(u,{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(2500);await p.screenshot({path:`prod/app/${n}.png`});console.log('ok',n,await p.title());}catch(e){console.log('fail',n,e.message.slice(0,100))}}
await b.close();})();
