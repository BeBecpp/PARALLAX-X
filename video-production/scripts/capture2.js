const { Rec } = require('./rec-lib');
const has = (s) => new Function(`return document.body.innerText.toLowerCase().includes(${JSON.stringify(s.toLowerCase())})`);
(async () => {
  const r = await new Rec().init(); const p = r.p;
  const T0 = Date.now(); const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', ...a);
  await p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  await r.free(3000); await p.keyboard.press('Escape'); await r.free(2500);
  // warm-up: let rover model + textures load
  await r.until(() => true); await p.waitForTimeout(4000); await r.free(2000);
  r.mx = 760; r.my = 560; await r.cursor(true);
  p.on('console', m => { const t = m.text(); if (t.includes('PARALLAX X]')) log('console', t); });
  const ctxCard = p.locator('[role=radiogroup][aria-label="Mars scene"] >> text=CTX Yardang Study').first();
  await ctxCard.click(); await r.free(300, 16.667);
  await p.getByRole('button', { name: /^explore/i }).first().click();
  for (let k = 0; k < 400; k++) { await r.adv(16.667); if (k % 20 === 0 && await p.evaluate(has('plan a field experiment'))) break; }
  log('compare visible; probing');
  await r.free(4000, 16.667); await p.waitForTimeout(1500); await r.free(500, 16.667);
  log('slow toast?', await p.evaluate(has('rendering slowly')));
  // ---------- B: compare Mars CTX vs Gobi G-1 ----------
  r.shot('B_compare');
  r.mx = 760; r.my = 560; await p.mouse.move(r.mx, r.my);
  await r.rec(15);
  await r.moveTo(600, 430, 16);
  await p.mouse.down(); await r.moveTo(720, 445, 70); await p.mouse.up();
  await r.rec(10);
  const g1 = p.getByRole('button', { name: /Gobi G-1/ }).first();
  await r.moveToEl(g1, 24, 0.35, 0.5); await r.rec(12);
  await r.moveTo(r.mx + 10, r.my + 280, 45); await r.rec(10);
  log('B frames', r.n);
  // ---------- C: validation failed -> falsification reveal ----------
  r.shot('C_evidence');
  const vb = p.getByRole('button', { name: /validation: failed/i }).first();
  await r.moveToEl(vb, 22); await r.rec(4); await r.click(0);
  await r.rec(150);
  log('C text', (await p.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\s+/g, ' '));
  // scroll to stamp + resolution paradox
  await r.moveTo(1100, 700, 12);
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, 9); await r.frame(); }
  await r.rec(110);
  log('C frames', r.n);
  // ---------- D: Expedition Lab ----------
  await p.keyboard.press('Escape'); await r.free(1500, 33.333); await p.waitForTimeout(1500); await r.free(500, 33.333);
  if (!(await p.evaluate(has('plan a field experiment')))) { await p.getByRole('button', { name: /^compare$/i }).click(); await r.free(3000, 33.333); await p.waitForTimeout(3000); }
  r.shot('D_lab');
  const plan = p.getByRole('button', { name: /plan a field experiment/i }).first();
  r.mx = 1500; r.my = 330; await p.mouse.move(r.mx, r.my);
  await r.rec(8);
  await r.moveToEl(plan, 20); await r.rec(5); await r.click(0);
  await r.rec(70);
  // look at "what we still don't know" on the left
  await r.moveTo(250, 930, 26); await r.rec(30);
  // scroll the protocol panel
  await r.moveTo(1680, 700, 24);
  for (let i = 0; i < 110; i++) { await p.mouse.wheel(0, 12); await r.frame(); }
  await r.rec(40);
  log('D frames', r.n);
  await r.close(); log('done');
})();
