// Title logo: a crooked, weathered Ortsschild "PIXEL DUNGEON: NEUKÖLLN" in front of a deep grey
// Berlin skyline (Fernsehturm, Altbauten, Baukran). Original, deterministic pixel artwork,
// no external image or font dependencies.
//
// Atlas contract (effects/BannerSprites.java): 480x157 RGBA,
//   TITLE_PORT 0,0 139x100 | TITLE_GLOW_PORT 139,0 139x100
//   TITLE_LAND 0,100 240x57 | TITLE_GLOW_LAND 240,100 240x57
// The glow frames are drawn additively (Blending.setLightMode) and pulse, so they only hold
// faint light: window lights, torch halos and a warm sheen on the sign.
// TitleScene places the two fireballs at (16,70)/(123,70) portrait and (30,35)/(210,35)
// landscape (bottom centre of the sprite). The visible flame starts higher: effects/fireball-tall.png
// (landscape) is opaque only down to row 47 of 61, fireball-short.png to row 34 of 47, so the
// torch cups sit FLAME_BASE pixels above those anchor points.
//
// Usage: node tools/generate-neukoelln-title.cjs [--keyart FILE]
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const WIDTH = 480, HEIGHT = 157;
const atlas = Buffer.alloc(WIDTH * HEIGHT * 4);

const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const C = {
  yl: hex('f2c23a'), y: hex('e0ae2c'), yd: hex('b8892a'), ydd: hex('8a6a2c'),
  ink: hex('1d1b1c'), inkw: hex('4a4034'),
  rust: hex('7c3f22'), rustl: hex('a85a2a'),
  moss: hex('3f5a33'), mossl: hex('62813f'),
  metal: hex('5d5f68'), metald: hex('3a3b42'), metall: hex('868892'),
  web: hex('cfcfc6'),
  sky1: hex('2c2d35'), sky2: hex('24252c'), win: hex('3b3c46'), winl: hex('6e5a36'),
  iron: hex('2a2626'), ironl: hex('4b4545'),
};

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Minimal RGBA canvas with transparent background.
class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.px[y * this.w + x] : null; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
}

// 5x7 capitals in the spirit of the DIN lettering on German road signs.
const FONT = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  ':': ['0', '0', '1', '0', '0', '1', '0'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
};
const glyphW = ch => FONT[ch][0].length;
const textW = (s, scale) => [...s].reduce((a, ch) => a + (glyphW(ch) + 1) * scale, 0) - scale;
function text(cv, s, x, y, scale, c) {
  let cx = x;
  for (const ch of s) {
    FONT[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') cv.rect(cx + i * scale, y + j * scale, scale, scale, c); }));
    cx += (glyphW(ch) + 1) * scale;
  }
}

// ---------------------------------------------------------------- the sign
// Default sign (title frames): NEUKÖLLN at scale 2 gives 112x42. The key-art uses scale 3.
const SW = 112, SH = 42;
function drawSign(seed, bs = 2) {
  const by = 18 + 2 * bs, SW = textW('NEUKOLLN', bs) + 18, SH = by + 7 * bs + 6;
  const r = rng(seed);
  const s = new Canvas(SW, SH);
  s.rect(0, 0, SW, SH, C.y);
  // Rolled metal edge: light top, darker bottom, rounded corners.
  for (let x = 0; x < SW; x++) { s.set(x, 0, C.yl); s.set(x, SH - 1, C.yd); }
  for (let y = 0; y < SH; y++) { s.set(0, y, C.yl); s.set(SW - 1, y, C.yd); }
  for (const [x, y] of [[0, 0], [SW - 1, 0], [0, SH - 1], [SW - 1, SH - 1]]) s.set(x, y, null);
  // Black frame inset like the real Ortstafel.
  for (let t = 0; t < 2; t++) {
    for (let x = 3 + t; x < SW - 3 - t; x++) { s.set(x, 3 + t, C.ink); s.set(x, SH - 4 - t, C.ink); }
    for (let y = 3 + t; y < SH - 3 - t; y++) { s.set(3 + t, y, C.ink); s.set(SW - 4 - t, y, C.ink); }
  }
  for (const [x, y] of [[3, 3], [SW - 4, 3], [3, SH - 4], [SW - 4, SH - 4]]) s.set(x, y, C.y);

  const top = 'PIXEL DUNGEON:';
  text(s, top, Math.floor((SW - textW(top, 1)) / 2), 8, 1, C.ink);
  const name = 'NEUKOLLN', bx = Math.floor((SW - textW(name, bs)) / 2);
  text(s, name, bx, by, bs, C.ink);
  s.cell = { x0: bx, w: 6 * bs, n: 8 };
  const ox = bx + 4 * 6 * bs; // the O is the fifth letter
  s.rect(ox + bs, by - 2 * bs, bs, bs, C.ink); s.rect(ox + 3 * bs, by - 2 * bs, bs, bs, C.ink);

  // Grime: the lower half of the sign has seen decades of Streusalz.
  for (let y = 1; y < SH - 1; y++) for (let x = 1; x < SW - 1; x++) {
    const c = s.get(x, y); if (c !== C.y && c !== C.yl) continue;
    const p = Math.max(0, (y - SH * 0.35) / SH) * 0.9 + 0.04;
    const v = r();
    if (v < p * 0.35) s.set(x, y, C.ydd); else if (v < p) s.set(x, y, C.yd);
  }
  // Chipped paint on the frame; the lettering stays intact for legibility.
  for (let y = 3; y < SH - 3; y++) for (let x = 3; x < SW - 3; x++)
    if (s.get(x, y) === C.ink && (x < 6 || x > SW - 7 || y < 6 || y > SH - 7) && r() < 0.12) s.set(x, y, r() < 0.5 ? C.inkw : C.yd);

  // Two rusty bolts with streaks running down.
  for (const bxp of [Math.floor(SW * 0.28), Math.floor(SW * 0.72)]) {
    s.set(bxp, 1, C.metald); s.set(bxp + 1, 1, C.metal); s.set(bxp, 2, C.metal); s.set(bxp + 1, 2, C.metald);
    const len = 6 + Math.floor(r() * 8);
    for (let k = 0; k < len; k++) {
      const x = bxp + (k > 4 && r() < 0.3 ? 1 : 0), y = 3 + k;
      if (s.get(x, y) === C.ink) continue;
      s.set(x, y, k < len / 2 ? C.rust : C.rustl);
    }
  }
  // Rust blooms along the edges.
  for (let n = 0; n < 14; n++) {
    const edge = r(), cx = edge < 0.5 ? Math.floor(r() * SW) : (r() < 0.5 ? 1 : SW - 2);
    const cy = edge < 0.5 ? (r() < 0.3 ? 1 : SH - 2) : Math.floor(r() * SH);
    const rad = 1 + Math.floor(r() * 2);
    for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++)
      if (i * i + j * j <= rad * rad && r() < 0.8 && s.get(cx + i, cy + j)) s.set(cx + i, cy + j, r() < 0.5 ? C.rust : C.rustl);
  }
  // Broken-off bottom right corner, bare metal along the break.
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7 - j; i++) s.set(SW - 1 - i, SH - 1 - j + 0, null);
  for (let j = 0; j < 7; j++) { const x = SW - 1 - (7 - j), y = SH - 1 - j; if (s.get(x, y)) s.set(x, y, C.metal); }
  // A crack from the top edge into the frame.
  let kx = SW - 9, ky = 0;
  while (ky < 11) { if (s.get(kx, ky) !== C.ink) s.set(kx, ky, C.ydd); ky++; if (r() < 0.45) kx += r() < 0.5 ? 1 : -1; }
  // Moss creeping up from the bottom edge, thickest on the left.
  for (let x = 0; x < SW - 8; x++) {
    const h = Math.max(0, Math.floor((1 - x / SW) * 6 * r() + (r() < 0.15 ? 2 : 0)));
    for (let k = 0; k < h; k++) { const y = SH - 1 - k; if (s.get(x, y)) s.set(x, y, k === h - 1 ? C.mossl : C.moss); }
  }
  // Cobweb in the top left corner.
  for (let k = 1; k < 12; k++) { s.set(k, k, C.web); if (k < 9) s.set(k, 0 + Math.floor(k / 3), C.web); if (k < 9) s.set(Math.floor(k / 3), k, C.web); }
  for (const rr of [5, 9]) for (let a = 0; a <= 12; a++) {
    const t = a / 12 * Math.PI / 2, x = Math.round(Math.cos(t) * rr * 0.95), y = Math.round(Math.sin(t) * rr * 0.95);
    if (s.get(x + 1, y + 1)) s.set(x + 1, y + 1, C.web);
  }
  return s;
}

// Crooked mounting: each column drops a little more towards the left (vertical shear, pixel steps).
const TILT = 0.04;
const shearDy = (x, w = SW) => Math.round((w - 1 - x) * TILT);
// Same shear, but inside the NEUKÖLLN lettering every letter cell moves as one block, so the
// pixel steps fall between letters instead of cutting through them.
function signDy(sign) {
  const c = sign.cell;
  return x => {
    if (c && x >= c.x0 && x < c.x0 + c.w * c.n) x = c.x0 + Math.floor((x - c.x0) / c.w) * c.w + Math.floor(c.w / 2);
    return shearDy(x, sign.w);
  };
}
function blitSign(dst, sign, ox, oy) {
  // Shadow first, one pixel down-right.
  const w = sign.w, h = sign.h, dy = signDy(sign);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++)
    if (sign.get(x, y) && !dst.get(ox + x + 1, oy + y + dy(x) + 2)) dst.set(ox + x + 1, oy + y + dy(x) + 2, C.iron);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const c = sign.get(x, y); if (c) dst.set(ox + x, oy + y + dy(x), c);
  }
}

// ---------------------------------------------------------------- scenery
function skyline(cv, groundY, seed, tower, crane) {
  const r = rng(seed);
  // Far layer.
  let x = -2;
  while (x < cv.w) {
    const w = 10 + Math.floor(r() * 14), h = Math.floor(groundY * (0.28 + r() * 0.2));
    cv.rect(x, groundY - h, w, h, C.sky2); x += w;
  }
  // Fernsehturm.
  if (tower) {
    const { tx, top } = tower;
    cv.rect(tx - 1, top, 1, 6, C.sky1);
    cv.rect(tx - 2, top + 6, 3, groundY - top - 6, C.sky1);
    for (let j = -4; j <= 4; j++) { const hw = Math.round(Math.sqrt(16 - j * j) * 1.1); cv.rect(tx - 1 - hw, top + 13 + j, hw * 2 + 1, 1, C.sky1); }
    cv.set(tx - 1, top + 13, C.winl);
    cv.rect(tx - 3, groundY - 6, 5, 6, C.sky1);
  }
  // Baukran.
  if (crane) {
    const { cx, top, arm } = crane;
    for (let y = top; y < groundY; y++) { cv.set(cx, y, C.sky1); cv.set(cx + 2, y, C.sky1); if ((y - top) % 3 === 0) cv.set(cx + 1, y, C.sky1); }
    cv.rect(cx - 6, top, arm + 6, 1, C.sky1); cv.rect(cx - 6, top + 1, 5, 2, C.sky1);
    for (let i = 0; i < arm; i += 3) cv.set(cx + 3 + i, top - 1, C.sky1);
    cv.vline(cx + arm - 3, top + 1, top + 7, C.sky1); cv.rect(cx + arm - 4, top + 8, 3, 2, C.sky1);
  }
  // Near layer: Altbauten with tiny windows, a few lit.
  x = -1;
  while (x < cv.w) {
    const w = 12 + Math.floor(r() * 12), h = Math.floor(groundY * (0.18 + r() * 0.2));
    const y0 = groundY - h;
    cv.rect(x, y0, w, h, C.sky1);
    if (r() < 0.5) cv.rect(x + 2, y0 - 2, w - 4, 2, C.sky1);
    if (r() < 0.4) cv.rect(x + w - 4, y0 - 5, 2, 5, C.sky1);
    for (let wy = y0 + 3; wy < groundY - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) {
      const v = r(); if (v < 0.08) cv.rect(wx, wy, 1, 2, C.winl); else if (v < 0.55) cv.rect(wx, wy, 1, 2, C.win);
    }
    x += w;
  }
}

function post(cv, x, y0, y1) {
  for (let y = y0; y <= y1; y++) { cv.set(x, y, C.metall); cv.set(x + 1, y, C.metal); cv.set(x + 2, y, C.metald); }
  for (let y = y0 + 3; y <= y1; y += 7) cv.set(x + 1, y, C.rust);
}
// Iron torch cup whose flame bottom sits at (fx, fy).
function torchCup(cv, fx, fy) {
  cv.rect(fx - 3, fy, 7, 1, C.ironl); cv.rect(fx - 2, fy + 1, 5, 1, C.iron); cv.rect(fx - 1, fy + 2, 3, 2, C.iron);
}

// ---------------------------------------------------------------- frames
function glowOf(base, torches, signBox) {
  const g = new Canvas(base.w, base.h);
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) {
    const c = base.get(x, y);
    if (c === C.winl) g.set(x, y, hex('a07838'));
    else if (c && (c === C.y || c === C.yl) && x >= signBox[0] && x < signBox[2]) g.set(x, y, hex('2a2008'));
  }
  for (const [fx, fy] of torches) for (let j = -12; j <= 6; j++) for (let i = -12; i <= 12; i++) {
    const d = Math.sqrt(i * i + (j * 1.3) * (j * 1.3));
    if (d > 12) continue;
    const k = Math.round((1 - d / 12) * 70);
    const x = fx + i, y = fy - 4 + j, prev = g.get(x, y) || [0, 0, 0];
    g.set(x, y, [Math.min(255, prev[0] + k), Math.min(255, prev[1] + Math.round(k * 0.6)), Math.min(255, prev[2] + Math.round(k * 0.2))]);
  }
  return g;
}

const FLAME_BASE = { tall: 14, short: 13 };
function portrait() {
  const cv = new Canvas(139, 100);
  skyline(cv, 100, 7, { tx: 104, top: 2 }, { cx: 20, top: 9, arm: 34 });
  const sx = 13, sy = 17;
  const sign = drawSign(41);
  // Posts behind the sign at the torch columns (flame bottoms at x 16 / 123, y 70).
  post(cv, 15, sy + shearDy(3), 99); post(cv, 122, sy + shearDy(SW - 4), 99);
  blitSign(cv, sign, sx, sy);
  torchCup(cv, 16, 70 - FLAME_BASE.short); torchCup(cv, 123, 70 - FLAME_BASE.short);
  return { cv, glow: glowOf(cv, [[16, 70 - FLAME_BASE.short], [123, 70 - FLAME_BASE.short]], [sx, sy, sx + SW]) };
}

function landscape() {
  const cv = new Canvas(240, 57);
  skyline(cv, 57, 11, { tx: 196, top: 0 }, { cx: 52, top: 6, arm: 30 });
  const sx = 64, sy = 3;
  const sign = drawSign(41);
  post(cv, sx + 20, sy + shearDy(20) + SH - 2, 56); post(cv, sx + SW - 22, sy + shearDy(SW - 22) + SH - 2, 56);
  blitSign(cv, sign, sx, sy);
  // Street lamps carrying the two torches (flame bottoms at 30/210, y 35).
  const cupY = 35 - FLAME_BASE.tall;
  for (const fx of [30, 210]) { post(cv, fx - 1, cupY + 3, 56); torchCup(cv, fx, cupY); }
  return { cv, glow: glowOf(cv, [[30, cupY], [210, cupY]], [sx, sy, sx + SW]) };
}

// Key-art for press, README and social headers: 240x135 native (16:9), same pixel language
// as the title frames, sign lettering at scale 3. Written only with --keyart FILE.
const FLAME = ['..1..', '..1..', '.121.', '.121.', '12321', '12321', '12221', '.111.'];
function flame(cv, fx, fy) {
  const pal = { 1: hex('d9480f'), 2: hex('ff9f1c'), 3: hex('ffe08a') };
  FLAME.forEach((row, j) => [...row].forEach((v, i) => { if (v !== '.') cv.set(fx - 2 + i, fy - FLAME.length + j, pal[v]); }));
}
function halo(cv, fx, fy, rad) {
  const warm = hex('ff9f1c');
  for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
    const d = Math.sqrt(i * i + j * j); if (d > rad) continue;
    // Two hard steps plus a checker fringe instead of a smooth gradient: stays pixel art.
    const k = d < rad * 0.45 ? 0.3 : d < rad * 0.75 ? 0.18 : ((i + j) & 1 ? 0.09 : 0);
    const c = cv.get(fx + i, fy + j); if (!c || !k) continue;
    cv.set(fx + i, fy + j, c.map((v, n) => Math.round(v + (warm[n] - v) * k)));
  }
}
function keyart() {
  const W = 240, H = 135, cv = new Canvas(W, H);
  const top = hex('121118'), bot = hex('211f2a');
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), band = Math.floor(t * 6), frac = t * 6 - band;
    for (let x = 0; x < W; x++) {
      const b = Math.min(6, band + ((frac > 0.5 && (x + y) % 2 === 0) ? 1 : 0)) / 6;
      cv.set(x, y, top.map((v, n) => Math.round(v + (bot[n] - v) * b)));
    }
  }
  skyline(cv, H, 23, { tx: 206, top: 8 }, { cx: 22, top: 24, arm: 44 });
  // Rathaus Neukölln tower.
  cv.rect(152, 46, 11, H - 46, C.sky1);
  for (let k = 0; k < 7; k++) cv.rect(152 + k, 46 - 7 + k, 11 - 2 * k > 0 ? 11 - 2 * k : 1, 1, C.sky1);
  cv.rect(157, 34, 1, 6, C.sky1); cv.set(157, 52, C.winl);
  cv.rect(0, H - 4, W, 4, hex('18171d'));
  const sign = drawSign(41, 3), sx = Math.floor((W - sign.w) / 2), sy = 26;
  const lp = sx + 22, rp = sx + sign.w - 26;
  post(cv, lp, sy + shearDy(22, sign.w) + sign.h - 3, H - 2);
  post(cv, rp, sy + shearDy(sign.w - 26, sign.w) + sign.h - 3, H - 2);
  for (const x of [lp + 1, rp + 1]) halo(cv, x, 96, 22);
  blitSign(cv, sign, sx, sy);
  for (const x of [lp + 1, rp + 1]) { torchCup(cv, x, 100); flame(cv, x, 100); }
  return cv;
}
function writeCanvas(cv, file) {
  const px = Buffer.alloc(cv.w * cv.h * 4);
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const c = cv.get(x, y); if (!c) continue;
    const i = (y * cv.w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  fs.writeFileSync(file, png(cv.w, cv.h, px));
  console.log(`Generated ${file} (${cv.w}x${cv.h}, RGBA)`);
}

function put(cv, ox, oy) {
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const c = cv.get(x, y); if (!c) continue;
    const i = ((oy + y) * WIDTH + ox + x) * 4;
    atlas[i] = c[0]; atlas[i + 1] = c[1]; atlas[i + 2] = c[2]; atlas[i + 3] = 255;
  }
}

// ---------------------------------------------------------------- PNG
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}
function png(w, h, px) {
  const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
module.exports = { signDy, Canvas, C, hex, rng, FONT, text, textW, skyline, post, torchCup, flame, halo, png, writeCanvas, TILT };

if (require.main === module) {
  const p = portrait(), l = landscape();
  put(p.cv, 0, 0); put(p.glow, 139, 0); put(l.cv, 0, 100); put(l.glow, 240, 100);
  const output = path.join(__dirname, '../core/src/main/assets/interfaces/neukoelln-title.png');
  fs.writeFileSync(output, png(WIDTH, HEIGHT, atlas));
  console.log(`Generated ${output} (${WIDTH}x${HEIGHT}, RGBA)`);
  const ka = process.argv.indexOf('--keyart');
  if (ka > 0 && process.argv[ka + 1]) writeCanvas(keyart(), process.argv[ka + 1]);
}
