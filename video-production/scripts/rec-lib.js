const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const INJECT = fs.readFileSync(path.join(__dirname, 'vt-inject.js'), 'utf8');
const FPS = 30, DT = 1000 / FPS;
class Rec {
  async init() {
    this.b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-smooth-scrolling'] });
    this.ctx = await this.b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await this.ctx.addInitScript(() => { try { sessionStorage.setItem('parallax-x-intro-seen','1'); } catch(e){} });
    await this.ctx.addInitScript(INJECT);
    this.p = await this.ctx.newPage();
    this.p.on('pageerror', e => console.log('pageerror', String(e).slice(0, 300)));
    this.cdp = await this.ctx.newCDPSession(this.p);
    await this.cdp.send('Animation.enable');
    await this.cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    this.mx = 960; this.my = 540; this.dir = null; this.n = 0;
    return this;
  }
  shot(name) { this.dir = path.join(__dirname, '..', 'src', 'capture', name); fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir, { recursive: true }); this.n = 0; console.log('== shot', name); }
  async adv(ms = DT) { return this.p.evaluate((ms) => window.__vt.advance(ms), ms); }
  async frame() {
    await this.adv(DT);
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true });
    fs.writeFileSync(path.join(this.dir, String(this.n++).padStart(5, '0') + '.jpg'), Buffer.from(data, 'base64'));
  }
  async rec(n, each) { for (let i = 0; i < n; i++) { if (each) await each(i, n); await this.frame(); } }
  async cursor(on) { await this.p.evaluate((on) => { window.__vtCursorOn = on; const c = document.getElementById('__vtcursor'); if (c) c.style.display = on ? 'block' : 'none'; }, on); await this.p.mouse.move(this.mx, this.my); }
  async moveTo(x, y, n = 20, opts = {}) {
    const x0 = this.mx, y0 = this.my;
    for (let i = 1; i <= n; i++) {
      const t = i / n, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.mx = x0 + (x - x0) * e; this.my = y0 + (y - y0) * e;
      await this.p.mouse.move(this.mx, this.my);
      if (opts.record === false) await this.adv(DT); else await this.frame();
    }
  }
  async moveToEl(loc, n = 20, dx = 0.5, dy = 0.5) { const bb = await loc.boundingBox(); if (!bb) throw new Error('no bbox'); await this.moveTo(bb.x + bb.width * dx, bb.y + bb.height * dy, n); }
  async click(after = 4) { await this.p.mouse.down(); await this.frame(); await this.frame(); await this.p.mouse.up(); await this.rec(after); }
  async free(ms, step = 100) { for (let t = 0; t < ms; t += step) await this.adv(step); }
  async until(fn, maxMs = 60000, step = 100) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await this.p.evaluate(fn)) return true; await this.adv(step); await this.p.waitForTimeout(50); } console.log('until timeout'); return false; }
  async close() { await this.b.close(); }
}
module.exports = { Rec, FPS, DT };
