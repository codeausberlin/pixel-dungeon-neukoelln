// Rendert jede <section class="slide"> aus carousel.html als PNG (1080x1350) nach ../folien/.
//
//   python3 docs/presse/instagram/2026-10-06-carousel/quelle/assets-vorbereiten.py
//   node docs/presse/instagram/2026-10-06-carousel/quelle/render.cjs
//
// Braucht Playwright mit Chromium und die Schrift Inter im System. Meldet Folien, auf denen sich
// Textblöcke, Bilder und der Weiter-Pfeil überlappen oder über den Rand laufen.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const HIER = __dirname;
const OUT = path.join(HIER, '..', 'folien');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(HIER, 'carousel.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');

  const probleme = await page.evaluate(() => {
    const out = [];
    for (const s of document.querySelectorAll('.slide')) {
      const sr = s.getBoundingClientRect();
      // Belegte Fläche je Teil: Textzeilen, Bilder und Kästen mit Rahmen oder Hintergrund, nicht die volle Blockbreite.
      const teile = [...s.querySelectorAll(':scope > .block, :scope > img, :scope > .weiter')].map(e => {
        const rects = [];
        for (const k of [e, ...e.querySelectorAll('*')]) {
          const cs = getComputedStyle(k);
          if (k.tagName === 'IMG' || cs.borderTopWidth !== '0px' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') rects.push(k.getBoundingClientRect());
        }
        const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          if (!w.currentNode.textContent.trim()) continue;
          const r = document.createRange(); r.selectNodeContents(w.currentNode);
          rects.push(...r.getClientRects());
        }
        return { name: e.className || e.tagName, rects, b: Math.max(...rects.map(r => r.bottom)), r: Math.max(...rects.map(r => r.right)) };
      });
      for (const t of teile) {
        if (t.b > sr.bottom - 30 || t.r > sr.right) out.push(`${s.id}: ${t.name} läuft über den Rand (unten ${Math.round(t.b - sr.top)})`);
      }
      const schneidet = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      for (let i = 0; i < teile.length; i++) for (let j = i + 1; j < teile.length; j++) {
        if (teile[i].rects.some(a => teile[j].rects.some(b => schneidet(a, b)))) out.push(`${s.id}: ${teile[i].name} überlappt ${teile[j].name}`);
      }
    }
    return out;
  });

  for (const id of await page.$$eval('.slide', ns => ns.map(n => n.id))) {
    await page.locator(`[id="${id}"]`).screenshot({ path: path.join(OUT, id + '.png') });
    console.log('folien/' + id + '.png');
  }
  await browser.close();
  if (probleme.length) { console.log('\nLayout-Probleme:\n' + probleme.join('\n')); process.exitCode = 1; }
})();
