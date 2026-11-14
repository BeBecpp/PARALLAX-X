const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => { if (m.type()==='error') console.log('console:', m.text().slice(0,200)); });
  const t0 = Date.now();
  await p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  console.log('loaded', Date.now()-t0);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: process.argv[2] + '/probe_0.png' });
  const gl = await p.evaluate(() => { const c=document.createElement('canvas'); const g=c.getContext('webgl2'); if(!g) return 'nogl'; const d=g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d?d.UNMASKED_RENDERER_WEBGL:g.RENDERER); });
  console.log('gl', gl);
  const txt = await p.evaluate(() => document.body.innerText.slice(0,1500));
  console.log(txt);
  await b.close();
})();
