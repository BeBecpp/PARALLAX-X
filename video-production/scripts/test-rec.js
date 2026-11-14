const { Rec } = require('./rec-lib');
(async () => {
  const r = await new Rec().init();
  await r.p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  await r.free(3000);
  await r.p.keyboard.press('Escape'); await r.free(1500);
  await r.cursor(true);
  r.shot('test');
  const t0 = Date.now();
  const card = r.p.locator('[role=radiogroup][aria-label="Mars scene"] >> text=CTX Yardang Study').first();
  await r.rec(10);
  await r.moveToEl(card, 24);
  await r.click(30);
  console.log('frames', r.n, 'sec', (Date.now() - t0) / 1000);
  await r.close();
})();
