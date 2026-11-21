const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'fr-FR'});
const p=await c.newPage();
for (const [n,u] of [['login','https://www.pi-tup.com/login'],['register','https://www.pi-tup.com/register']]){
await p.goto(u,{waitUntil:'networkidle',timeout:45000});await p.waitForTimeout(2000);await p.screenshot({path:`prod/app/${n}.png`});
console.log('==',n,p.url());console.log(await p.evaluate(()=>document.body.innerText.slice(0,900)));}
await b.close();})();
