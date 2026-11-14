const { Rec } = require('./rec-lib');
const fs = require('fs');
const has = (s) => new Function(`return document.body.innerText.toLowerCase().includes(${JSON.stringify(s.toLowerCase())})`);
(async () => {
  const r = await new Rec().init({ w: 2560, h: 1440, dpr: 1.5 }); const p = r.p;
  const T0 = Date.now(); const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', ...a);
  p.on('console', m => { const t = m.text(); if (t.includes('PARALLAX X]')) log('console', t); });
  await p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  await r.free(3000, 33.333); await p.keyboard.press('Escape'); await r.free(1500, 33.333);
  await p.getByRole('button', { name: /^explore/i }).first().click();
  for (let k = 0; k < 600; k++) { await r.adv(16.667); if (k % 30 === 0 && await p.evaluate(has('mission simulation'))) break; }
  log('explore visible');
  await r.free(5000, 16.667); log('probed');
  r.shot('probe_rover');
  const t1 = Date.now(); await r.rec(3); log('ms/frame', (Date.now() - t1) / 3);
  const vp = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].map(c => { const b = c.getBoundingClientRect(); return [b.x, b.y, b.width, b.height, c.width, c.height]; }); return c; });
  log('canvases', JSON.stringify(vp));
  await r.free(4000, 33.333); await r.rec(1);
  await p.getByRole('button', { name: /^close-up$/i }).first().click(); await r.free(2500, 33.333); await r.rec(1);
  await p.getByRole('button', { name: /start demonstration loop/i }).first().click(); await r.free(3000, 33.333); await r.rec(1);
  await p.getByRole('button', { name: /^follow$/i }).first().click(); await r.free(2500, 33.333); await r.rec(1);
  log('buttons', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent).map(e => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 80))));
  await r.close(); log('done');
})();
