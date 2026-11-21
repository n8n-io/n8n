const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1600,height:2000}});
p.on('console',m=>console.log('console',m.text()));
await p.goto('http://127.0.0.1:8765/index.html');await p.waitForFunction(()=>window.done,null,{timeout:60000});console.log(await p.evaluate(()=>window.info));
await p.screenshot({path:process.argv[2]});await b.close();})();
