const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 400 } });
  const svg = fs.readFileSync(process.argv[2], 'utf8');
  await p.setContent(`<html><body style="margin:0;background:transparent"><div id="w" style="width:1200px;display:inline-block">${svg.replace('<svg', '<svg style="width:1200px;height:auto;display:block"')}</div></body></html>`);
  await p.locator('#w').screenshot({ path: process.argv[3], omitBackground: true }); await b.close();
})();
