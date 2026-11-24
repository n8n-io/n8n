const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message,e.stack.split('\n').slice(0,3).join(' | ')));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.addInitScript(()=>{window.__timelines={}});await p.goto('file://'+process.argv[2]);await p.waitForTimeout(1500);console.log('timelines',await p.evaluate(()=>Object.keys(window.__timelines||{})));await b.close();})();
