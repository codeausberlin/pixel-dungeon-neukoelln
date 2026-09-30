// App icon: the crooked, weathered Ortsschild "PIXEL DUNGEON / NEUKÖLLN" in front of the grey
// Berlin skyline, same pixel language as the title logo (tools/generate-neukoelln-title.cjs,
// which provides canvas, palette, fonts and skyline). Replaces the Altbau icons of
// tools/generate-kiez-icons.cjs; run this one after it if both are run.
//
// Usage: node tools/generate-kiez-appicon.cjs [--preview DIR]
//
// Masters (drawn pixel by pixel, only scaled by whole numbers except where noted):
//   M64  rounded tile 56x56 with the sign overhanging it: desktop 64/128/256, macOS up to
//        1024, press kit 256/512
//   M32, M16  simplified sign for small sizes (lettering becomes bars)
//   Android adaptive icon on the 108 dp grid: background (sky + skyline), foreground (sign
//        inside the 66 dp safe circle), monochrome (sign as mask); mdpi x1, hdpi x1.5
//        (nearest), xhdpi x2, xxhdpi x3, xxxhdpi x4
//   Android legacy ic_launcher (36..192): area-averaged from M64 x8, only used below Android 8
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const T = require('./generate-neukoelln-title.cjs');
const { Canvas, C, hex, rng, FONT, text, skyline, post, png } = T;

const ROOT = path.resolve(__dirname, '..');

// 3x5 capitals for the small top line.
const F3 = {
  P: ['110', '101', '110', '100', '100'], I: ['111', '010', '010', '010', '111'],
  X: ['101', '101', '010', '101', '101'], E: ['111', '100', '110', '100', '111'],
  L: ['100', '100', '100', '100', '111'], D: ['110', '101', '101', '101', '110'],
  U: ['101', '101', '101', '101', '111'], N: ['110', '101', '101', '101', '101'],
  G: ['011', '100', '101', '101', '011'], O: ['010', '101', '101', '101', '010'],
  ' ': ['00', '00', '00', '00', '00'],
};
function text3(cv, s, x, y, c) {
  let cx = x;
  for (const ch of s) { F3[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') cv.set(cx + i, y + j, c); })); cx += F3[ch][0].length + 1; }
  return cx - x - 1;
}
const text3W = s => [...s].reduce((a, ch) => a + F3[ch][0].length + 1, 0) - 1;

// Sign for M64 and the adaptive icon: 58x24.
function iconSign(seed) {
  const r = rng(seed), W = 58, H = 24, s = new Canvas(W, H);
  s.rect(0, 0, W, H, C.y);
  for (let x = 0; x < W; x++) { s.set(x, 0, C.yl); s.set(x, H - 1, C.yd); }
  for (let y = 0; y < H; y++) { s.set(0, y, C.yl); s.set(W - 1, y, C.yd); }
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) s.set(x, y, null);
  for (let x = 2; x < W - 2; x++) { s.set(x, 2, C.ink); s.set(x, H - 3, C.ink); }
  for (let y = 2; y < H - 2; y++) { s.set(2, y, C.ink); s.set(W - 3, y, C.ink); }
  const top = 'PIXEL DUNGEON';
  text3(s, top, Math.floor((W - text3W(top)) / 2), 4, C.ink);
  const name = 'NEUKOLLN', bx = Math.floor((W - 47) / 2), by = 13;
  text(s, name, bx, by, 1, C.ink);
  s.cell = { x0: bx, w: 6, n: 8 };
  s.set(bx + 24 + 1, by - 2, C.ink); s.set(bx + 24 + 3, by - 2, C.ink);
  // Grime towards the bottom, never on the lettering.
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (s.get(x, y) !== C.y) continue;
    const p = Math.max(0, (y - H * 0.4) / H) * 0.8 + 0.03, v = r();
    if (v < p * 0.3) s.set(x, y, C.ydd); else if (v < p) s.set(x, y, C.yd);
  }
  // Bolts with rust streaks.
  for (const b of [15, 42]) { s.set(b, 1, C.metal); s.set(b, 2, C.rust); s.set(b, 3, C.rustl); }
  // Rust on the edges.
  for (const [x, y, c] of [[0, 9, C.rust], [0, 10, C.rustl], [1, 10, C.rust], [W - 1, 5, C.rust], [W - 2, 6, C.rustl], [30, H - 1, C.rust], [31, H - 1, C.rustl], [22, 0, C.rust]]) if (s.get(x, y)) s.set(x, y, c);
  // Broken-off corner, bottom right.
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4 - j; i++) s.set(W - 1 - i, H - 1 - j, null);
  for (let j = 0; j < 4; j++) if (s.get(W - 5 + j, H - 1 - j)) s.set(W - 5 + j, H - 1 - j, C.metal);
  // Moss creeping up from the bottom left.
  const moss = [3, 2, 3, 2, 2, 1, 2, 1, 1, 0, 1, 1, 0, 0, 1];
  moss.forEach((h, x) => { for (let k = 0; k < h; k++) if (s.get(x, H - 1 - k)) s.set(x, H - 1 - k, k === h - 1 ? C.mossl : C.moss); });
  // Cobweb in the top left corner.
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [3, 3], [4, 2], [2, 4]]) if (s.get(x, y) !== C.ink) s.set(x, y, C.web);
  return s;
}

// Tilted blit (same vertical shear as the title logo, 1 px step per 25 columns) with a shadow.
function blit(dst, sign, ox, oy, shadow = true) {
  const dy = T.signDy(sign);
  if (shadow) for (let x = 0; x < sign.w; x++) for (let y = 0; y < sign.h; y++)
    if (sign.get(x, y) && !sign.get(x - 1, y - 1)) dst.set(ox + x + 1, oy + y + dy(x) + 1, C.iron);
  for (let x = 0; x < sign.w; x++) for (let y = 0; y < sign.h; y++) { const c = sign.get(x, y); if (c) dst.set(ox + x, oy + y + dy(x), c); }
  return dy;
}

function sky(cv, x0, y0, w, h) {
  const top = hex('0d0c12'), bot = hex('1d1c25');
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1), band = Math.floor(t * 4), frac = t * 4 - band;
    for (let x = 0; x < w; x++) {
      const b = Math.min(4, band + ((frac > 0.5 && (x + y) % 2 === 0) ? 1 : 0)) / 4;
      cv.set(x0 + x, y0 + y, top.map((v, n) => Math.round(v + (bot[n] - v) * b)));
    }
  }
}

// Rounded tile mask: corner radius in pixels, stepped.
function inTile(x, y, x0, y0, n, rad) {
  if (x < x0 || y < y0 || x >= x0 + n || y >= y0 + n) return false;
  const cx = Math.min(Math.max(x, x0 + rad), x0 + n - 1 - rad), cy = Math.min(Math.max(y, y0 + rad), y0 + n - 1 - rad);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= rad * rad + rad * 0.6;
}
function tileBackground(n, t0, tn, rad, seed, scene) {
  const scn = new Canvas(tn, tn);
  sky(scn, 0, 0, tn, tn);
  scene(scn);
  const cv = new Canvas(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!inTile(x, y, t0, t0, tn, rad)) continue;
    const edge = !inTile(x - 1, y, t0, t0, tn, rad) || !inTile(x + 1, y, t0, t0, tn, rad) || !inTile(x, y - 1, t0, t0, tn, rad) || !inTile(x, y + 1, t0, t0, tn, rad);
    cv.set(x, y, edge ? hex('0b0a0e') : scn.get(x - t0, y - t0));
  }
  return cv;
}

// ------------------------------------------------------------------ masters
// At icon size the title's skyline greys vanish in the sky; icons use a lighter grey set.
function iconGreys(fn) {
  const keep = { sky1: C.sky1, sky2: C.sky2, win: C.win };
  Object.assign(C, { sky1: hex('3a3b46'), sky2: hex('2a2b34'), win: hex('4d4e5b') });
  try { return fn(); } finally { Object.assign(C, keep); }
}
function master64() {
  const cv = tileBackground(64, 4, 56, 9, 5, s => {
    skyline(s, 56, 31, { tx: 44, top: 2 }, { cx: 6, top: 7, arm: 16 });
    s.rect(0, 53, 56, 3, hex('18171d'));
  });
  // Posts run from under the sign to the bottom of the tile.
  post(cv, 13, 38, 58); post(cv, 47, 38, 58);
  blit(cv, iconSign(41), 3, 19);
  return cv;
}

function smallSign(W, H, lines) {
  const s = new Canvas(W, H);
  s.rect(0, 0, W, H, C.y);
  for (let x = 0; x < W; x++) s.set(x, H - 1, C.yd);
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) s.set(x, y, null);
  if (H >= 8) {
    for (let x = 1; x < W - 1; x++) { s.set(x, 1, C.ink); s.set(x, H - 2, C.ink); }
    for (let y = 1; y < H - 1; y++) { s.set(1, y, C.ink); s.set(W - 2, y, C.ink); }
  }
  for (const [x0, y0, w, h] of lines) s.rect(x0, y0, w, h, C.ink);
  return s;
}
function master32() {
  const cv = tileBackground(32, 2, 28, 5, 9, s => {
    s.rect(0, 12, 28, 16, C.sky2);
    s.rect(21, 1, 2, 27, C.sky1); s.rect(20, 5, 4, 3, C.sky1);
    s.rect(0, 18, 9, 10, C.sky1); s.rect(9, 20, 8, 8, C.sky1); s.rect(17, 17, 11, 11, C.sky1);
    s.set(3, 21, C.winl); s.set(24, 20, C.winl);
  });
  post(cv, 7, 20, 29); post(cv, 23, 20, 29);
  // Top line as a thin dashed bar, NEUKÖLLN as a heavy bar with letter gaps.
  const lines = [[5, 3, 3, 1], [9, 3, 4, 1], [14, 3, 4, 1], [19, 3, 4, 1], [24, 3, 2, 1]];
  for (let i = 0; i < 8; i++) lines.push([4 + i * 3, 6, 2, 4]);
  const sign = smallSign(31, 13, lines);
  sign.set(16, 5, C.ink); sign.set(17, 5, null); sign.set(17, 5, C.y);
  sign.set(0, 12, C.moss); sign.set(1, 12, C.moss); sign.set(30, 3, C.rust);
  blit(cv, sign, 1, 8);
  return cv;
}
function master16() {
  const cv = tileBackground(16, 1, 14, 3, 13, s => {
    s.rect(0, 7, 14, 7, C.sky2); s.rect(10, 1, 1, 12, C.sky1); s.rect(9, 3, 3, 2, C.sky1);
    s.rect(0, 10, 5, 4, C.sky1); s.rect(8, 9, 6, 5, C.sky1);
  });
  const sign = smallSign(15, 7, [[2, 2, 11, 1], [2, 4, 11, 1]]);
  for (let x = 0; x < 15; x++) { sign.set(x, 0, C.ink); sign.set(x, 6, C.ink); }
  for (let y = 0; y < 7; y++) { sign.set(0, y, C.ink); sign.set(14, y, C.ink); }
  blit(cv, sign, 0, 4, false);
  return cv;
}

// Android adaptive icon, 108 dp grid.
function adaptive() {
  const bg = new Canvas(108, 108);
  sky(bg, 0, 0, 108, 108);
  skyline(bg, 108, 37, { tx: 78, top: 12 }, { cx: 16, top: 20, arm: 26 });
  bg.rect(0, 102, 108, 6, hex('18171d'));
  const fg = new Canvas(108, 108);
  post(fg, 34, 58, 107); post(fg, 70, 58, 107);
  blit(fg, iconSign(41), 25, 40);
  const mono = new Canvas(108, 108);
  for (let y = 0; y < 108; y++) for (let x = 0; x < 108; x++) {
    const c = fg.get(x, y);
    if (c && c !== C.ink && c !== C.iron) mono.set(x, y, [255, 255, 255]);
  }
  return { bg, fg, mono };
}

// ------------------------------------------------------------------ output helpers
function toRGBA(cv) {
  const px = Buffer.alloc(cv.w * cv.h * 4);
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const c = cv.get(x, y); if (!c) continue;
    const i = (y * cv.w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { w: cv.w, h: cv.h, px };
}
function nearest(img, size) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = Math.floor(x * img.w / size), sy = Math.floor(y * img.h / size);
    img.px.copy(px, (y * size + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
  }
  return { w: size, h: size, px };
}
// Area average with premultiplied alpha, for the legacy launcher sizes that are not whole multiples.
function area(img, size) {
  const px = Buffer.alloc(size * size * 4), f = img.w / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(y * f); sy < Math.ceil((y + 1) * f); sy++) for (let sx = Math.floor(x * f); sx < Math.ceil((x + 1) * f); sx++) {
      const i = (sy * img.w + sx) * 4, al = img.px[i + 3] / 255;
      r += img.px[i] * al; g += img.px[i + 1] * al; b += img.px[i + 2] * al; a += al; n++;
    }
    const o = (y * size + x) * 4;
    if (a > 0) { px[o] = Math.round(r / a); px[o + 1] = Math.round(g / a); px[o + 2] = Math.round(b / a); }
    px[o + 3] = Math.round(a / n * 255);
  }
  return { w: size, h: size, px };
}
const enc = img => png(img.w, img.h, img.px);
function write(rel, img) { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, enc(img)); }

function ico(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let off = head.length;
  entries.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    head[o] = size >= 256 ? 0 : size; head[o + 1] = size >= 256 ? 0 : size;
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(data.length, o + 8); head.writeUInt32LE(off, o + 12); off += data.length;
  });
  return Buffer.concat([head, ...entries.map(e => e.data)]);
}
function icns(entries) {
  const parts = entries.map(({ type, data }) => { const h = Buffer.alloc(8); h.write(type, 0, 'ascii'); h.writeUInt32BE(data.length + 8, 4); return Buffer.concat([h, data]); });
  const body = Buffer.concat(parts), h = Buffer.alloc(8); h.write('icns', 0, 'ascii'); h.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([h, body]);
}

// ------------------------------------------------------------------ main
function main() {
  const m16 = toRGBA(iconGreys(master16)), m32 = toRGBA(iconGreys(master32)), m64 = toRGBA(iconGreys(master64));
  const x = (img, k) => nearest(img, img.w * k);
  const desk = { 16: m16, 32: m32, 48: x(m16, 3), 64: m64, 128: x(m64, 2), 256: x(m64, 4), 512: x(m64, 8), 1024: x(m64, 16) };
  const data = {};
  for (const s of Object.keys(desk)) data[s] = enc(desk[s]);
  const D = 'desktop/src/main/assets/icons';
  for (const s of [16, 32, 48, 64, 128, 256]) fs.writeFileSync(path.join(ROOT, D, `icon_${s}.png`), data[s]);
  fs.writeFileSync(path.join(ROOT, D, 'windows.ico'), ico([16, 32, 48, 64, 128, 256].map(size => ({ size, data: data[size] }))));
  fs.writeFileSync(path.join(ROOT, D, 'mac.icns'), icns([
    { type: 'icp4', data: data[16] }, { type: 'icp5', data: data[32] }, { type: 'icp6', data: data[64] },
    { type: 'ic07', data: data[128] }, { type: 'ic08', data: data[256] }, { type: 'ic09', data: data[512] },
    { type: 'ic10', data: data[1024] }, { type: 'ic11', data: data[64] }, { type: 'ic12', data: data[128] },
    { type: 'ic13', data: data[512] }, { type: 'ic14', data: data[1024] },
  ]));

  const a = iconGreys(adaptive), bg = toRGBA(a.bg), fg = toRGBA(a.fg), mono = toRGBA(a.mono);
  const legacySrc = desk[512];
  const dens = { mdpi: [1, 48], hdpi: [1.5, 72], xhdpi: [2, 96], xxhdpi: [3, 144], xxxhdpi: [4, 192] };
  for (const variant of ['main', 'debug']) {
    const R = `android/src/${variant}/res`;
    for (const [d, [k, legacy]] of Object.entries(dens)) {
      write(`${R}/mipmap-${d}/ic_launcher_background.png`, nearest(bg, 108 * k));
      write(`${R}/mipmap-${d}/ic_launcher_foreground.png`, nearest(fg, 108 * k));
      write(`${R}/mipmap-${d}/ic_launcher_monochrome.png`, nearest(mono, 108 * k));
      write(`${R}/mipmap-${d}/ic_launcher.png`, area(legacySrc, legacy));
    }
    write(`${R}/mipmap-ldpi/ic_launcher.png`, area(legacySrc, 36));
  }
  write('docs/presse/bilder/logo/app-icon-256.png', desk[256]);
  write('docs/presse/bilder/logo/app-icon-512.png', desk[512]);
  console.log('wrote desktop icons (16..256, windows.ico, mac.icns bis 1024), Android mipmaps (main, debug), Pressekit-Icons');

  const pi = process.argv.indexOf('--preview');
  if (pi > 0 && process.argv[pi + 1]) {
    const dir = process.argv[pi + 1]; fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'appicon-512.png'), data[512]);
    fs.writeFileSync(path.join(dir, 'appicon-16.png'), enc(x(m16, 8)));
    fs.writeFileSync(path.join(dir, 'appicon-32.png'), enc(x(m32, 4)));
    // Adaptive preview: background + foreground, circle and squircle masks at 4x.
    const comp = new Canvas(108, 108);
    for (let yy = 0; yy < 108; yy++) for (let xx = 0; xx < 108; xx++) comp.set(xx, yy, a.fg.get(xx, yy) || a.bg.get(xx, yy));
    for (const [name, inside] of [['kreis', (u, v) => (u - 54) ** 2 + (v - 54) ** 2 <= 36 * 36],
      ['squircle', (u, v) => Math.abs(u - 54) ** 4 + Math.abs(v - 54) ** 4 <= 36 ** 4]]) {
      const m = new Canvas(108, 108);
      for (let yy = 0; yy < 108; yy++) for (let xx = 0; xx < 108; xx++) if (inside(xx + 0.5, yy + 0.5)) m.set(xx, yy, comp.get(xx, yy));
      fs.writeFileSync(path.join(dir, `android-${name}.png`), enc(nearest(toRGBA(m), 432)));
    }
    fs.writeFileSync(path.join(dir, 'android-monochrom.png'), enc(nearest(mono, 432)));
    console.log('preview in ' + dir);
  }
}
main();
