// E_rover: authentic Simulate-mode capture of the real app rover on the HiRISE scene (virtual clock, 30 fps).
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
  for (let k = 0; k < 900; k++) { await r.adv(16.667); if (k % 30 === 0 && await p.evaluate(has('mission simulation'))) break; }
  log('explore visible'); await r.free(3200, 16.667); log('probed');
  await r.cursor(false);
  const btn = (re) => p.getByRole('button', { name: re }).first();
  const radio = (re) => p.getByRole('radio', { name: re }).first();
  const clickAny = async (re) => { for (const l of [btn(re), radio(re)]) { if (await l.count() && await l.isVisible().catch(() => false)) { try { await l.click({ force: true, timeout: 8000 }); } catch (e) { log('force-click failed, DOM click', String(re)); await l.evaluate(el => el.click()); } return true; } } log('NOT FOUND', String(re)); return false; };
  await clickAny(/^simulate$/i); await r.free(2500, 33.333); await p.waitForTimeout(2000); await r.free(1000, 33.333);
  log('simulate; rover?', await p.evaluate(has('illustrative terrain-following')));
  await clickAny(/start demonstration loop/i); await r.free(600, 33.333);
  log('after start buttons', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button,[role=radio]')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60))));
  // pause, seek just before the first point of interest, wide orbit view
  await clickAny(/^pause/i); await r.free(300, 33.333);
  const seek = p.getByRole('slider', { name: /demonstration loop position/i }).first();
  const bb = await seek.boundingBox(); await p.mouse.click(bb.x + bb.width * 0.19, bb.y + bb.height / 2); await r.free(400, 33.333);
  await clickAny(/^orbit$/i); await r.free(2600, 33.333);
  // full-viewport reference screenshot (for framing decisions)
  { const { data } = await r.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }); fs.writeFileSync(__dirname + '/../frames/rover_prep_full.jpg', Buffer.from(data, 'base64')); }
  const cv = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].map(c => c.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height)[0]; return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  log('canvas', JSON.stringify(cv));
  r.clip = { x: cv.x, y: 150, width: cv.width, height: 750 };
  r.shot('E_rover');
  const t1 = Date.now();
  await clickAny(/^resume|^play/i); await r.rec(8); log('ms/frame', (Date.now() - t1) / 8);
  await clickAny(/^follow$/i); await r.rec(52); log('follow done', r.n);
  await clickAny(/^close-up$/i); await r.rec(150); log('closeup', r.n, 'poi?', await p.evaluate(has('point of interest')));
  await r.rec(40);
  await clickAny(/^follow$/i); await r.rec(80); log('E frames', r.n);
  fs.writeFileSync(__dirname + '/../src/capture/E_rover/clip.json', JSON.stringify({ clip: cv, dpr: 1.5, viewport: [2560, 1440] }));
  await r.close(); log('done');
})();
