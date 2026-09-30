// Pixel Dungeon Neukoelln: original pixel-art splash scenes.
// Every scene is drawn at 160x90 and scaled 5x (nearest neighbour) to 800x450,
// matching the size of the upstream splash images. No external images or fonts.
// Usage: node tools/generate-neukoelln-splashes.cjs [scene ...]
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const W = 160, H = 90, SCALE = 5;
const OUT = path.join(__dirname, '../core/src/main/assets/splashes');

// ---------------------------------------------------------------- canvas ----
class Layer {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.d[y * this.w + x] : null; }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && this.in(x, y)) this.d[y * this.w + x] = c; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c); }
  hline(x, y, w, c) { this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { this.rect(x, y, 1, h, c); }
  frame(x, y, w, h, c) { this.hline(x, y, w, c); this.hline(x, y + h - 1, w, c); this.vline(x, y, h, c); this.vline(x + w - 1, y, h, c); }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / (rx + 0.4), ny = (y - cy) / (ry + 0.4);
      if (nx * nx + ny * ny <= 1) this.px(x, y, c);
    }
  }
  // polygon fill (even-odd, pixel centres)
  poly(pts, c) {
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) xs.push(x0 + (y + 0.5 - y0) / (y1 - y0) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.px(x, y, c);
    }
  }
  // checkerboard dither of c over the area; phase 0/1, density 2 (50%) or 4 (25%)
  dither(x, y, w, h, c, density = 2, phase = 0) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (density === 2 && (i + j + phase) % 2 === 0) this.px(i, j, c);
      if (density === 4 && (i + phase) % 2 === 0 && (j + (i >> 1) % 2) % 2 === 0 && (i + j * 2 + phase) % 4 === 0) this.px(i, j, c);
    }
  }
  // vertical gradient from a list of colours, dithered at each band border
  vgrad(x, y, w, h, cols) {
    const band = h / cols.length;
    for (let j = 0; j < h; j++) {
      const t = j / band, k = Math.min(cols.length - 1, Math.floor(t)), f = t - k;
      for (let i = 0; i < w; i++) {
        let c = cols[k];
        if (k + 1 < cols.length && f > 0.75 && (i + j) % 2 === 0) c = cols[k + 1];
        if (k > 0 && f < 0.25 && (i + j) % 2 === 1) c = cols[k - 1];
        this.px(x + i, y + j, c);
      }
    }
  }
  // stamp an ASCII sprite; '.' and ' ' are transparent
  stamp(x, y, rows, map, flip = false) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.' || ch === ' ') return;
      const c = map[ch]; if (!c) throw new Error('No colour for ' + ch);
      this.px(flip ? x + row.length - 1 - i : x + i, y + j, c);
    }));
  }
  replace(x, y, w, h, map) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const c = this.get(i, j); if (c && map[c]) this.px(i, j, map[c]); } }
  // one-pixel outline around every filled pixel of this layer
  outline(c, diag = false) {
    const add = [];
    for (let y = -1; y <= this.h; y++) for (let x = -1; x <= this.w; x++) {
      if (this.get(x, y)) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].concat(diag ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : []);
      if (n.some(([a, b]) => this.get(x + a, y + b))) add.push([x, y]);
    }
    return add;
  }
  draw(layer, ox, oy, outlineColor) {
    if (outlineColor) for (const [x, y] of layer.outline(outlineColor)) this.px(ox + x, oy + y, outlineColor);
    for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) { const c = layer.get(x, y); if (c) this.px(ox + x, oy + y, c); }
  }
  text(str, x, y, c, spacing = 1) {
    let cx = x;
    for (const ch of str) {
      const g = FONT[ch]; if (!g) throw new Error('No glyph ' + ch);
      const top = y - (g.length - 5);
      g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') this.px(cx + i, top + j, c); }));
      cx += g[0].length + spacing;
    }
    return cx - x - spacing;
  }
  textWidth(str, spacing = 1) { let n = 0; for (const ch of str) n += FONT[ch][0].length + spacing; return n - spacing; }
}

const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'], M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['1001', '1101', '1011', '1001', '1001'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['10001', '10001', '10101', '11011', '10001'],
  Z: ['111', '001', '010', '100', '111'], Y: ['101', '101', '010', '010', '010'], X: ['101', '101', '010', '101', '101'],
  'Ä': ['101', '000', '111', '101', '111', '101', '101'], // drawn two rows higher
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['110', '001', '010', '100', '111'],
  '3': ['110', '001', '010', '001', '110'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '110', '001', '110'],
  '6': ['011', '100', '110', '101', '010'], '7': ['111', '001', '010', '010', '010'], '8': ['111', '101', '111', '101', '111'],
  '9': ['010', '101', '011', '001', '110'], ' ': ['0', '0', '0', '0', '0'], '!': ['1', '1', '1', '0', '1'], '-': ['000', '000', '111', '000', '000'],
  '.': ['0', '0', '0', '0', '1'], ':': ['0', '1', '0', '1', '0'], '?': ['110', '001', '010', '000', '010'],
};

// 5x7 sign letters for neon and shop signs
const BIG = {
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Ä': ['01010', '00000', '01110', '10001', '11111', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
};
function bigText(layer, str, x, y, col, spacing = 2) {
  let cx = x;
  for (const ch of str) { const g = BIG[ch]; g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') layer.px(cx + i, y + j, col); })); cx += g[0].length + spacing; }
  return cx - x - spacing;
}

// ------------------------------------------------------------------- png ----
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
function writePng(file, layer, scale) {
  const w = layer.w * scale, h = layer.h * scale;
  const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2; // RGB
  const rows = Buffer.alloc(h * (w * 3 + 1));
  const colours = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = layer.get(Math.floor(x / scale), Math.floor(y / scale));
    if (!c) throw new Error(`Unpainted pixel ${Math.floor(x / scale)},${Math.floor(y / scale)} in ${file}`);
    colours.add(c);
    const o = y * (w * 3 + 1) + 1 + x * 3;
    rows[o] = parseInt(c.slice(0, 2), 16); rows[o + 1] = parseInt(c.slice(2, 4), 16); rows[o + 2] = parseInt(c.slice(4, 6), 16);
  }
  fs.writeFileSync(file, Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
  return colours.size;
}

// ------------------------------------------------------------ shared bits ----
// Deterministic pseudo random numbers so every run produces identical images.
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const SCENES = {};

// =============================================================================
// WARRIOR - Alteingesessene: "Ick wohn hier." Altbau, Spaeti, Klingelschilder.
// =============================================================================
SCENES.warrior = () => {
  const P = {
    ink: '1c1a26', sky: '2b2f4a', wall: '9c7f69', wallD: '7d6252', wallL: 'b3967c', trim: 'c7ad8e',
    win: '2e3552', winL: 'f2cf7a', winM: 'c58c4a', stone: '5f5a63', stoneD: '47434d', stoneL: '7a7580',
    shop: '3a3140', neon: 'ff6fae', neonD: 'b03c7a', teal: '3fa6a0', tealD: '2a716f', tealL: '7fd6c5',
    skin: 'f0b99a', skinD: 'c98672', hair: 'cfc3dc', hairD: '9a8fae', purple: '7a4f9c', white: 'efe9e0', brown: '8a4e2c', brownD: '5e3320', green: '6fae4a',
  };
  const c = new Layer(W, H);
  // Altbau facade
  c.rect(0, 0, W, H, P.wall);
  c.dither(0, 0, W, 60, P.wallD, 4, 1);
  // cornice lines between floors
  for (const y of [15, 36]) { c.hline(0, y, W, P.trim); c.hline(0, y + 1, W, P.wallD); }
  // upper windows
  const windows = [[6, 1], [30, 0], [54, 1], [78, 0], [102, 2], [126, 0], [148, 1]];
  for (const [x, lit] of windows) for (const y of [2, 20]) {
    c.rect(x - 1, y - 1, 12, 13, P.trim);
    c.rect(x, y, 10, 11, P.win);
    if ((lit + y) % 3 === 1) { c.rect(x + 1, y + 1, 8, 9, P.winL); c.rect(x + 1, y + 6, 8, 4, P.winM); }
    c.vline(x + 5, y, 11, P.trim); c.hline(x, y + 4, 10, P.trim);
    c.hline(x - 2, y + 12, 14, P.wallL); c.hline(x - 2, y + 13, 14, P.wallD);
  }
  // one grumpy window flower box and a sock on a line, for life
  c.rect(29, 32, 12, 2, P.brown); c.px(31, 31, P.green); c.px(33, 30, P.neon); c.px(36, 31, P.green); c.px(38, 30, P.winL);
  // ground floor base (dark plinth)
  c.rect(0, 38, W, 40, P.stone);
  c.dither(0, 38, W, 40, P.stoneD, 4);
  c.hline(0, 38, W, P.stoneL);
  // Spaeti shop front (kept inside the band that stays visible at 4:3 .. 21:9)
  c.rect(22, 40, 39, 36, P.shop);
  c.frame(22, 40, 39, 36, P.ink);
  // neon sign "SPAETI" in a taller 5x7 letterform
  c.rect(24, 41, 35, 13, P.ink);
  c.frame(24, 41, 35, 13, P.neonD);
  const neonTxt = (x, y, col) => bigText(c, 'SPÄTI', x, y, col, 1);
  neonTxt(29, 45, P.neonD); neonTxt(28, 44, P.neon);
  // shop window: shelves of chunky bottles
  c.rect(25, 56, 18, 17, P.win);
  for (const sy of [61, 67, 72]) c.hline(25, sy, 18, P.stoneD);
  const bottles = [P.green, P.winM, P.tealL, P.neon, P.winL];
  for (let i = 0; i < 4; i++) for (const sy of [61, 67]) {
    const bx = 26 + i * 4, col = bottles[(i * 2 + sy) % 5];
    c.rect(bx, sy - 3, 2, 3, col); c.px(bx, sy - 4, col); c.px(bx + 1, sy - 3, P.white);
  }
  c.hline(25, 56, 18, P.winL); c.dither(25, 57, 18, 1, P.winL);
  // shop door with sticker mess
  c.rect(45, 55, 13, 21, P.tealD); c.frame(45, 55, 13, 21, P.ink); c.rect(47, 57, 9, 11, P.win);
  c.px(48, 69, P.neon); c.px(50, 70, P.winL); c.px(54, 69, P.white); c.px(52, 71, P.teal); c.px(56, 70, P.neon);
  c.text('24', 48, 59, P.winL);
  // beverage crates outside
  for (const [bx, by] of [[4, 66], [4, 60], [11, 66]]) { c.rect(bx, by, 7, 6, P.teal); c.frame(bx, by, 7, 6, P.tealD); c.hline(bx + 1, by + 1, 5, P.ink); }
  // Altbau door (big wooden double door) behind the figure
  c.rect(64, 44, 38, 34, P.brownD);
  c.poly([[64, 44], [83, 36], [102, 44]], P.brownD);
  c.rect(67, 46, 15, 30, P.brown); c.rect(84, 46, 15, 30, P.brown);
  c.frame(69, 48, 11, 12, P.brownD); c.frame(86, 48, 11, 12, P.brownD);
  c.frame(69, 62, 11, 12, P.brownD); c.frame(86, 62, 11, 12, P.brownD);
  // doorbell wall: many name plates
  c.rect(108, 42, 16, 30, P.trim); c.frame(108, 42, 16, 30, P.ink);
  const plates = [P.white, P.winL, P.white, P.tealL, P.white, P.neon];
  for (let r = 0; r < 12; r++) for (let k = 0; k < 2; k++) {
    const y = 44 + r * 2, x = 110 + k * 7;
    c.hline(x, y, 4, plates[(r * 2 + k * 5) % 6]); c.px(x + 5, y, P.stoneD);
  }
  c.rect(112, 69, 8, 2, P.stoneD); // intercom grille
  // sidewalk: granite slabs with mosaic cobbles
  c.rect(0, 76, W, 14, P.stoneL);
  c.hline(0, 76, W, P.ink);
  for (let x = 0; x < W; x += 3) for (let y = 77; y < 90; y += 2) c.px(x + (y % 4 ? 1 : 0), y, P.stone);
  c.rect(0, 80, W, 6, P.trim); c.dither(0, 80, W, 6, P.stoneL, 2);
  for (let x = 6; x < W; x += 20) c.vline(x, 80, 6, P.stone);
  c.hline(0, 80, W, P.stone); c.hline(0, 85, W, P.stone);

  // ---------------------------------------------------------- the hero ----
  const f = new Layer(46, 62);
  // legs (track pants) and shoes
  f.rect(13, 42, 8, 13, P.tealD); f.rect(23, 42, 8, 13, P.tealD);
  f.vline(14, 42, 13, P.teal); f.vline(24, 42, 13, P.teal);
  f.rect(11, 55, 10, 4, P.white); f.rect(23, 55, 10, 4, P.white);
  f.hline(11, 58, 10, P.hairD); f.hline(23, 58, 10, P.hairD);
  // torso: track jacket with colour-block chevron
  f.poly([[10, 23], [34, 23], [36, 44], [8, 44]], P.teal);
  f.poly([[10, 23], [14, 23], [22, 33], [30, 23], [34, 23], [35, 30], [22, 40], [9, 30]], P.purple);
  f.poly([[12, 25], [22, 36], [32, 25], [33, 27], [22, 38], [11, 27]], P.neon);
  f.vline(22, 25, 19, P.white);
  f.rect(8, 42, 28, 2, P.tealD);
  // collar
  f.poly([[15, 21], [22, 26], [29, 21], [29, 24], [22, 28], [15, 24]], P.tealL);
  // crossed arms: two forearms stacked, fists poking out on either side
  f.rect(6, 24, 6, 10, P.teal); f.rect(33, 24, 6, 10, P.teal); // upper arms
  f.vline(6, 24, 10, P.tealD); f.vline(38, 24, 10, P.tealD);
  f.rect(9, 28, 28, 4, P.teal); f.hline(9, 28, 28, P.tealL);   // top forearm
  f.rect(6, 32, 29, 4, P.teal); f.hline(6, 35, 29, P.tealD);   // lower forearm
  f.hline(9, 31, 26, P.tealD);
  f.vline(34, 28, 4, P.purple); f.vline(10, 32, 4, P.purple);  // cuffs
  f.rect(35, 28, 4, 4, P.skin); f.px(38, 31, P.skinD); f.px(36, 29, P.skinD);
  f.rect(3, 32, 4, 4, P.skin); f.px(3, 35, P.skinD); f.px(5, 33, P.skinD);
  // head: permed hair, face, glasses, stern look
  f.ellipse(22, 11, 13, 10, P.hair);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; f.px(22 + Math.cos(a) * 11, 11 + Math.sin(a) * 8.5, P.hairD); }
  for (const [x, y] of [[14, 5], [19, 3], [25, 3], [30, 5], [12, 10], [32, 10], [17, 7], [27, 7], [22, 5]]) { f.px(x, y, P.hairD); f.px(x + 1, y - 1, P.white); }
  f.ellipse(22, 15, 9, 6, P.skin);
  // curly fringe over the forehead
  for (let x = 13; x <= 31; x += 3) { f.ellipse(x + 1, 10, 1.6, 1.6, P.hair); f.px(x + 1, 12, P.hairD); f.px(x, 9, P.white); }
  f.hline(13, 20, 19, P.skinD);
  // glasses
  f.frame(15, 13, 6, 4, P.ink); f.frame(24, 13, 6, 4, P.ink); f.hline(21, 14, 3, P.ink);
  f.px(17, 15, P.ink); f.px(18, 15, P.ink); f.px(26, 15, P.ink); f.px(27, 15, P.ink);
  f.px(16, 14, P.white); f.px(25, 14, P.white);
  // stern brows
  f.line(15, 11, 20, 12, P.hairD); f.line(24, 12, 29, 11, P.hairD);
  // mouth: flat, slightly down
  f.hline(20, 19, 5, P.skinD); f.px(19, 20, P.skinD); f.px(25, 20, P.skinD);
  f.px(14, 18, P.neon); f.px(30, 18, P.neon);
  // shopping net hanging from her right forearm (viewer right)
  const net = new Layer(12, 18);
  net.rect(3, 0, 3, 9, P.green); net.hline(3, 0, 3, P.tealL); net.rect(3, 6, 3, 4, P.white); // leek
  net.rect(7, 1, 3, 9, P.green); net.hline(8, 0, 1, P.winL); net.vline(8, 3, 4, P.tealL); // bottle
  net.ellipse(4, 12, 3, 3, P.winM); net.ellipse(8, 12, 2.5, 2.5, P.neon); net.px(3, 11, P.winL); // oranges
  for (let y = 5; y < 17; y++) for (let x = 0; x < 12; x++) {
    const inside = x >= 1 + (y > 13 ? y - 13 : 0) && x <= 11 - (y > 13 ? y - 13 : 0);
    if (inside && ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0)) net.px(x, y, P.hairD);
  }
  f.draw(net, 32, 38);
  f.line(36, 32, 34, 42, P.hairD); f.line(38, 32, 42, 42, P.hairD);
  c.draw(f, 61, 20, P.ink);

  // ------------------------------------------------------------ the dog ----
  const d = new Layer(22, 12);
  d.rect(3, 4, 14, 5, P.brown);
  d.ellipse(17, 3, 3, 3, P.brown);
  d.rect(19, 3, 3, 2, P.brown); d.px(21, 4, P.ink);
  d.px(17, 2, P.ink);
  d.rect(15, 2, 2, 5, P.brownD); // ear
  d.rect(5, 4, 9, 4, P.neon); d.hline(5, 5, 9, P.purple); // little knitted sweater
  d.vline(4, 9, 2, P.brownD); d.vline(7, 9, 2, P.brownD); d.vline(13, 9, 2, P.brownD); d.vline(16, 9, 2, P.brownD);
  d.line(0, 2, 2, 4, P.brown); // tail
  c.draw(d, 30, 67, P.ink);
  // speech bubble "ICK WOHN HIER"
  const msg = 'ICK WOHN HIER', tw = c.textWidth(msg);
  const bx = 42, by = 7;
  c.rect(bx - 3, by - 3, tw + 6, 11, P.ink); c.rect(bx - 2, by - 2, tw + 4, 9, P.white);
  c.poly([[bx + tw - 6, by + 7], [bx + tw - 1, by + 7], [bx + tw + 1, by + 11]], P.ink);
  c.px(bx + tw - 3, by + 7, P.white); c.px(bx + tw - 2, by + 7, P.white); c.px(bx + tw - 1, by + 8, P.white); c.px(bx + tw, by + 9, P.white);
  c.text(msg, bx, by, P.ink);
  return c;
};


// =============================================================================
// MAGE - Expat: laptop as spellbook, glowing selfie-stick staff, "DISRUPT".
// =============================================================================
SCENES.mage = () => {
  const P = {
    ink: '1a1a28', wall: '4b5363', wallD: '3c4252', wallL: '5d6679', ceil: '2c3040', wood: 'a86b43', woodD: '7a4a2e', woodL: 'c98f5c',
    cyan: '5ff2ee', cyanD: '2a9fa8', vio: 'c28cff', vioD: '7a52c9', warm: 'ffd27a', warmD: 'd99a44',
    skin: 'f2c4a4', skinD: 'cc9078', hood: '8fbf8a', hoodD: '5f8f63', hoodL: 'b6dcae', mustard: 'e0b440', mustardD: 'b08326',
    chino: 'd9c3a0', chinoD: 'a99273', white: 'f3efe6', pink: 'ff7eb0', leaf: '4f9c5a', leafD: '2f6b3e', steel: '9aa4b4',
  };
  const c = new Layer(W, H);
  c.rect(0, 0, W, H, P.wall);
  c.dither(0, 12, W, 55, P.wallD, 4);
  // concrete formwork seams (Sichtbeton)
  for (let x = 0; x < W; x += 32) c.vline(x, 12, 55, P.wallD);
  c.hline(0, 38, W, P.wallD);
  for (let x = 6; x < W; x += 16) for (const y of [24, 52]) c.px(x, y, P.wallD);
  // ceiling with pipes
  c.rect(0, 0, W, 12, P.ceil);
  c.hline(0, 9, W, P.steel); c.hline(0, 10, W, P.wallD);
  c.hline(0, 4, W, P.wallD);
  // DISRUPT neon with glow halo
  const tw = bigText(c, 'DISRUPT', 0, -100, P.cyan);
  const tx = 52 - Math.floor(tw / 2), ty = 19;
  c.dither(tx - 4, ty - 3, tw + 8, 13, P.wallL, 2);
  c.dither(tx - 2, ty - 2, tw + 4, 11, P.cyanD, 4);
  bigText(c, 'DISRUPT', tx + 1, ty + 1, P.cyanD);
  bigText(c, 'DISRUPT', tx, ty, P.cyan);
  // hanging bulbs
  for (const [x, len] of [[14, 8], [128, 13], [148, 7]]) {
    c.vline(x, 10, len, P.ink);
    c.dither(x - 3, 10 + len - 1, 7, 7, P.warmD, 4);
    c.rect(x - 1, 10 + len, 3, 3, P.warm); c.px(x, 10 + len + 3, P.warmD); c.px(x, 10 + len, P.white);
  }
  // shelf with hanging plants
  c.rect(98, 26, 60, 2, P.woodD); c.hline(98, 26, 60, P.woodL);
  for (const [x, drop] of [[104, 12], [122, 7], [140, 15], [154, 9]]) {
    c.rect(x - 2, 22, 5, 4, P.white); c.hline(x - 2, 22, 5, P.steel);
    for (let j = 0; j < drop; j++) { c.px(x + ((j >> 1) % 2 ? 1 : -1), 28 + j, j % 3 ? P.leaf : P.leafD); if (j % 3 === 0) c.px(x + ((j >> 1) % 2 ? 2 : -2), 28 + j, P.leaf); }
    c.px(x - 1, 21, P.leaf); c.px(x + 1, 20, P.leaf); c.px(x, 21, P.leafD);
  }
  // counter with an espresso machine in the back
  c.rect(0, 52, W, 16, P.woodD);
  c.hline(0, 52, W, P.woodL); c.hline(0, 53, W, P.wood);
  for (let x = 4; x < W; x += 10) c.vline(x, 55, 13, P.wood);
  c.rect(6, 42, 16, 10, P.steel); c.frame(6, 42, 16, 10, P.ink); c.rect(9, 45, 4, 3, P.ink); c.px(10, 46, P.cyan); c.rect(15, 49, 2, 3, P.ink);
  // a silhouetted co-worker with headphones on the far left
  c.ellipse(34, 44, 4, 4, P.ceil); c.ellipse(34, 52, 7, 4, P.ceil); c.hline(30, 39, 9, P.ink); c.px(29, 40, P.ink); c.px(39, 40, P.ink); c.rect(28, 41, 2, 4, P.pink); c.rect(39, 41, 2, 4, P.pink);
  c.rect(40, 46, 10, 6, P.steel); c.hline(40, 46, 10, P.white);
  // wooden floor
  c.rect(0, 68, W, 22, P.wood);
  for (let y = 70; y < H; y += 4) c.hline(0, y, W, P.woodD);
  for (let y = 70, k = 0; y < H; y += 4, k++) for (let x = (k * 13) % 25; x < W; x += 25) c.vline(x, y + 1, 3, P.woodD);
  c.dither(0, 68, W, 2, P.woodL, 2);

  // ---------------------------------------------------- incantation bubbles ----
  const glyphs = [['111', '010', '101'], ['101', '111', '001'], ['110', '011', '110'], ['011', '110', '011'], ['111', '101', '100'], ['010', '111', '010'], ['100', '111', '001']];
  const bubble = (x, y, n, seed, tail) => {
    const r = rng(seed), w = n * 4 + 5;
    c.rect(x, y, w, 9, P.ink); c.rect(x + 1, y + 1, w - 2, 7, P.white); c.px(x, y, P.wall); c.px(x + w - 1, y, P.wall); c.px(x, y + 8, P.wall); c.px(x + w - 1, y + 8, P.wall);
    for (let k = 0; k < n; k++) { const g = glyphs[Math.floor(r() * glyphs.length)]; g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') c.px(x + 3 + k * 4 + i, y + 3 + j, k % 3 === 2 ? P.vioD : P.ink); })); }
    for (let k = 0; k < tail; k++) c.px(x + w - 1 + k, y + 9 + k, P.white);
  };
  bubble(33, 31, 5, 7, 0);
  bubble(49, 43, 4, 3, 0);
  c.rect(66, 40, 2, 2, P.white); c.px(62, 37, P.white); // bubble trail
  c.px(72, 48, P.white);

  // ------------------------------------------------------------ the hero ----
  const f = new Layer(52, 70);
  const ox = 10;
  // legs: cropped chinos, white socks, sandals
  f.rect(ox + 12, 48, 8, 11, P.chino); f.rect(ox + 22, 48, 8, 11, P.chino);
  f.vline(ox + 19, 48, 11, P.chinoD); f.vline(ox + 29, 48, 11, P.chinoD);
  f.rect(ox + 13, 59, 6, 3, P.white); f.rect(ox + 23, 59, 6, 3, P.white);
  f.rect(ox + 11, 62, 9, 3, P.woodD); f.rect(ox + 22, 62, 9, 3, P.woodD); f.hline(ox + 12, 61, 6, P.woodL); f.hline(ox + 23, 61, 6, P.woodL);
  // oversized hoodie
  f.poly([[ox + 9, 24], [ox + 33, 24], [ox + 36, 50], [ox + 6, 50]], P.hood);
  f.vline(ox + 33, 26, 23, P.hoodD); f.hline(ox + 6, 49, 31, P.hoodD);
  f.rect(ox + 12, 22, 18, 4, P.hoodL); // hood rim
  f.vline(ox + 17, 26, 8, P.white); f.vline(ox + 25, 26, 8, P.white); // drawstrings
  // lanyard with badge
  f.line(ox + 15, 25, ox + 20, 36, P.pink); f.line(ox + 27, 25, ox + 22, 36, P.pink);
  f.rect(ox + 18, 36, 6, 7, P.white); f.frame(ox + 18, 36, 6, 7, P.steel); f.rect(ox + 19, 38, 4, 2, P.cyanD); f.hline(ox + 19, 41, 3, P.ink);
  // left arm holding the open laptop like a spellbook
  f.rect(ox + 3, 26, 7, 14, P.hood); f.vline(ox + 3, 26, 14, P.hoodD);
  const lap = new Layer(18, 14);
  lap.poly([[0, 0], [9, 3], [9, 13], [0, 10]], P.steel);
  lap.poly([[1, 1], [8, 4], [8, 11], [1, 9]], P.vio);
  lap.px(3, 4, P.white); lap.px(5, 5, P.white); lap.px(3, 6, P.vioD); lap.px(6, 7, P.white); lap.px(4, 8, P.vioD);
  lap.poly([[9, 3], [17, 1], [17, 10], [9, 13]], P.steel);
  lap.poly([[10, 4], [16, 2], [16, 9], [10, 11]], P.white);
  lap.px(13, 5, P.pink); lap.px(12, 6, P.pink); lap.px(14, 6, P.pink); lap.px(13, 7, P.pink); // sticker heart
  f.draw(lap, 0, 32, P.ink);
  f.rect(ox + 6, 40, 4, 4, P.skin);
  // right arm raised with the glowing selfie-stick staff
  f.poly([[ox + 32, 26], [ox + 38, 24], [ox + 43, 14], [ox + 39, 12], [ox + 33, 21]], P.hood);
  f.rect(ox + 38, 9, 5, 5, P.skin); f.px(ox + 38, 13, P.skinD);
  // head
  f.ellipse(ox + 21, 13, 11, 10, P.skin);
  f.hline(ox + 11, 21, 21, P.skinD);
  // beanie
  f.ellipse(ox + 21, 5, 11, 6, P.mustard);
  f.rect(ox + 10, 6, 23, 4, P.mustardD); for (let x = ox + 11; x < ox + 33; x += 2) f.vline(x, 6, 4, P.mustard);
  f.ellipse(ox + 21, -1, 2, 2, P.mustardD);
  // round glasses lit by the screen
  f.ellipse(ox + 16, 13, 2.6, 2.6, P.ink); f.ellipse(ox + 16, 13, 1.6, 1.6, P.vio);
  f.ellipse(ox + 26, 13, 2.6, 2.6, P.ink); f.ellipse(ox + 26, 13, 1.6, 1.6, P.vio);
  f.hline(ox + 19, 13, 4, P.ink); f.px(ox + 15, 12, P.white); f.px(ox + 25, 12, P.white);
  // big enthusiastic grin, stubble
  f.hline(ox + 18, 18, 7, P.ink); f.hline(ox + 19, 19, 5, P.white); f.px(ox + 17, 17, P.ink); f.px(ox + 25, 17, P.ink);
  f.dither(ox + 15, 19, 13, 2, P.skinD, 2);
  f.px(ox + 12, 16, P.pink); f.px(ox + 30, 16, P.pink);
  c.draw(f, 64, 22, P.ink);
  // phone at the top of the stick, casting magic sparkles
  const tipX = 64 + ox + 41, tipY = 22 - 12;
  c.dither(tipX - 7, tipY - 6, 15, 13, P.vioD, 4);
  c.vline(tipX, tipY + 3, 29, P.steel); c.vline(tipX - 1, tipY + 3, 29, P.ink);
  c.rect(tipX - 2, tipY - 3, 5, 7, P.ink); c.rect(tipX - 1, tipY - 2, 3, 5, P.vio); c.px(tipX, tipY - 1, P.white);
  for (const [dx, dy, col] of [[-6, -1, P.vio], [6, 1, P.cyan], [4, -6, P.white], [-4, 5, P.white], [8, -4, P.vio], [-8, 3, P.cyan]]) {
    c.px(tipX + dx, tipY + dy, col); c.px(tipX + dx - 1, tipY + dy, P.vioD); c.px(tipX + dx + 1, tipY + dy, P.vioD); c.px(tipX + dx, tipY + dy - 1, P.vioD); c.px(tipX + dx, tipY + dy + 1, P.vioD);
    c.px(tipX + dx, tipY + dy, col);
  }
  // little cafe table with the oat milk cup
  c.rect(111, 70, 20, 3, P.woodL); c.hline(111, 72, 20, P.woodD); c.vline(120, 73, 15, P.ink); c.vline(121, 73, 15, P.steel); c.hline(115, 88, 12, P.ink);
  c.rect(116, 61, 8, 9, P.white); c.frame(115, 60, 10, 10, P.ink); c.hline(116, 61, 8, P.chino);
  c.rect(117, 64, 6, 3, P.cyanD); c.text('OAT', 0, -100, P.ink); // keep the word tiny: stripe on the cup reads as a label
  c.rect(125, 63, 2, 4, P.ink); c.px(125, 64, P.white);
  c.px(118, 57, P.steel); c.px(120, 55, P.steel); c.px(119, 58, P.steel); c.px(121, 57, P.steel); // steam
  return c;
};


// =============================================================================
// HUNTRESS - Zugezogene: bow on the balcony, Hinterhof below, the wide field beyond.
// =============================================================================
SCENES.huntress = () => {
  const P = {
    ink: '1f1a2b', sky1: '545a9a', sky2: '7f71ab', sky3: 'b983a8', sky4: 'eea493', sky5: 'f8d39c', sun: 'fff0c0',
    grass: '93a862', grassD: '6f8450', far: '8f7f9c', roof: '5a4a63', roofD: '43364d', roofL: '7a6680', winL: 'ffd98a', brick: 'a0584a', brickD: '7a3f38',
    tree: '4f7a4c', treeD: '355a3c', treeL: '6f9b58', iron: '2b2836', slab: 'b7a79a', slabD: '8c7d74',
    skin: 'e9b08e', skinD: 'bb7f67', hair: '4a2e45', hairL: '7c4a6a', teal: '46b3a6', tealD: '2e7f79', cream: 'f4e6c8', pink: 'ef7f97', jeans: '5876b4', jeansD: '3d5588',
    jute: 'd8c08c', juteD: 'a88d5e', red: 'e0434e', white: 'fbf6ea',
  };
  let c = new Layer(W, H);
  c.rect(0, 50, W, 40, P.roofD);
  c.vgrad(0, 0, W, 52, [P.sky1, P.sky2, P.sky3, P.sky4, P.sky5]);
  // low sun and a couple of clouds
  c.ellipse(52, 46, 7, 7, P.sun); c.dither(42, 36, 21, 20, P.sky5, 4);
  for (const [x, y, w] of [[8, 14, 22], [70, 8, 30], [34, 27, 16]]) { c.rect(x, y, w, 2, P.sky4); c.rect(x + 3, y - 1, w - 8, 1, P.sky4); c.hline(x + 2, y + 2, w - 4, P.sky3); }
  // the wide flat field with the long old airfield hall on the horizon
  c.rect(0, 50, W, 12, P.grass); c.dither(0, 50, W, 2, P.sky5, 2); c.dither(0, 56, W, 6, P.grassD, 4);
  c.rect(4, 46, 58, 4, P.far); c.rect(12, 44, 40, 2, P.far); c.hline(4, 49, 58, P.roof);
  for (let x = 6; x < 60; x += 4) c.px(x, 47, P.sky3);
  // tiny people and kites on the field
  for (const [x, y] of [[66, 53], [80, 54], [95, 52], [30, 55], [110, 53]]) { c.px(x, y, P.roofD); c.px(x, y - 1, P.roofD); }
  const kite = (x, y, col, len) => { c.px(x, y - 1, col); c.hline(x - 1, y, 3, col); c.px(x, y + 1, col); for (let k = 1; k <= len; k++) c.px(x + (k % 2), y + 1 + k, k % 2 ? P.white : col); };
  kite(28, 20, P.red, 5); kite(64, 12, P.teal, 6); kite(96, 30, P.pink, 4);
  c.line(29, 26, 30, 53, P.sky3);
  // Hinterhof roofs and walls in the middle distance
  c.rect(0, 58, 36, 32, P.roof); c.poly([[0, 58], [18, 50], [36, 58]], P.roof);
  c.rect(26, 45, 4, 8, P.brickD); c.hline(25, 45, 6, P.roofD); // chimney
  for (let y = 62; y < 90; y += 8) for (let x = 4; x < 34; x += 8) { c.rect(x, y, 4, 5, (x + y) % 3 ? P.roofD : P.winL); }
  c.rect(36, 62, 34, 28, P.brick); c.dither(36, 62, 34, 28, P.brickD, 4); c.hline(36, 62, 34, P.brickD);
  for (let y = 66; y < 90; y += 7) for (let x = 40; x < 68; x += 7) { c.rect(x, y, 3, 4, (x * y) % 5 ? P.roofD : P.winL); }
  c.ellipse(70, 72, 16, 12, P.treeD); c.ellipse(68, 70, 13, 10, P.tree);
  for (const [x, y] of [[60, 66], [66, 63], [74, 68], [64, 74], [72, 76], [57, 72]]) { c.px(x, y, P.treeL); c.px(x + 1, y, P.treeL); c.px(x, y + 1, P.treeL); }
  c.rect(69, 82, 3, 8, P.roofD);
  c.rect(100, 57, 46, 33, P.roofD); c.hline(100, 57, 46, P.roofL);
  for (let y = 61; y < 90; y += 7) for (let x = 103; x < 144; x += 7) c.rect(x, y, 3, 4, (x + y) % 4 ? P.roof : P.winL);
  c.rect(80, 60, 20, 30, P.roofL); c.hline(80, 60, 20, P.slab);
  for (let y = 64; y < 90; y += 7) { c.rect(84, y, 4, 4, P.roofD); c.rect(92, y, 4, 4, y === 71 ? P.winL : P.roofD); }

  // ------------------------------------------------------ balcony and hero ----
  // drawn on a wider layer and moved left so the hero sits in the band that
  // stays visible on 4:3 .. 21:9 screens next to the hero-select UI
  const SHIFT = 26, back = c; c = new Layer(W + SHIFT, H);
  // house wall on the right with the balcony door
  c.rect(146, 0, 40, 90, P.slab); c.dither(146, 0, 40, 90, P.slabD, 4); c.vline(146, 0, 90, P.slabD);
  c.rect(149, 18, 11, 54, P.roofD); c.frame(149, 18, 11, 54, P.iron); c.rect(151, 21, 9, 22, P.sky2); c.dither(151, 21, 9, 22, P.sky3, 4);
  // the hero stands on the balcony (drawn before the railing)
  const f = new Layer(58, 66);
  // legs
  f.rect(24, 44, 7, 16, P.jeans); f.rect(33, 44, 7, 16, P.jeans); f.vline(30, 44, 16, P.jeansD); f.vline(39, 44, 16, P.jeansD);
  f.hline(24, 58, 7, P.cream); f.hline(33, 58, 7, P.cream);
  f.rect(21, 60, 10, 4, P.white); f.rect(32, 60, 10, 4, P.white); f.hline(21, 63, 10, P.pink); f.hline(32, 63, 10, P.pink);
  // jute bag hanging at the back
  f.line(26, 22, 42, 36, P.juteD); f.line(27, 22, 43, 36, P.jute);
  f.rect(38, 33, 12, 14, P.jute); f.hline(38, 46, 12, P.juteD); f.vline(49, 33, 14, P.juteD);
  f.ellipse(43, 39, 2.2, 2, P.red); f.px(42, 41, P.red); f.px(44, 41, P.red); f.px(43, 42, P.red); f.px(43, 38, P.jute); // printed heart
  // windbreaker (colour-block)
  f.poly([[21, 22], [38, 22], [40, 45], [20, 45]], P.teal);
  f.poly([[20, 34], [40, 34], [40, 45], [20, 45]], P.cream);
  f.hline(20, 34, 21, P.pink); f.hline(20, 35, 21, P.pink);
  f.vline(38, 23, 22, P.tealD); f.hline(20, 44, 21, P.juteD);
  // front arm stretched out to the bow grip
  f.rect(8, 25, 17, 5, P.teal); f.hline(8, 29, 17, P.tealD); f.vline(12, 25, 5, P.pink);
  f.rect(5, 25, 4, 5, P.skin); f.px(5, 29, P.skinD);
  // head: mullet with bangs, facing left
  f.ellipse(33, 11, 10, 10, P.skin);
  f.ellipse(36, 8, 10, 8, P.hair);
  f.rect(38, 8, 8, 12, P.hair); f.rect(44, 12, 3, 7, P.hair); f.px(47, 17, P.hair); // mullet
  f.rect(23, 4, 14, 4, P.hair); f.px(23, 8, P.hair); f.px(26, 8, P.hair); f.px(29, 8, P.hair); f.px(32, 8, P.hair);
  for (const [x, y] of [[30, 2], [35, 1], [41, 4], [44, 9], [26, 5]]) f.px(x, y, P.hairL);
  f.ellipse(38, 13, 1.5, 2, P.skin); f.px(39, 13, P.skinD); f.px(38, 16, P.pink); f.px(38, 17, P.white); // ear with earring
  // focused eye looking along the arrow
  f.hline(25, 9, 5, P.hair); f.rect(26, 11, 3, 3, P.ink); f.px(26, 11, P.white);
  f.px(23, 13, P.skin); f.px(22, 14, P.skinD); // nose
  f.hline(25, 17, 3, P.skinD); f.px(24, 16, P.skinD);
  f.px(31, 15, P.pink); f.px(32, 15, P.pink);
  // back arm drawing the string: elbow out behind the head, hand at the chin
  f.poly([[31, 19], [47, 17], [49, 21], [33, 24]], P.teal);
  f.hline(33, 23, 15, P.tealD); f.px(48, 18, P.tealD); f.vline(36, 19, 5, P.pink);
  f.frame(28, 18, 7, 7, P.ink); f.rect(29, 19, 5, 5, P.skin); f.px(29, 23, P.skinD); f.hline(30, 21, 3, P.skinD); f.px(28, 18, P.skin);
  c.draw(f, 96, 10, P.ink);
  // bow, string and arrow
  const bx = 96 + 6, by = 10 + 27;
  for (let t = -22; t <= 22; t++) { const x = bx - Math.round(6 * Math.cos(t / 22 * Math.PI / 2)); c.px(x, by + t, P.brickD); c.px(x - 1, by + t, P.ink); }
  c.px(bx - 1, by - 23, P.ink); c.px(bx - 1, by + 23, P.ink);
  c.line(bx, by - 22, 96 + 30, 10 + 21, P.cream); c.line(bx, by + 22, 96 + 30, 10 + 22, P.cream);
  c.line(bx - 22, 10 + 21, 96 + 30, 10 + 21, P.jute);
  c.poly([[bx - 26, 10 + 21], [bx - 22, 10 + 19], [bx - 22, 10 + 23]], P.slab); c.px(bx - 26, 31, P.ink);
  c.rect(96 + 25, 10 + 20, 4, 1, P.red); c.rect(96 + 25, 10 + 22, 4, 1, P.red);
  // balcony slab, railing and flower box in front of the hero
  c.rect(84, 72, 66, 4, P.slab); c.hline(84, 75, 66, P.slabD); c.rect(84, 76, 66, 2, P.roofD);
  c.hline(84, 56, 62, P.iron); c.hline(84, 57, 62, P.iron);
  for (let x = 85; x < 146; x += 4) c.vline(x, 58, 14, P.iron);
  c.hline(84, 70, 62, P.iron);
  for (let x = 87; x < 146; x += 8) { c.px(x, 62, P.iron); c.px(x + 1, 63, P.iron); c.px(x - 1, 63, P.iron); c.px(x, 64, P.iron); }
  // flower box hooked on the railing
  c.rect(86, 58, 26, 6, P.brick); c.frame(86, 58, 26, 6, P.ink); c.hline(87, 59, 24, P.brickD);
  for (let k = 0; k < 6; k++) {
    const x = 88 + k * 4, y = 52 + (k % 2);
    c.vline(x + 1, y + 3, 3, P.treeD); c.px(x, y + 4, P.tree); c.px(x + 2, y + 5, P.tree);
    const col = [P.red, P.pink, P.white][k % 3];
    c.rect(x, y, 3, 3, col); c.px(x + 1, y + 1, P.sun); c.px(x - 1, y + 1, col); c.px(x + 3, y + 1, col); c.px(x + 1, y - 1, col);
  }
  back.draw(c, -SHIFT, 0); c = back;
  return c;
};


// =============================================================================
// ROGUE - Tourist: peeking out behind an advertising column on a busy square.
// =============================================================================
SCENES.rogue = () => {
  const P = {
    ink: '1d1c2a', sky: '8cc6e8', skyL: 'bfe2f2', cloud: 'f4fbff', yel: 'e8cf8a', yelD: 'c4a866', sal: 'e0998a', salD: 'b8766c', gray: 'a2a6b4', grayD: '7c8090',
    win: '3b4460', winL: 'f6dc86', shop: '463a4a', pave: 'b8b2aa', paveD: '958f89', paveL: 'd3cdc4', blue: '2f6fc4', white: 'fbf8f0',
    col: '3c7a5a', colD: '285a42', colL: '5aa57c', red: 'e2524e', teal: '3fb3a6', pink: 'ff8fb3', orange: 'ff9a3c', meat: 'a0562e', meatD: '6e3a22',
    skin: 'f4c3a0', skinD: 'd08c78', burn: 'ef6f6a', khaki: 'c8b27c', khakiD: '9c8858', hat: 'f2e2b0', hatD: 'c9b27a',
  };
  let c = new Layer(W, H);
  c.rect(0, 0, W, H, P.shop);
  c.vgrad(0, 0, W, 24, [P.sky, P.skyL]);
  for (const [x, y, w] of [[10, 5, 18], [60, 3, 24], [132, 6, 16]]) { c.rect(x, y, w, 3, P.cloud); c.rect(x + 3, y - 2, w - 9, 2, P.cloud); c.hline(x + 1, y + 3, w - 2, P.skyL); }
  // facades around the square
  const fac = [[0, 10, 30, P.yel, P.yelD], [30, 6, 26, P.sal, P.salD], [56, 12, 34, P.gray, P.grayD], [90, 8, 70, P.yel, P.yelD]];
  for (const [x, y, w, col, dk] of fac) {
    c.rect(x, y, w, 52, col); c.hline(x, y, w, dk); c.hline(x, y + 1, w, P.white);
    c.dither(x, y + 2, w, 48, dk, 4);
    for (let wy = y + 5; wy < 40; wy += 9) for (let wx = x + 3; wx + 5 <= x + w - 1; wx += 8) { c.rect(wx, wy, 5, 6, P.win); c.hline(wx - 1, wy + 6, 7, P.white); if ((wx * 7 + wy) % 5 === 0) c.rect(wx + 1, wy + 1, 3, 4, P.winL); }
  }
  // ground floor shops: Spaeti and Imbiss with rotating spit
  c.rect(0, 42, 90, 18, P.shop);
  c.rect(21, 42, 23, 8, P.ink); c.text('SPÄTI', 23, 44, P.pink);
  c.rect(22, 51, 21, 9, P.win); for (let i = 0; i < 5; i++) { c.rect(24 + i * 4, 55, 2, 5, [P.teal, P.orange, P.white][i % 3]); c.px(24 + i * 4, 54, P.white); }
  c.rect(46, 43, 22, 7, P.red); c.text('GRILL', 48, 44, P.white);
  c.rect(46, 51, 22, 9, P.winL); c.dither(46, 51, 22, 9, P.orange, 4);
  // the spit: stacked cone, drawn as a silhouette
  c.vline(56, 50, 10, P.ink);
  c.poly([[51, 51], [62, 51], [58, 59], [55, 59]], P.meat); for (let y = 52; y < 59; y += 2) c.replace(50, y, 13, 1, { [P.meat]: P.meatD }); c.vline(59, 51, 6, P.orange);
  c.rect(4, 44, 14, 16, P.win); c.frame(4, 44, 14, 16, P.ink);
  // pavement of the square
  c.rect(0, 60, W, 30, P.pave);
  c.hline(0, 60, W, P.paveD);
  for (let y = 64, k = 0; y < H; y += 6 + k, k++) c.hline(0, y, W, P.paveD);
  for (let x = -40; x < W + 40; x += 14) c.line(80 + (x - 80) * 0.35, 61, x, 89, P.paveD);
  c.dither(0, 61, W, 2, P.paveL, 2);
  // U-Bahn entrance: generic blue sign with U, stair railing going down
  const ux = 5; // entrance moved left so the column and hero fit the visible band
  c.vline(ux + 15, 26, 36, P.ink); c.vline(ux + 16, 26, 36, P.grayD);
  c.rect(ux + 10, 17, 12, 12, P.white); c.rect(ux + 11, 18, 10, 10, P.blue); bigText(c, 'U', ux + 14, 19, P.white);
  c.rect(ux - 9, 64, 34, 8, P.ink); c.rect(ux - 7, 66, 30, 6, P.win);
  for (let k = 0; k < 3; k++) c.hline(ux - 6 + k * 2, 67 + k * 2, 28 - k * 4, P.grayD);
  c.hline(ux - 10, 62, 36, P.grayD); c.vline(ux - 10, 62, 10, P.grayD); c.vline(ux + 25, 62, 10, P.grayD);
  // pigeons
  const pigeon = (x, y, flip) => c.stamp(x, y, ['..kk..', '.kgek.', 'kggggk', '.kgdgk', '..kk..', '..o.o.'], { k: P.ink, g: P.gray, e: P.teal, d: P.grayD, o: P.orange }, flip);
  pigeon(8, 76, false); pigeon(34, 78, true); pigeon(58, 80, false);
  c.px(40, 76, P.khaki); c.px(28, 80, P.khaki); c.px(64, 84, P.khaki); // crumbs

  // ------------------------------------------------------------ the hero ----
  const SHIFT = 30, back = c; c = new Layer(W + SHIFT, H);
  const bx = 118, by = 18;
  const body = new Layer(40, 70);
  // legs: shorts, sunburnt knees, pulled-up socks
  body.rect(12, 46, 16, 8, P.khaki); body.vline(20, 48, 6, P.khakiD); body.hline(12, 53, 16, P.khakiD);
  body.rect(13, 54, 5, 5, P.skin); body.rect(22, 54, 5, 5, P.skin); body.px(14, 55, P.burn); body.px(23, 55, P.burn);
  body.rect(13, 59, 5, 5, P.white); body.rect(22, 59, 5, 5, P.white); body.hline(13, 60, 5, P.teal); body.hline(22, 60, 5, P.teal);
  body.rect(11, 64, 8, 3, P.grayD); body.rect(21, 64, 8, 3, P.grayD); body.hline(11, 64, 8, P.white); body.hline(21, 64, 8, P.white);
  // floral shirt
  body.poly([[10, 24], [30, 24], [31, 47], [9, 47]], P.teal);
  for (const [x, y, col] of [[13, 28, P.pink], [24, 27, P.orange], [18, 34, P.white], [27, 38, P.pink], [12, 40, P.orange], [21, 43, P.white]]) { body.px(x, y, col); body.px(x - 1, y, col); body.px(x + 1, y, col); body.px(x, y - 1, col); body.px(x, y + 1, col); body.px(x, y, P.winL); }
  body.vline(20, 25, 21, P.colD);
  // fanny pack in neon orange
  body.hline(9, 42, 22, P.ink); body.rect(8, 41, 10, 7, P.orange); body.frame(8, 41, 10, 7, P.ink); body.hline(9, 44, 8, P.red); body.px(16, 44, P.white);
  // right arm hanging (viewer right)
  body.rect(30, 26, 5, 14, P.teal); body.rect(30, 40, 5, 4, P.skin); body.vline(34, 26, 14, P.colD);
  c.draw(body, bx, by, P.ink);
  // advertising column in front of the body
  const cx0 = 98, cw = 28;
  c.rect(cx0, 14, cw, 70, P.colD);
  c.rect(cx0 + 2, 18, cw - 4, 60, P.white);
  // pasted posters
  c.rect(cx0 + 3, 19, 11, 16, P.pink); c.text('!!!', cx0 + 5, 21, P.ink); c.ellipse(cx0 + 8, 30, 3, 3, P.ink); c.ellipse(cx0 + 8, 30, 2, 2, P.gray); c.px(cx0 + 7, 29, P.white); c.px(cx0 + 9, 31, P.white); c.vline(cx0 + 8, 26, 1, P.ink);
  c.rect(cx0 + 15, 19, 10, 22, P.winL); c.rect(cx0 + 16, 21, 8, 8, P.blue); c.ellipse(cx0 + 20, 25, 2, 2, P.winL); for (let k = 0; k < 5; k++) c.hline(cx0 + 16, 31 + k * 2, 6 - (k % 3), P.grayD);
  c.rect(cx0 + 3, 36, 11, 20, P.teal); c.text('WG', cx0 + 5, 38, P.white); c.text('?', cx0 + 9, 45, P.white); for (let k = 0; k < 4; k++) c.vline(cx0 + 4 + k * 3, 52, 4, P.white);
  c.rect(cx0 + 15, 42, 10, 14, P.orange); c.rect(cx0 + 17, 44, 6, 6, P.red); c.hline(cx0 + 16, 52, 8, P.ink); c.hline(cx0 + 16, 54, 5, P.ink);
  c.rect(cx0 + 3, 57, 22, 20, P.gray); c.rect(cx0 + 5, 59, 18, 9, P.sal); c.text('KUNST', cx0 + 5, 70, P.ink);
  // torn corners
  c.px(cx0 + 13, 34, P.white); c.px(cx0 + 12, 34, P.white); c.px(cx0 + 24, 55, P.white); c.px(cx0 + 3, 76, P.white);
  // cylinder shading
  c.rect(cx0, 14, 3, 70, P.colD); c.vline(cx0 + 2, 18, 60, P.grayD); c.vline(cx0 + cw - 3, 18, 60, P.grayD); c.dither(cx0 + 2, 18, 3, 60, P.grayD, 2);
  c.vline(cx0 + cw - 6, 18, 60, P.cloud);
  c.rect(cx0 - 1, 12, cw + 2, 4, P.col); c.hline(cx0 - 1, 12, cw + 2, P.colL); c.rect(cx0 - 1, 78, cw + 2, 7, P.col); c.hline(cx0 - 1, 78, cw + 2, P.colL);
  c.ellipse(cx0 + cw / 2 - 0.5, 10, 12, 4, P.col); c.hline(cx0 + 3, 7, cw - 6, P.colL);
  c.rect(cx0 + 12, 1, 3, 5, P.col); c.px(cx0 + 13, 0, P.colL);
  for (const [x0, x1] of [[cx0 - 1, cx0 + cw]]) { c.vline(x0, 12, 73, P.ink); c.vline(x1, 12, 73, P.ink); }
  c.hline(cx0 - 1, 85, cw + 2, P.ink);
  // head, hat and camera leaning out in front of the column edge
  const h = new Layer(40, 30);
  h.ellipse(24, 15, 8, 7, P.skin);
  h.px(18, 16, P.burn); h.px(17, 16, P.burn); h.px(17, 17, P.burn); // sunburnt nose
  h.px(28, 17, P.pink); h.px(29, 17, P.pink);
  h.hline(21, 20, 4, P.skinD); h.px(25, 19, P.skinD); // sly smirk
  h.rect(26, 13, 2, 2, P.ink); h.px(26, 13, P.white); // one open eye, the other one at the viewfinder
  // wide sun hat
  h.ellipse(24, 9, 13, 3, P.hat); h.hline(11, 10, 27, P.hatD);
  h.ellipse(24, 5, 7, 5, P.hat); h.hline(17, 7, 15, P.pink); h.hline(17, 8, 15, P.red);
  h.px(21, 2, P.cloud); h.px(22, 2, P.cloud);
  // camera held up to the face, lens pointing left
  h.rect(9, 12, 12, 8, P.grayD); h.hline(9, 12, 12, P.gray); h.rect(12, 10, 4, 2, P.grayD);
  h.ellipse(8, 16, 3.2, 3.2, P.ink); h.ellipse(8, 16, 1.6, 1.6, P.blue); h.px(7, 15, P.white);
  h.rect(19, 13, 1, 1, P.red);
  h.rect(18, 19, 6, 4, P.skin); h.px(18, 22, P.skinD); h.rect(9, 20, 4, 3, P.skin); // hands
  h.line(15, 22, 22, 28, P.ink); // camera strap
  c.draw(h, bx - 4, by - 2, P.ink);
  // a tiny flash spark to hint at the "surprise"
  c.px(bx - 1, by + 8, P.white); c.px(bx - 2, by + 8, P.winL); c.px(bx, by + 8, P.winL); c.px(bx - 1, by + 7, P.winL); c.px(bx - 1, by + 9, P.winL);
  back.draw(c, -SHIFT, 0); c = back;
  return c;
};


// =============================================================================
// SEWERS - Neukoellner Hinterhoefe: bins, bike corpses, cellar stairs into green.
// =============================================================================
SCENES.sewers = () => {
  const P = {
    ink: '15151f', sky: '1d2140', star: 'c9d2ff', wall: '4a4c63', wallD: '393a4f', wallL: '5d5f78', side: '3a3b50', sideD: '2c2c3e',
    win: '262840', winL: 'ffcf6e', winM: 'd98f45', ground: '4d4a52', groundD: '3b3940', groundL: '625e66',
    glow: '9cff6a', glowM: '4fc45a', glowD: '2a7a44', glowDD: '1b4a33', steel: '8a8fa3', steelD: '5c6073',
    grey: '6c7280', blue: '3a6fb8', yel: 'e6c34a', brown: '8a5a3a', rust: 'b0603a', box: 'c4955a', boxD: '93683c', white: 'e6e2d8', pink: 'e98aa7',
  };
  const c = new Layer(W, H);
  c.rect(0, 0, W, H, P.ground);
  // strip of night sky at the top of the courtyard well
  c.rect(30, 0, 100, 8, P.sky);
  for (const [x, y] of [[40, 2], [58, 5], [77, 1], [96, 4], [118, 2], [108, 6]]) c.px(x, y, P.star);
  c.ellipse(64, 3, 2, 2, P.star); c.px(65, 2, P.sky);
  // back wall (Hinterhaus)
  c.rect(34, 6, 92, 54, P.wall); c.dither(34, 6, 92, 54, P.wallD, 4);
  c.hline(34, 6, 92, P.wallL);
  const lit = new Set(['0,1', '2,0', '4,2', '1,3', '5,1']);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
    const x = 40 + k * 14, y = 10 + r * 11;
    if (r === 3 && (k === 2 || k === 3)) continue;
    c.rect(x - 1, y - 1, 9, 9, P.wallL); c.rect(x, y, 7, 7, lit.has(k + ',' + r) ? P.winL : P.win);
    if (lit.has(k + ',' + r)) { c.rect(x, y + 4, 7, 3, P.winM); c.px(x + 5, y + 1, P.white); }
    c.vline(x + 3, y, 7, P.wallD);
  }
  // laundry line across the courtyard
  c.line(34, 20, 126, 24, P.steelD);
  for (const [x, col, h] of [[52, P.pink, 4], [58, P.white, 3], [96, P.blue, 5], [104, P.yel, 3]]) { const y = 20 + Math.round((x - 34) * 4 / 92) + 1; c.rect(x, y, 4, h, col); }
  // side walls converging towards the back
  c.poly([[0, 0], [34, 6], [34, 60], [0, 78]], P.side);
  c.poly([[160, 0], [126, 6], [126, 60], [160, 78]], P.side);
  c.dither(0, 0, 34, 78, P.sideD, 4); c.dither(126, 0, 34, 78, P.sideD, 4, 1);
  c.line(34, 6, 34, 60, P.sideD); c.line(126, 6, 126, 60, P.sideD);
  for (const [x, y] of [[8, 12], [18, 16], [8, 36], [18, 38]]) { c.rect(x, y, 6, 12, P.win); c.frame(x - 1, y - 1, 8, 14, P.wallL); }
  c.rect(142, 14, 6, 12, P.winL); c.frame(141, 13, 8, 14, P.wallL); c.rect(142, 20, 6, 6, P.winM);
  c.rect(142, 36, 6, 12, P.win); c.frame(141, 35, 8, 14, P.wallL);
  // drain pipe on the right wall
  c.vline(133, 0, 66, P.steelD); c.vline(134, 0, 66, P.steel);
  // courtyard floor (cobbles), receding
  c.poly([[0, 78], [34, 60], [126, 60], [160, 78], [160, 90], [0, 90]], P.ground);
  for (let y = 62, k = 0; y < H; y += 3 + (k >> 1), k++) for (let x = (k % 2) * 3; x < W; x += 6) { c.px(x, y, P.groundD); c.px(x + 1, y, P.groundD); c.px(x + 2, y - 1, P.groundL); }
  c.hline(34, 60, 92, P.groundD);
  // cellar stairs in the middle, sinking towards a green-lit door
  c.poly([[60, 64], [100, 64], [104, 90], [56, 90]], P.ink);
  c.rect(63, 64, 34, 11, P.glowDD);                         // far wall of the stairwell
  c.dither(63, 64, 34, 11, P.glowD, 4);
  c.rect(74, 65, 12, 10, P.glow); c.dither(74, 65, 12, 10, P.glowM, 4); c.frame(73, 64, 14, 11, P.ink); c.vline(79, 66, 9, P.glowM);
  c.px(84, 70, P.ink); c.dither(69, 64, 22, 11, P.glowM, 4, 1);
  const treads = [P.glowM, P.glowM, P.glowD, P.glowD, P.groundD, P.groundD];
  treads.forEach((col, i) => {
    const y = 75 + i * 2.6, spread = Math.floor((y - 64) / 7);
    const x0 = 63 - spread, x1 = 97 + spread;
    c.rect(x0, Math.round(y), x1 - x0, 2, col); c.hline(x0, Math.round(y) + 2, x1 - x0, P.ink);
  });
  c.poly([[60, 64], [63, 64], [63, 75], [58, 90], [56, 90]], P.sideD);
  c.poly([[97, 64], [100, 64], [104, 90], [102, 90], [97, 75]], P.sideD);
  // rails
  c.line(60, 64, 54, 90, P.steel); c.line(100, 64, 106, 90, P.steel);
  c.line(60, 58, 60, 64, P.steelD); c.line(100, 58, 100, 64, P.steelD); c.line(60, 58, 53, 84, P.steel); c.line(100, 58, 107, 84, P.steel);
  // rising green wisps
  for (const [x, y] of [[70, 58], [85, 54], [92, 60], [76, 50], [88, 46]]) { c.px(x, y, P.glowM); c.px(x + 1, y - 1, P.glowD); c.px(x - 1, y + 1, P.glowD); }
  // bins on the left
  const bin = (x, y, col, lidUp) => {
    c.rect(x, y, 13, 16, col); c.frame(x, y, 13, 16, P.ink); c.vline(x + 3, y + 2, 12, P.ink); c.vline(x + 9, y + 2, 12, P.ink);
    c.rect(x + 1, y + 1, 11, 2, P.white); c.dither(x + 1, y + 1, 11, 2, col, 2);
    if (lidUp) { c.poly([[x - 1, y], [x + 13, y], [x + 16, y - 9], [x + 2, y - 9]], P.grey); c.line(x - 1, y, x + 2, y - 9, P.ink); c.line(x + 2, y - 9, x + 16, y - 9, P.ink); c.line(x + 13, y, x + 16, y - 9, P.ink); }
    else { c.rect(x - 1, y - 2, 15, 3, P.grey); c.frame(x - 1, y - 2, 15, 3, P.ink); }
    c.rect(x + 1, y + 16, 2, 2, P.ink); c.rect(x + 10, y + 16, 2, 2, P.ink);
  };
  bin(4, 66, P.grey, false); bin(19, 64, P.blue, false); bin(34, 62, P.yel, true); bin(-8, 72, P.brown, false);
  // overflowing yellow bin with a cute rat on top
  c.ellipse(40, 61, 5, 2, P.white); c.px(37, 60, P.yel); c.px(43, 59, P.pink);
  c.stamp(44, 78, ['..kk.......', '.kggkkkk...', 'kegggggggk.', 'kgggggggggk', 'pkgggggggk.', '.kkkkkkkk.p', '..k.k..k.pp'], { k: P.ink, g: P.grey, e: P.white, p: P.pink }, true);
  // bike corpses leaning on the right wall
  const wheel = (x, y, r, bent) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; c.px(x + Math.cos(t) * r * (bent && Math.cos(t) > 0 ? 0.7 : 1), y + Math.sin(t) * r, P.ink); } c.px(x, y, P.steel); };
  wheel(118, 76, 7, true); wheel(140, 77, 7, false);
  c.line(118, 76, 128, 66, P.rust); c.line(128, 66, 140, 77, P.rust); c.line(122, 66, 132, 66, P.rust); c.line(128, 66, 126, 62, P.steel); c.line(136, 64, 140, 77, P.rust);
  c.line(135, 63, 139, 63, P.steel);
  wheel(148, 82, 6, false); c.line(148, 82, 157, 72, P.pink); c.line(157, 72, 160, 76, P.pink);
  c.frame(130, 63, 5, 7, P.yel); // lock still on the pipe, bike long gone
  // "zu verschenken" box
  c.rect(100, 76, 16, 10, P.box); c.frame(100, 76, 16, 10, P.ink); c.poly([[100, 76], [104, 71], [108, 76]], P.boxD); c.poly([[108, 76], [113, 72], [116, 76]], P.boxD);
  c.hline(103, 80, 9, P.boxD); c.hline(103, 82, 6, P.boxD); c.rect(110, 71, 3, 4, P.pink);
  return c;
};


// =============================================================================
// PRISON - Das Amt ohne Termin: an endless corridor of chairs, counters, numbers.
// =============================================================================
SCENES.prison = () => {
  const P = {
    ink: '161a1f', void: '10151a',
    wall: ['c2c8a4', 'a3aa8b', '7d846d', '555c4e', '343a33'], wallB: ['8e9477', '747a62', '5b614f', '3e4439', '272c27'],
    floorA: ['8a9884', '727f6e', '586356', '3d463e', '262d29'], floorB: ['a6b39c', '8a9784', '6a7566', '484f47', '2c332e'],
    ceil: ['d8dccb', 'b4b8a8', '878b80', '5a5e58', '343834'], tube: 'fbfff0', tubeG: 'e6f5c8',
    counter: '7a5a3e', counterL: 'a37c55', glass: '9fc8c8', glassD: '5f8b8e', red: 'ff4a3a', redD: '7a1d1a', led: '2a0f10',
    chair: 'e07a3a', chairD: 'a8532a', chairL: 'f2a266', steel: '8a8f96', bone: 'efe8d4', boneD: 'b8ae96', paper: 'f6f3e6', blue: '3f6fb0',
  };
  const c = new Layer(W, H);
  c.rect(0, 0, W, H, P.void);
  const VX = 80, VY = 40, F = 80;
  const pr = (X, Y, z) => [VX + X * F / z, VY + Y * F / z];
  const fog = z => (z < 2.2 ? 0 : z < 4 ? 1 : z < 7 ? 2 : z < 12 ? 3 : 4);
  const FL = 0.62, CE = -0.52;
  const zs = []; for (let z = 36; z >= 1; z -= 0.75) zs.push(z);
  zs.forEach((z0, n) => {
    const z1 = z0 - 0.75 < 0.6 ? 0.6 : z0 - 0.75, k = fog(z1), odd = Math.round(z0 / 0.75) % 2;
    // floor tiles in four lanes
    for (let lane = 0; lane < 4; lane++) {
      const xa = -1 + lane * 0.5, xb = xa + 0.5;
      c.poly([pr(xa, FL, z0), pr(xb, FL, z0), pr(xb, FL, z1), pr(xa, FL, z1)], (lane + odd) % 2 ? P.floorA[k] : P.floorB[k]);
    }
    // ceiling
    c.poly([pr(-1, CE, z0), pr(1, CE, z0), pr(1, CE, z1), pr(-1, CE, z1)], P.ceil[k]);
    // walls with a darker skirting
    for (const X of [-1, 1]) {
      c.poly([pr(X, CE, z0), pr(X, FL, z0), pr(X, FL, z1), pr(X, CE, z1)], P.wall[k]);
      c.poly([pr(X, FL - 0.12, z0), pr(X, FL, z0), pr(X, FL, z1), pr(X, FL - 0.12, z1)], P.wallB[k]);
    }
  });
  // fluorescent tubes, counters and doors, drawn from far to near
  for (let z = 30; z >= 1.5; z -= 3) {
    const k = fog(z);
    const [ax, ay] = pr(-0.25, CE, z), [bx] = pr(0.25, CE, z);
    c.hline(ax, ay + 1, Math.max(1, bx - ax), k < 3 ? P.tube : P.ceil[Math.min(4, k)]);
    if (k < 2) c.hline(ax, ay + 2, bx - ax, P.tubeG);
    // counter window on the left wall
    const za = z + 0.2, zb = z + 1.4;
    c.poly([pr(-1, -0.25, za), pr(-1, 0.25, za), pr(-1, 0.25, zb), pr(-1, -0.25, zb)], k < 3 ? P.glassD : P.wallB[k]);
    c.poly([pr(-1, 0.18, za), pr(-1, 0.25, za), pr(-1, 0.25, zb), pr(-1, 0.18, zb)], k < 3 ? P.counterL : P.wallB[k]);
    if (k < 3) { const [lx, ly] = pr(-1, -0.33, (za + zb) / 2); c.rect(Math.round(lx) - 1, Math.round(ly), 3, 2, P.red); }
    // door on the right wall
    const zc = z - 0.4, zd = z + 0.5;
    c.poly([pr(1, -0.3, zc), pr(1, FL, zc), pr(1, FL, zd), pr(1, -0.3, zd)], k < 4 ? P.wallB[Math.min(4, k + 1)] : P.void);
  }
  // receding rows of waiting chairs along the right wall
  for (let z = 14; z >= 1.8; z -= 0.9) {
    const k = fog(z), col = k < 2 ? P.chair : k < 3 ? P.chairD : P.wallB[k], dk = k < 2 ? P.chairD : P.wallB[Math.min(4, k + 1)];
    c.poly([pr(0.72, 0.28, z), pr(0.98, 0.28, z), pr(0.98, 0.28, z + 0.6), pr(0.72, 0.28, z + 0.6)], col);
    c.poly([pr(0.98, -0.05, z), pr(0.98, 0.28, z), pr(0.98, 0.28, z + 0.6), pr(0.98, -0.05, z + 0.6)], dk);
    const [lx, ly] = pr(0.74, 0.28, z), [, fy] = pr(0.74, FL, z); c.vline(lx, ly + 1, Math.max(0, fy - ly - 1), k < 3 ? P.steel : P.wallB[k]);
  }
  // endless dark at the vanishing point
  c.rect(VX - 2, VY - 1, 5, 3, P.void);
  // number display hanging from the ceiling
  c.vline(72, 0, 12, P.ink); c.vline(88, 0, 12, P.ink);
  c.rect(62, 12, 36, 12, P.ink); c.rect(63, 13, 34, 10, P.led);
  c.text('NR', 65, 16, P.redD); c.text('0815', 76, 16, P.red); c.px(73, 20, P.redD);
  // foreground: row of orange waiting chairs on the right
  const chair = (x, y, occupied) => {
    c.rect(x, y, 14, 12, P.chair); c.frame(x, y, 14, 12, P.ink); c.hline(x + 1, y + 1, 12, P.chairL);
    c.rect(x - 1, y + 12, 16, 4, P.chairD); c.frame(x - 1, y + 12, 16, 4, P.ink); c.hline(x, y + 12, 14, P.chair);
    c.vline(x + 1, y + 16, 7, P.steel); c.vline(x + 12, y + 16, 7, P.steel);
  };
  c.hline(112, 83, 48, P.steel);
  chair(115, 60, false); chair(131, 60, true); chair(147, 60, false);
  // a patient skeleton still holding its waiting ticket
  const sk = new Layer(20, 30);
  sk.ellipse(9, 5, 5, 5, P.bone); sk.rect(7, 9, 5, 3, P.bone); sk.hline(7, 10, 5, P.boneD);
  sk.rect(6, 5, 2, 2, P.ink); sk.rect(11, 5, 2, 2, P.ink); sk.px(9, 8, P.ink);
  sk.px(8, 11, P.ink); sk.px(10, 11, P.ink);
  sk.vline(9, 12, 10, P.bone); for (let r = 0; r < 4; r++) sk.hline(6, 13 + r * 2, 7, P.bone);
  sk.rect(6, 22, 8, 2, P.bone);
  sk.line(6, 13, 3, 20, P.bone); sk.line(12, 13, 16, 19, P.bone);
  sk.rect(14, 17, 5, 7, P.paper); sk.text('99', 14, 19, P.ink, 0);
  sk.line(7, 24, 4, 29, P.bone); sk.line(12, 24, 15, 29, P.bone);
  c.draw(sk, 128, 43, P.ink);
  // ticket dispenser in the left foreground
  c.rect(10, 44, 18, 46, P.blue); c.frame(10, 44, 18, 46, P.ink); c.hline(11, 45, 16, P.glass);
  c.rect(13, 50, 12, 8, P.led); c.text('?', 17, 51, P.red);
  c.rect(14, 62, 10, 3, P.ink); c.rect(16, 65, 6, 9, P.paper); c.text('9', 17, 67, P.ink);
  c.rect(15, 76, 8, 6, P.glassD); c.frame(15, 76, 8, 6, P.ink);
  // dust motes / papers on the floor
  for (const [x, y, r] of [[40, 80, 0], [58, 74, 1], [98, 78, 0]]) { c.rect(x, y, 4, 2, P.paper); c.px(x + (r ? 3 : 0), y - 1, P.paper); }
  return c;
};


// =============================================================================
// CAVES - Die ewige Baustelle: a subway tunnel under permanent construction.
// =============================================================================
SCENES.caves = () => {
  const P = {
    ink: '141216', void: '0e0c10',
    ringA: ['8c8076', '6f655e', '524b47', '38332f', '221f1f'], ringB: ['7b7068', '615852', '48423e', '302c29', '1c1a1a'],
    ball: ['6d6560', '57504c', '403b39', '2b2827', '1a1818'], ballL: '877e76', sleeper: '5a3f2e', rail: 'c9ccd2', railD: '8a8e96',
    bulb: 'ffd36a', bulbG: 'b8873a', red: 'e0463c', white: 'f1ece0', yel: 'f2c230', yelD: 'b8871e', yelL: 'ffe27a',
    steel: '9aa0a8', steelD: '646a73', wood: 'b07a45', woodD: '7d522c', blue: '3d6fb6', dust: 'c9b89a', teal: '4fb3a8',
  };
  const c = new Layer(W, H);
  c.rect(0, 0, W, H, P.void);
  const VX = 72, VY = 42, F = 90;
  const pr = (X, Y, z) => [VX + X * F / z, VY + Y * F / z];
  const fog = z => (z < 1.8 ? 0 : z < 3.2 ? 1 : z < 6 ? 2 : z < 11 ? 3 : 4);
  const FL = 0.55;
  const arch = z => { const pts = [pr(-1.05, FL, z)]; for (let a = 0; a <= 16; a++) { const t = Math.PI - a / 16 * Math.PI; pts.push(pr(Math.cos(t) * 1.05, -0.05 - Math.sin(t) * 0.75, z)); } pts.push(pr(1.05, FL, z)); return pts; };
  // tunnel rings (tubbing segments), near to far
  for (let z = 0.9, n = 0; z < 40; z *= 1.16, n++) c.poly(arch(z), n % 2 ? P.ringA[fog(z)] : P.ringB[fog(z)]);
  c.poly(arch(40), P.void);
  // track bed: ballast, sleepers and two rails converging
  const floor = [pr(-1.05, FL, 0.9), pr(1.05, FL, 0.9), pr(1.05, FL, 40), pr(-1.05, FL, 40)];
  c.poly(floor, P.ball[2]);
  for (let z = 0.9, n = 0; z < 40; z *= 1.12, n++) {
    const k = fog(z);
    c.poly([pr(-1.05, FL, z), pr(1.05, FL, z), pr(1.05, FL, z * 1.12), pr(-1.05, FL, z * 1.12)], P.ball[k]);
    if (k < 4) c.poly([pr(-0.55, FL, z), pr(0.55, FL, z), pr(0.55, FL, z * 1.04), pr(-0.55, FL, z * 1.04)], k < 2 ? P.sleeper : P.ball[Math.min(4, k + 1)]);
  }
  for (let y = 70; y < H; y += 3) for (let x = (y * 7) % 5; x < W; x += 5) c.px(x, y, P.ballL);
  for (const X of [-0.38, 0.38]) {
    const [x0, y0] = pr(X, FL, 0.9), [x1, y1] = pr(X, FL, 30);
    c.line(x0, y0, x1, y1, P.rail); c.line(x0 + (X < 0 ? 1 : -1), y0, x1, y1, P.railD);
  }
  // string of work lights along the crown of the tunnel
  for (let z = 1.3; z < 24; z *= 1.3) {
    const [x, y] = pr(0.55, -0.62, z), k = fog(z);
    if (k < 2) c.dither(x - 3, y - 2, 7, 6, P.bulbG, 4);
    c.px(x, y, P.bulb); if (k < 2) { c.px(x + 1, y, P.bulb); c.px(x, y + 1, P.bulb); c.px(x + 1, y + 1, P.yelL); }
    const [nx, ny] = pr(0.55, -0.62, z * 1.3); c.line(x, y - 1, nx, ny - 1, P.ink);
  }
  // scaffolding on the left with an optimistic sign
  const sx = 8, sy = 12;
  for (const x of [sx, sx + 20, sx + 40]) { c.vline(x, sy, 78 - sy, P.steelD); c.vline(x + 1, sy, 78 - sy, P.steel); }
  for (const y of [sy + 2, sy + 26, sy + 50]) { c.hline(sx - 2, y, 46, P.steel); c.hline(sx - 2, y + 1, 46, P.steelD); c.rect(sx - 2, y - 3, 46, 3, P.wood); c.hline(sx - 2, y - 3, 46, P.dust); c.hline(sx - 2, y - 1, 46, P.woodD); }
  for (let k = 0; k < 2; k++) { c.line(sx + 1, sy + 2 + k * 24, sx + 20, sy + 26 + k * 24, P.steelD); c.line(sx + 21, sy + 26 + k * 24, sx + 40, sy + 2 + k * 24, P.steelD); }
  c.rect(sx + 3, sy + 30, 36, 15, P.white); c.frame(sx + 3, sy + 30, 36, 15, P.ink);
  c.text('BAUENDE', sx + 6, sy + 32, P.blue); c.text('20??', sx + 13, sy + 38, P.red);
  // a worker's thermos and hard hat left on the planks
  c.rect(sx + 26, sy + 6, 7, 3, P.yel); c.ellipse(sx + 29, sy + 6, 3, 2, P.yel); c.hline(sx + 25, sy + 8, 9, P.yelD);
  c.rect(sx + 6, sy + 17, 3, 6, P.teal); c.hline(sx + 6, sy + 17, 3, P.white);
  // warning barriers across the track
  const bake = (x, y, h) => {
    c.rect(x, y, 5, h, P.white); for (let j = 0; j < h; j += 4) c.rect(x, y + j, 5, 2, P.red);
    c.frame(x - 1, y - 1, 7, h + 2, P.ink); c.rect(x - 2, y + h, 9, 3, P.ink); c.rect(x + 1, y - 4, 3, 3, P.yel); c.px(x + 2, y - 5, P.yelL);
    c.dither(x - 3, y - 7, 11, 7, P.bulbG, 4);
  };
  bake(58, 60, 16); bake(88, 58, 16);
  c.rect(52, 64, 44, 4, P.white); for (let x = 52; x < 96; x += 8) c.rect(x, 64, 4, 4, P.red); c.frame(51, 63, 46, 6, P.ink);
  bake(46, 66, 18);
  // the tunnel drill rig on tracks (right)
  const m = new Layer(52, 40);
  m.rect(2, 28, 40, 9, P.ink); for (let x = 5; x < 40; x += 6) m.ellipse(x, 32, 2, 2, P.steelD); m.hline(3, 28, 38, P.steelD);
  m.rect(6, 14, 30, 14, P.yel); m.hline(6, 14, 30, P.yelL); m.hline(6, 27, 30, P.yelD);
  for (let x = 8; x < 34; x += 6) m.line(x, 25, x + 3, 22, P.ink);
  m.rect(24, 4, 12, 10, P.yel); m.frame(24, 4, 12, 10, P.yelD); m.rect(26, 6, 8, 6, P.teal); m.px(27, 7, P.white); // cab
  m.rect(26, 1, 3, 3, P.red); m.px(27, 0, P.yelL);
  // the drill arm reaching left with a spiral bit
  m.poly([[8, 16], [2, 10], [4, 8], [12, 14]], P.yelD);
  m.rect(0, 12, 4, 6, P.steelD);
  c.draw(m, 110, 44, P.ink);
  const tipx = 104, tipy = 58;
  c.poly([[tipx + 7, tipy - 4], [tipx + 7, tipy + 4], [tipx - 6, tipy]], P.steel);
  for (let k = 0; k < 4; k++) c.line(tipx + 6 - k * 3, tipy - 3 + k, tipx + 4 - k * 3, tipy + 3 - k, P.steelD);
  c.px(tipx - 6, tipy, P.white);
  for (const [dx, dy] of [[-9, -3], [-11, 1], [-8, 4], [-13, -1], [-10, -6]]) { c.px(tipx + dx, tipy + dy, P.dust); c.px(tipx + dx - 1, tipy + dy, P.ringA[1]); }
  return c;
};


// =============================================================================
// CITY - Das Renditequartier: a glass tower swallowing an Altbau, cranes, lobby.
// =============================================================================
SCENES.city = () => {
  const P = {
    ink: '161724', sky1: '3a4a78', sky2: '6a7fb0', sky3: 'a7b6d4', sky4: 'd9cfd8',
    glass: '4a7fa6', glassD: '325c80', glassL: '8fc4dc', glassW: 'd8f2f7', frame: '2a3c52',
    alt: 'c99a74', altD: 'a07556', altL: 'e2bd96', altW: '3e3448', altWL: 'ffd88a',
    crane: 'f2b632', craneD: 'b27f1c', old: '8a8494', oldD: '6a6474', oldL: 'a39eab',
    lobby: 'ffe8b0', lobbyD: 'e0b86a', marble: 'efe9e2', gold: 'e9c35a', red: 'c8323e', green: '5c8f4a', greenD: '3d6636',
    street: '5a5866', streetD: '46444f', curb: '9a96a0', white: 'fbf8f2', pink: 'f08aa8',
  };
  const c = new Layer(W, H);
  c.vgrad(0, 0, W, 80, [P.sky1, P.sky2, P.sky3, P.sky4]);
  // tower cranes
  const crane = (mx, top, jibL, jibR, hookX, hookLen) => {
    for (let y = top; y < 78; y++) { c.px(mx, y, P.craneD); c.px(mx + 3, y, P.craneD); if (y % 4 === 0) c.hline(mx, y, 4, P.crane); if (y % 4 === 2) { c.px(mx + 1, y, P.crane); c.px(mx + 2, y, P.crane); } }
    c.rect(jibL, top - 1, jibR - jibL, 1, P.crane); c.rect(jibL, top + 2, jibR - jibL, 1, P.craneD);
    for (let x = jibL; x < jibR; x += 3) { c.px(x, top, P.craneD); c.px(x + 1, top + 1, P.craneD); }
    c.poly([[mx, top - 1], [mx + 1, top - 8], [mx + 3, top - 8], [mx + 4, top - 1]], P.crane);
    c.line(mx + 2, top - 8, jibL, top - 1, P.craneD); c.line(mx + 2, top - 8, jibR, top - 1, P.craneD);
    c.vline(hookX, top + 3, hookLen, P.ink); c.rect(hookX - 1, top + 3 + hookLen, 3, 2, P.crane);
  };
  crane(14, 12, 4, 72, 52, 14);
  crane(146, 6, 108, 160, 118, 8);
  // shabby neighbours at the edges
  c.rect(0, 40, 30, 38, P.old); c.dither(0, 40, 30, 38, P.oldD, 4); c.hline(0, 40, 30, P.oldL);
  for (let y = 44; y < 72; y += 9) for (let x = 3; x < 28; x += 8) c.rect(x, y, 4, 6, (x + y) % 3 ? P.altW : P.altWL);
  c.text('MIETE?', 3, 70, P.pink); // graffiti
  c.rect(146, 44, 14, 34, P.old); c.dither(146, 44, 14, 34, P.oldD, 4); c.hline(146, 44, 14, P.oldL);
  for (let y = 48; y < 72; y += 9) c.rect(150, y, 4, 6, P.altW);
  // the glass tower
  const gx = 34, gy = 10, gw = 110, gh = 68;
  c.rect(gx, gy, gw, gh, P.glass);
  for (let y = gy; y < gy + gh; y += 6) c.hline(gx, y, gw, P.frame);
  for (let x = gx; x < gx + gw; x += 8) c.vline(x, gy, gh, P.frame);
  // sky reflection bands, diagonal glare
  for (let y = gy + 1; y < gy + gh; y += 6) for (let x = gx + 1; x < gx + gw; x += 8) { if (((x >> 3) + (y / 6 | 0)) % 3 === 0) c.rect(x, y, 7, 5, P.glassD); }
  for (let k = 0; k < 3; k++) for (let t = 0; t < 70; t++) { const x = gx + 20 + k * 34 + t * 0.5 - 18, y = gy + gh - 1 - t; if (y > gy && x > gx && x < gx + gw) { c.px(x, y, P.glassL); if (k === 1) c.px(x + 1, y, P.glassW); } }
  c.rect(gx - 2, gy - 3, gw + 4, 3, P.frame); c.rect(gx + 30, gy - 6, 30, 3, P.frame); c.hline(gx - 2, gy - 3, gw + 4, P.glassL);
  // marketing banner
  c.rect(gx + 58, gy + 6, 46, 9, P.white); c.frame(gx + 58, gy + 6, 46, 9, P.ink); c.text('NEU GEDACHT', gx + 60, gy + 8, P.ink);
  // the Altbau being swallowed: ornate facade half inside the glass
  const ax = 46, ay = 30, aw = 40, ah = 48;
  c.rect(ax, ay, aw, ah, P.alt); c.dither(ax, ay, aw, ah, P.altD, 4);
  c.rect(ax - 2, ay - 3, aw + 4, 3, P.altL); c.hline(ax - 2, ay - 1, aw + 4, P.altD);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const x = ax + 3 + k * 10, y = ay + 3 + r * 11;
    if (r === 3 && k > 0 && k < 3) continue;
    c.rect(x - 1, y - 2, 8, 2, P.altL); c.px(x + 3, y - 3, P.altL);
    c.rect(x, y, 6, 8, (k * 3 + r) % 4 === 1 ? P.altWL : P.altW); c.vline(x + 3, y, 8, P.altD);
    c.hline(x - 1, y + 8, 8, P.altL);
  }
  c.rect(ax + 14, ay + 36, 12, 12, P.altD); c.rect(ax + 15, ay + 37, 10, 11, P.altW); c.poly([[ax + 14, ay + 36], [ax + 20, ay + 32], [ax + 26, ay + 36]], P.altL);
  // glass jaws closing over the Altbau (with a few rather smug teeth)
  c.poly([[ax - 3, ay - 5], [ax + 26, ay - 5], [ax + 12, ay + 14], [ax - 3, ay + 20]], P.glass);
  c.poly([[ax + 26, ay - 5], [ax + aw + 3, ay - 5], [ax + aw + 3, ay + 8]], P.glassD);
  c.line(ax - 3, ay + 20, ax + 12, ay + 14, P.frame); c.line(ax + 12, ay + 14, ax + 26, ay - 5, P.frame); c.line(ax + 26, ay - 5, ax + aw + 3, ay + 8, P.frame);
  for (const t of [0.2, 0.45, 0.7]) { const x = Math.round(ax - 3 + t * 15), y = Math.round(ay + 20 - t * 6); c.poly([[x, y - 1], [x + 3, y - 1], [x + 1, y + 3]], P.glassW); }
  for (const t of [0.3, 0.7]) { const x = Math.round(ax + 12 + t * 14), y = Math.round(ay + 14 - t * 19); c.poly([[x - 1, y], [x + 2, y - 1], [x + 1, y + 3]], P.glassW); }
  for (const [x, y] of [[ax + 30, ay + 12], [ax + 34, ay + 18], [ax + 27, ay + 22]]) { c.rect(x, y, 2, 2, P.altL); c.px(x + 2, y + 1, P.altD); } // crumbling stucco
  // concierge lobby on the right
  const lx = 92, ly = 56;
  c.rect(lx, ly, 48, 22, P.lobby); c.frame(lx - 1, ly - 1, 50, 23, P.frame);
  c.dither(lx, ly, 48, 6, P.lobbyD, 4);
  c.rect(lx + 6, ly + 2, 36, 3, P.gold); c.text('LOFTS', lx + 15, ly - 8, P.gold);
  c.rect(lx + 14, ly - 9, 21, 7, P.frame); c.text('LOFTS', lx + 15, ly - 8, P.gold);
  c.rect(lx + 16, ly + 12, 18, 7, P.marble); c.hline(lx + 16, ly + 12, 18, P.gold); c.frame(lx + 16, ly + 12, 18, 7, P.lobbyD);
  // concierge with bow tie
  c.ellipse(lx + 25, ly + 7, 2.5, 2.5, P.altL); c.rect(lx + 22, ly + 9, 7, 3, P.ink); c.px(lx + 25, ly + 9, P.red); c.px(lx + 24, ly + 9, P.red); c.px(lx + 26, ly + 9, P.red);
  c.px(lx + 24, ly + 7, P.ink); c.px(lx + 26, ly + 7, P.ink); c.hline(lx + 23, ly + 4, 5, P.ink);
  c.rect(lx + 30, ly + 10, 3, 2, P.gold); // service bell
  // olive trees in pots, red carpet
  for (const x of [lx + 3, lx + 41]) { c.rect(x, ly + 15, 5, 5, P.marble); c.frame(x, ly + 15, 5, 5, P.ink); c.vline(x + 2, ly + 9, 6, P.altD); c.ellipse(x + 2, ly + 8, 3, 3, P.green); c.px(x + 1, ly + 7, P.greenD); c.px(x + 3, ly + 9, P.greenD); }
  c.poly([[lx + 18, ly + 22], [lx + 32, ly + 22], [lx + 36, 90], [lx + 14, 90]], P.red);
  // street
  c.rect(0, 78, W, 12, P.street); c.hline(0, 78, W, P.curb); c.hline(0, 79, W, P.oldL); c.dither(0, 80, W, 10, P.streetD, 4);
  c.poly([[lx + 18, ly + 22], [lx + 32, ly + 22], [lx + 36, 90], [lx + 14, 90]], P.red);
  c.replace(lx + 14, 80, 22, 10, { [P.streetD]: P.red });
  // a lonely moving box on the pavement
  c.rect(34, 72, 10, 7, P.lobbyD); c.frame(34, 72, 10, 7, P.ink); c.hline(35, 75, 8, P.altD);
  return c;
};


// =============================================================================
// HALLS - Unter dem Rathaus: the town hall tower hangs upside down over glowing files.
// =============================================================================
SCENES.halls = () => {
  const P = {
    ink: '0c070b', v1: '140a10', v2: '220c14', v3: '3a1119', v4: '5e1a1c', v5: '8c2a1e', glow: 'd8542a', glowL: 'ff9a3a', ember: 'ffd27a',
    brick: '7a3a36', brickD: '552628', brickL: '9c5446', roof: '3b3a4e', roofL: '5a5a72', clock: 'efe2c4', gold: 'd9a441', win: '1a1016', winL: 'ff8a3a',
    f1: 'd9c8a0', f1D: 'a8946c', f2: '8fa3b8', f2D: '63768c', f3: 'd07a7a', f3D: '9c5252', f4: '8fb080', f4D: '627f58', paper: 'f3ead8', red: 'e0302a',
  };
  const c = new Layer(W, H);
  c.vgrad(0, 0, W, H, [P.v1, P.v1, P.v2, P.v3, P.v4]);
  // red glow rising from the bottom centre
  c.ellipse(80, 96, 50, 20, P.v4); c.ellipse(80, 98, 36, 14, P.v5); c.ellipse(80, 100, 22, 10, P.glow);
  c.dither(20, 70, 120, 12, P.v4, 4);
  // cavern ceiling
  c.rect(0, 0, W, 5, P.ink); for (let x = 0; x < W; x += 7) c.poly([[x, 4], [x + 7, 4], [x + 3, 8 + (x * 13) % 5]], P.ink);
  // the upside-down town hall tower
  const tx = 68, tw = 24;
  c.rect(tx - 10, 0, tw + 20, 8, P.brickD); c.hline(tx - 10, 7, tw + 20, P.brickL); // base, now a ceiling
  c.rect(tx, 8, tw, 36, P.brick);
  for (let y = 10; y < 44; y += 3) for (let x = tx + ((y / 3) % 2 ? 0 : 2); x < tx + tw; x += 4) c.px(x, y, P.brickD);
  c.vline(tx, 8, 36, P.brickL); c.vline(tx + tw - 1, 8, 36, P.brickD);
  // arched windows, arches pointing down because everything is upside down
  for (const [y, lit] of [[11, true], [20, false]]) for (const x of [tx + 4, tx + 14]) {
    c.rect(x, y, 6, 6, lit ? P.winL : P.win); c.px(x, y + 6, P.brickL); c.hline(x + 1, y + 6, 4, lit ? P.winL : P.win); c.hline(x + 2, y + 7, 2, lit ? P.winL : P.win);
    c.vline(x + 3, y, 6, P.brickD);
  }
  // clock face (numbers run backwards down here)
  c.ellipse(tx + 12, 35, 6, 6, P.gold); c.ellipse(tx + 12, 35, 5, 5, P.clock);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.px(tx + 12 + Math.cos(a) * 4, 35 + Math.sin(a) * 4, P.brickD); }
  c.line(tx + 12, 35, tx + 12, 39, P.ink); c.line(tx + 12, 35, tx + 9, 33, P.ink);
  c.rect(tx - 2, 43, tw + 4, 3, P.brickL); c.hline(tx - 2, 45, tw + 4, P.brickD);
  // spire, pointing into the depth
  c.poly([[tx - 2, 46], [tx + tw + 2, 46], [tx + 12.5, 70]], P.roof);
  c.poly([[tx + 12, 46], [tx + tw + 2, 46], [tx + 12.5, 70]], P.roofL);
  for (let y = 50; y < 66; y += 4) c.replace(tx - 2, y, tw + 4, 1, { [P.roof]: P.ink, [P.roofL]: P.roof });
  c.vline(tx + 12, 70, 6, P.gold); c.ellipse(tx + 12, 74, 1.5, 1.5, P.gold); c.poly([[tx + 13, 76], [tx + 18, 77], [tx + 13, 79]], P.red);
  // hanging side turrets
  for (const x of [tx - 10, tx + tw + 4]) { c.rect(x, 8, 6, 12, P.brickD); c.poly([[x - 1, 20], [x + 7, 20], [x + 3, 28]], P.roof); c.px(x + 3, 29, P.gold); }
  // mountains of files
  const folder = (x, y, w, col, dk) => { c.rect(x, y, w, 3, col); c.hline(x, y + 2, w, dk); c.px(x + 1, y + 1, P.paper); c.rect(x + Math.floor(w / 2) - 1, y + 1, 3, 1, P.paper); };
  const cols = [[P.f1, P.f1D], [P.f2, P.f2D], [P.f3, P.f3D], [P.f4, P.f4D]];
  const pile = (x0, x1, top, seed) => {
    const r = rng(seed), mid = (x0 + x1) / 2;
    for (let y = H - 3; y > top - 3; y -= 3) {
      const t = (H - y) / (H - top), half = (x1 - x0) / 2 * (1 - t * 0.85);
      let x = Math.round(mid - half + (r() - 0.5) * 3);
      while (x < mid + half) { const w = 6 + Math.floor(r() * 7), cc = cols[Math.floor(r() * 4)]; folder(x, y, Math.min(w, Math.round(mid + half - x) + 1), cc[0], cc[1]); x += w; }
    }
  };
  pile(-10, 58, 52, 3); pile(102, 172, 48, 9); pile(34, 62, 76, 5); pile(100, 128, 74, 12);
  // shade the upper files, the light comes from the depth below
  c.replace(0, 0, W, 66, { [P.f1]: P.f1D, [P.f2]: P.f2D, [P.f3]: P.f3D, [P.f4]: P.f4D, [P.paper]: P.f1D });
  c.replace(0, 0, W, 58, { [P.f1D]: P.v4, [P.f2D]: P.v3, [P.f3D]: P.v4, [P.f4D]: P.v3 });
  // the glowing pit
  c.ellipse(80, 93, 30, 11, P.v5); c.ellipse(80, 95, 21, 8, P.glow); c.ellipse(80, 97, 12, 5, P.glowL); c.dither(50, 80, 60, 6, P.v5, 4);
  // under-lighting on the files near the glow
  c.replace(40, 82, 80, 8, { [P.f1]: P.glowL, [P.f2]: P.f3, [P.f4]: P.glowL });
  // floating paper and embers
  const sheet = (x, y, tilt) => { c.rect(x, y, 6, 7, P.paper); c.px(x + (tilt ? 5 : 0), y, P.v3); c.hline(x + 1, y + 2, 4, P.f1D); c.hline(x + 1, y + 4, 3, P.f1D); c.line(x + 3, y + 3, x + 5, y + 6, P.red); c.line(x + 5, y + 3, x + 3, y + 6, P.red); };
  sheet(28, 30, true); sheet(118, 22, false); sheet(106, 60, true); sheet(44, 58, false);
  const r = rng(77);
  for (let k = 0; k < 26; k++) { const x = 30 + Math.floor(r() * 100), y = 40 + Math.floor(r() * 46); c.px(x, y, k % 3 ? P.glowL : P.ember); }
  return c;
};

// ------------------------------------------------------------------ main ----
module.exports = { Layer, FONT, BIG, bigText, rng, crc32, chunk };
if (require.main === module) {
// --crop=scene,x,y,w,h writes a 10x magnified detail preview to $PREVIEW_DIR (debug aid)
const cropArg = process.argv.find(a => a.startsWith('--crop='));
if (cropArg) {
  const [name, x, y, w, h] = cropArg.slice(7).split(',');
  const full = SCENES[name](), part = new Layer(+w, +h);
  for (let j = 0; j < +h; j++) for (let i = 0; i < +w; i++) part.px(i, j, full.get(+x + i, +y + j));
  const file = path.join(process.env.PREVIEW_DIR || '.', `crop_${name}.png`);
  writePng(file, part, 10); console.log('Preview ' + file); process.exit(0);
}
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENES);
for (const name of names) {
  if (!SCENES[name]) throw new Error('Unknown scene ' + name);
  const layer = SCENES[name]();
  const file = path.join(OUT, `nk_${name}.png`);
  const n = writePng(file, layer, SCALE);
  console.log(`Generated ${path.relative(process.cwd(), file)} (${W * SCALE}x${H * SCALE}, ${n} colours)`);
}
}
