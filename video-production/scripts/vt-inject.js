// Virtual clock: page time only advances when the recorder calls __vt.advance(ms).
(() => {
  const realPerfNow = performance.now.bind(performance);
  const realDateNow = Date.now;
  const base = realPerfNow(), dateBase = realDateNow();
  let vt = base;
  let timers = new Map(); let tid = 1;
  let rafs = new Map(); let rid = 1;
  performance.now = () => vt;
  Date.now = () => dateBase + (vt - base);
  const RealDate = Date;
  window.setTimeout = (fn, ms = 0, ...args) => { const id = tid++; timers.set(id, { t: vt + Math.max(0, +ms || 0), fn, args, iv: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = tid++; const iv = Math.max(1, +ms || 1); timers.set(id, { t: vt + iv, fn, args, iv }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = rid++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  const call = (fn, args) => { try { typeof fn === 'function' ? fn(...(args||[])) : eval(fn); } catch (e) { console.error('vt cb error', e && e.stack || e); } };
  const runTimersUntil = (target) => {
    for (let guard = 0; guard < 100000; guard++) {
      let best = null, bestId = null;
      for (const [id, t] of timers) if (t.t <= target && (!best || t.t < best.t)) { best = t; bestId = id; }
      if (!best) break;
      vt = Math.max(vt, best.t);
      if (best.iv) best.t += best.iv; else timers.delete(bestId);
      call(best.fn, best.args);
    }
    vt = target;
  };
  window.__vt = {
    now: () => vt,
    advance(ms) {
      const target = vt + ms;
      runTimersUntil(target);
      // step web animations (CSS transitions/animations) by the same amount
      try {
        for (const a of document.getAnimations()) {
          if (!a.__vt) { a.__vt = true; try { a.pause(); } catch (e) {} }
          if (a.playState === 'finished') continue;
          try { a.currentTime = (a.currentTime || 0) + ms; } catch (e) {}
        }
      } catch (e) {}
      const cbs = [...rafs.values()]; rafs.clear();
      for (const cb of cbs) call(cb, [vt]);
      return vt;
    },
    pending: () => ({ timers: timers.size, rafs: rafs.size }),
  };
  // visible cursor (headless has none) — follows real mouse events
  const mk = () => {
    if (document.getElementById('__vtcursor')) return;
    const c = document.createElement('div'); c.id = '__vtcursor';
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2.5l15.5 9.2-6.9 1.4 3.9 7.3-2.6 1.4-3.9-7.4L4.9 19z" fill="#F4F6F8" stroke="#0b0d10" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.55));transition:none;display:none';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.display = window.__vtCursorOn ? 'block' : 'none'; c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', mk); else mk();
})();
