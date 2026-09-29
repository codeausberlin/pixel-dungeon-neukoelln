// Kiez-Banner: replaces the English lettering "Boss Slain" and "Game Over" in
// interfaces/banners.png with German pixel lettering ("BOSS BESIEGT", "AUS DIE MAUS").
// Pure Node (zlib via tools/lib/tileset-kit.cjs), deterministic, original font drawn here.
//
//   node tools/generate-kiez-banners.cjs                 write interfaces/banners.png
//   node tools/generate-kiez-banners.cjs --preview DIR   also write an x4 preview
//
// Contract (effects/BannerSprites.java, read-only): the frames stay where they are,
//   BOSS_SLAIN = uvRect(0, 157, 127, 225)   -> x 0..126, y 157..224 (127x68)
//   GAME_OVER  = uvRect(128, 157, 256, 192) -> x 128..255, y 157..191 (128x35)
// Only these two rectangles are cleared and redrawn; every other pixel of the atlas (the
// unused upstream title frames) is copied unchanged from the upstream file in git. The
// banner fade/glow is done in code (Banner.show with a colour), so nothing else changes.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const BANNERS = 'core/src/main/assets/interfaces/banners.png';
const UPSTREAM_REV = 'e87a4a7';
const argv = process.argv.slice(2);

// ---------------------------------------------------------------- font (18 px tall, stroke 3)
// Each glyph: list of [row pattern, repeat count]; '#' = ink.
const R = (...parts) => parts.flatMap(([p, n = 1]) => Array(n).fill(p));
const GLYPHS = {
  A: R(['..######..'], ['.########.'], ['###....###', 6], ['##########', 2], ['###....###', 8]),
  B: R(['########..'], ['#########.'], ['###....###', 5], ['#########.'], ['#########.'], ['###....###', 7], ['##########'], ['#########.']),
  D: R(['########..'], ['#########.'], ['###....###', 14], ['#########.'], ['########..']),
  E: R(['##########', 2], ['###.......', 6], ['########..', 2], ['###.......', 6], ['##########', 2]),
  G: R(['..#######.'], ['.#########'], ['###.......', 6], ['###..#####', 2], ['###....###', 6], ['.#########'], ['..#######.']),
  I: R(['#######', 2], ['..###..', 14], ['#######', 2]),
  M: R(['####....####'], ['#####..#####'], ['############', 2], ['###.####.###'], ['###..##..###'], ['###......###', 12]),
  O: R(['..######..'], ['.########.'], ['###....###', 14], ['.########.'], ['..######..']),
  S: R(['..########'], ['.#########'], ['###.......', 5], ['.########.'], ['..########'], ['.......###', 7], ['#########.'], ['########..']),
  T: R(['##########', 2], ['...####...', 16]),
  U: R(['###....###', 16], ['.########.'], ['..######..']),
};
const GH = 18;
for (const [k, g] of Object.entries(GLYPHS)) if (g.length !== GH || g.some(r => r.length !== g[0].length)) throw new Error('bad glyph ' + k);

// text -> ink mask
function textMask(text, gap, space) {
  const cols = [];
  [...text].forEach((ch, i) => {
    if (ch === ' ') { for (let s = 0; s < space; s++) cols.push(Array(GH).fill(false)); return; }
    const g = GLYPHS[ch]; if (!g) throw new Error('no glyph ' + ch);
    if (i && text[i - 1] !== ' ') for (let s = 0; s < gap; s++) cols.push(Array(GH).fill(false));
    for (let x = 0; x < g[0].length; x++) cols.push(g.map(r => r[x] === '#'));
  });
  return {w: cols.length, h: GH, at: (x, y) => x >= 0 && y >= 0 && x < cols.length && y < GH && cols[x][y]};
}

// ---------------------------------------------------------------- canvas
const C = {
  hi: 'dfe8c8', top: 'bcc7a4', mid: '9aa682', low: '76825e', deep: '5c6648',
  outline: '1c2016', shadow: '0e1009',
  capHi: 'fff09a', cap: 'f0c030', capDark: 'a87a10', capRed: 'c83030', capRedHi: 'ee6a50',
  mouse: 'a6a2a8', mouseDark: '747078', pink: 'f0a0b0', eye: '1a1a1a',
};
function layer(w, h) { return {w, h, px: Array.from({length: h}, () => Array(w).fill(null))}; }
function stampMask(L, mask, ox, oy, paint) {
  for (let y = 0; y < mask.h; y++) for (let x = 0; x < mask.w; x++) if (mask.at(x, y)) L.px[oy + y][ox + x] = paint(x, y, mask);
}
// letter shading: vertical ramp, lit top edge, darker lower right edge
function letterPaint(x, y, m) {
  if (!m.at(x, y - 1)) return C.hi;
  if (!m.at(x + 1, y) || !m.at(x, y + 1)) return C.deep;
  return y < 6 ? C.top : y < 12 ? C.mid : C.low;
}
// outline around everything drawn so far (8-neighbourhood), then drop shadow (+1,+2)
function finish(L) {
  const inked = (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.px[y][x];
  const add = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (L.px[y][x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inked(x + dx, y + dy) && L.px[y + dy][x + dx] !== C.outline) { add.push([x, y]); dy = dx = 2; }
  }
  for (const [x, y] of add) L.px[y][x] = C.outline;
  const sh = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.px[y][x] && x + 1 < L.w && y + 2 < L.h && !L.px[y + 2][x + 1]) sh.push([x + 1, y + 2]);
  for (const [x, y] of sh) if (!L.px[y][x]) L.px[y][x] = C.shadow;
  return L;
}
// crimped bottle cap (Kronkorken), 13x13
function cap(L, ox, oy) {
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
    const dx = x - 6, dy = y - 6, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    let c = null;
    if (d <= 3.6) c = (dx + dy < -2) ? C.capRedHi : C.capRed;
    else if (d <= 4.6) c = (dx + dy < -1) ? C.capHi : C.cap;
    else if (d <= 6.4 && Math.cos(a * 11) > -0.2) c = (dx + dy < -2) ? C.cap : C.capDark;
    if (c) L.px[oy + y][ox + x] = c;
  }
}
// small mouse sitting on the lettering ("Aus die Maus"), 10x6
const MOUSE = [
  '......GG..',
  '.....GPGG.',
  '..GGGGGGKG',
  '.GGGGGGGGP',
  'G.GGGGGGG.',
  '.G..g..g..',
];
function mouse(L, ox, oy) {
  MOUSE.forEach((r, y) => [...r].forEach((ch, x) => {
    const c = {G: C.mouse, g: C.mouseDark, P: C.pink, K: C.eye}[ch]; if (c) L.px[oy + y][ox + x] = c;
  }));
}

// ---------------------------------------------------------------- compose
function bossSlain() {
  const L = layer(127, 68);
  const boss = textMask('BOSS', 2, 6), besiegt = textMask('BESIEGT', 2, 6);
  const blockH = GH * 2 + 6, top = Math.floor((68 - blockH - 3) / 2) + 1;
  const bx = Math.floor((127 - boss.w) / 2), ex = Math.floor((127 - besiegt.w) / 2);
  stampMask(L, boss, bx, top, letterPaint);
  stampMask(L, besiegt, ex, top + GH + 6, letterPaint);
  cap(L, bx - 13 - 6, top + 2);
  cap(L, bx + boss.w + 6, top + 2);
  return finish(L);
}
function gameOver() {
  const L = layer(128, 35);
  const t = textMask('AUS DIE MAUS', 1, 5);
  const x0 = Math.floor((128 - t.w - 1) / 2), y0 = 35 - GH - 4;
  stampMask(L, t, x0, y0, letterPaint);
  // the mouse sits on the M of MAUS
  const mX = x0 + textMask('AUS DIE ', 1, 5).w + 1;
  mouse(L, mX + 1, y0 - 6);
  return finish(L);
}

function main() {
  const src = decodePNG(execFileSync('git', ['-C', ROOT, 'show', UPSTREAM_REV + ':' + BANNERS], {maxBuffer: 1 << 26}));
  if (src.w !== 512 || src.h !== 256) throw new Error('banners.png must be 512x256');
  const out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const blit = (L, ox, oy) => {
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const i = ((oy + y) * out.w + ox + x) * 4, c = L.px[y][x];
      if (c) { const v = rgb(c); out.px[i] = v[0]; out.px[i + 1] = v[1]; out.px[i + 2] = v[2]; out.px[i + 3] = 255; }
      else out.px.fill(0, i, i + 4);
    }
  };
  blit(bossSlain(), 0, 157);
  blit(gameOver(), 128, 157);
  fs.writeFileSync(path.join(ROOT, BANNERS), encodePNG(out));
  console.log('wrote ' + BANNERS + ' (BOSS_SLAIN, GAME_OVER)');
  const pi = argv.indexOf('--preview');
  if (pi >= 0) {
    const dir = argv[pi + 1]; fs.mkdirSync(dir, {recursive: true});
    const S = 4, x0 = 0, y0 = 150, W = 260, H = 80, px = Buffer.alloc(W * S * H * S * 4);
    for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) {
      const sx = x0 + (x / S | 0), sy = y0 + (y / S | 0), i = (sy * out.w + sx) * 4, a = out.px[i + 3] / 255, j = (y * W * S + x) * 4;
      const bg = [40, 36, 48];
      for (let k = 0; k < 3; k++) px[j + k] = Math.round(out.px[i + k] * a + bg[k] * (1 - a)); px[j + 3] = 255;
    }
    fs.writeFileSync(path.join(dir, 'kiez-banners-x4.png'), encodePNG({w: W * S, h: H * S, px}));
    console.log('preview in ' + dir);
  }
}
main();
