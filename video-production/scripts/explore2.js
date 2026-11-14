const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('parallax-x-intro-seen','1'); } catch(e){} });
  const p = await ctx.newPage();
  await p.goto('https://parallax-x-lyart.vercel.app/', { waitUntil: 'networkidle' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  await p.locator('[role=radiogroup][aria-label="Mars scene"] >> text=CTX Yardang Study').first().click();
  await p.getByRole('button',{name:/^explore/i}).first().click();
  await p.waitForTimeout(10000);
  const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
  const btns = async () => console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button, [role=tab]')].filter(e=>e.offsetParent).map(e => (e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()).filter(Boolean))));
  await p.getByRole('button',{name:/^explore$/i}).click(); await p.waitForTimeout(6000); await shot('10_explore_tab'); await btns();
  await p.getByRole('button',{name:/^evidence$/i}).click(); await p.waitForTimeout(3000); await shot('11_evidence'); await btns();
  try { await p.getByText('4 · Does it work?').first().click(); await p.waitForTimeout(3000); await shot('12_doeswork'); } catch(e) { console.log('nodoes', e.message.slice(0,100)); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.getByRole('button',{name:/^compare$/i}).click(); await p.waitForTimeout(6000);
  await p.getByRole('button',{name:/PLAN A FIELD EXPERIMENT/i}).click(); await p.waitForTimeout(4000); await shot('13_lab'); await btns();
  await b.close();
})();
