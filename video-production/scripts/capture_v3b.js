// V3 captures at 1920x1080 CSS, DPR 1.5 (frames 2880x1620): F_w1 (Evidence W1 explainer + resolution paradox), G_lab (slow formula scroll)
const { Rec } = require('./rec-lib');
const has = (s) => new Function(`return document.body.innerText.toLowerCase().includes(${JSON.stringify(s.toLowerCase())})`);
(async () => {
  const r = await new Rec().init({ w: 1920, h: 1080, dpr: 1.5 }); const p = r.p;
  const T0 = Date.now(); const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(0) + 's', ...a);
  p.on('console', m => { const t = m.text(); if (t.includes('fps probe')) log('console', t); });
  await p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  await r.free(3000, 33.333); await p.keyboard.press('Escape'); await r.free(1500, 33.333);
  await p.locator('[role=radiogroup][aria-label="Mars scene"] >> text=CTX Yardang Study').first().click({ force: true }); await r.free(300, 16.667);
  await p.getByRole('button', { name: /^explore/i }).first().click({ force: true });
  for (let k = 0; k < 600; k++) { await r.adv(16.667); if (k % 20 === 0 && await p.evaluate(has('plan a field experiment'))) break; }
  await r.free(3500, 16.667); await p.waitForTimeout(1500); await r.free(500, 16.667);
  log('compare ready; toast?', await p.evaluate(has('rendering slowly')));
  r.clip = { x: 0, y: 0, width: 1920, height: 1080 };
  const click = async (loc) => { try { await loc.click({ force: true, timeout: 8000 }); } catch (e) { await loc.evaluate(el => el.click()); } };
  // ---------------- F: Evidence -> W1 explainer ----------------
  await click(p.getByRole('button', { name: /^evidence$/i }).first()); await r.free(1500, 33.333); await p.waitForTimeout(800);
  await click(p.getByText('2 · How did we compare fairly?').first()); await r.free(1500, 33.333); await p.waitForTimeout(800);
  await p.getByText(/W1, step by step/).first().evaluate(el => el.closest('div.rounded-\\[12px\\]')?.scrollIntoView({ block: 'center' }) || el.scrollIntoView({ block: 'center' }));
  await r.free(800, 33.333); await p.waitForTimeout(500);
  const featBtn = (k) => p.locator('[role=radiogroup][aria-label="Terrain feature"] [role=radio]').nth(k);
  log('feature radios', await p.locator('[role=radiogroup][aria-label="Terrain feature"] [role=radio]').count(), 'scenes', JSON.stringify(await p.locator('[role=radiogroup][aria-label="Earth window"] [role=radio]').allInnerTexts()));
  await click(p.locator('[role=radiogroup][aria-label="Earth window"] [role=radio]').first()); await r.free(3000, 33.333);
  r.mx = 1500; r.my = 700; await r.cursor(true);
  r.shot('F_w1g');
  await r.rec(6);
  for (const k of [0, 1, 4]) { const fb = await featBtn(k).boundingBox(); await r.moveTo(fb.x + fb.width / 2, fb.y + fb.height / 2, 12); await r.click(0); await r.rec(76); }
  log('F frames', r.n);
  await r.cursor(false);
  // ---------------- G: Expedition Lab with slow scroll to KEY MEASUREMENTS ----------------
  await p.keyboard.press('Escape'); await r.free(1500, 33.333); await p.waitForTimeout(1000); await r.free(800, 33.333);
  if (!(await p.evaluate(has('plan a field experiment')))) { await click(p.getByRole('button', { name: /^compare$/i }).first()); await r.free(3000, 33.333); await p.waitForTimeout(2000); }
  r.mx = 1500; r.my = 330; await r.cursor(true);
  r.shot('G_lab2');
  const plan = p.getByRole('button', { name: /plan a field experiment/i }).first();
  await r.rec(6); await r.moveToEl(plan, 18); await r.rec(4); await r.click(0);
  await r.rec(45);
  await r.moveTo(1690, 640, 18);
  const aside = p.locator('aside[aria-label="Field-test protocol"]');
  const scrollTo = async (re, targetY) => {
    const el = aside.getByText(re).first(); const bb = await el.boundingBox(); if (!bb) { log('no bbox', String(re)); return; }
    let delta = bb.y - targetY; const n = Math.max(1, Math.round(Math.abs(delta) / 9));
    for (let i = 0; i < n; i++) { await p.mouse.wheel(0, delta / n); await r.frame(); }
    log('scrolled to', String(re), 'frames', n, 'at', r.n);
  };
  await scrollTo(/^Resolution check/, 470); await r.rec(80);
  await scrollTo(/what this test must measure/i, 250); await r.rec(70);
  await scrollTo(/key measurements/i, 230); await r.rec(110);
  log('G frames', r.n);
  await r.close(); log('done');
})();
