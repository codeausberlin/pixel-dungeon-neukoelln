// Kiez-Logo: Konzeptentwürfe für App-Icon, Wortmarke und Key-Art von Pixel Dungeon Neukölln.
// Reines Node (zlib, eigener PNG-Encoder), keine Zufallszahlen, keine externen Bilder oder Fonts:
// zwei Läufe liefern byte-identische Dateien.
//
//   node tools/generate-kiez-logo.cjs --out DIR [--only a,b,c]
//
// Je Konzept X (a, b, c) entsteht DIR/konzept-X/ mit
//   icon-48.png (Master 48x48, 1x), icon-192.png (x4), icon-512.png (x10 = 480, mittig mit 16 px Rand),
//   logo-1x.png / logo-4x.png (Wortmarke 128x48), kombi-1x.png / kombi-4x.png (Key-Art 256x144)
//   und konzept-X-uebersicht.png (Icon klein und groß, Logo, Kombination auf hellem und dunklem Grund).
// Konzept A „Schwert im Haufen“, B „Neon-Ö“, C „Taube mit Mietvertrag“ (Bahnsteig).
// Es werden keine Repo-Assets geschrieben; das Übernehmen in mipmaps/Desktop-Icons ist ein eigener Schritt.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// ---------------------------------------------------------------- PNG
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) { let c = ~0; for (const v of buf) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), t = Buffer.from(type, 'ascii');
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(img) {
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(img.w, 0); hdr.writeUInt32BE(img.h, 4);
  hdr[8] = 8; hdr[9] = 6;
  const raw = Buffer.alloc(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) Buffer.from(img.px.buffer, y * img.w * 4, img.w * 4).copy(raw, y * (img.w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- Farben, Bild, Maske
const CC = new Map();
function col(h) {
  if (Array.isArray(h)) return h;
  let v = CC.get(h);
  if (!v) {
    v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    v.push(h.length > 6 ? parseInt(h.slice(6, 8), 16) : 255);
    CC.set(h, v);
  }
  return v;
}
// deterministisches „Rauschen“ für Ziegel und Putz
const hash = (x, y, s = 0) => { let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

class Img {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Uint8Array(w * h * 4); }
  set(x, y, c) {
    if (c == null || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = col(c), i = (y * this.w + x) * 4, p = this.px;
    if (a === 255) { p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255; return; }
    if (a === 0) return;
    const da = p[i + 3] / 255, sa = a / 255, oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) p[i + k] = Math.round(([r, g, b][k] * sa + p[i + k] * da * (1 - sa)) / oa);
    p[i + 3] = Math.round(oa * 255);
  }
  get(x, y) { const i = (y * this.w + x) * 4; return [...this.px.slice(i, i + 4)]; }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  fill(c) { return this.rect(0, 0, this.w, this.h, c); }
  blit(src, dx, dy, s = 1) {
    for (let y = 0; y < src.h * s; y++) for (let x = 0; x < src.w * s; x++) {
      const v = src.get(Math.floor(x / s), Math.floor(y / s));
      if (v[3]) this.set(dx + x, dy + y, v);
    }
    return this;
  }
  scaled(s) { return new Img(this.w * s, this.h * s).blit(this, 0, 0, s); }
}

class Mask {
  constructor(w, h) { this.w = w; this.h = h; this.b = new Uint8Array(w * h); }
  has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.b[y * this.w + x] === 1; }
  add(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.b[y * this.w + x] = 1; return this; }
  del(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.b[y * this.w + x] = 0; return this; }
  each(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.b[y * this.w + x]) fn(x, y); }
  clone() { const m = new Mask(this.w, this.h); m.b.set(this.b); return m; }
  or(o) { o.each((x, y) => this.add(x, y)); return this; }
  minus(o) { o.each((x, y) => this.del(x, y)); return this; }
  shift(dx, dy) { const m = new Mask(this.w, this.h); this.each((x, y) => m.add(x + dx, y + dy)); return m; }
  dilate(diag = true) {
    const m = this.clone();
    this.each((x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (diag || !i || !j) m.add(x + i, y + j); });
    return m;
  }
  ellipse(cx, cy, rx, ry) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.add(x, y);
    }
    return this;
  }
  rect(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.add(i, j); return this; }
  roundRect(x, y, w, h, r) {
    this.rect(x + r, y, w - 2 * r, h).rect(x, y + r, w, h - 2 * r);
    for (const [cx, cy] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) this.ellipse(cx, cy, r, r);
    return this;
  }
  poly(pts) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.add(x, y);
    }
    return this;
  }
  rows(x, y, rows) { rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.' && c !== '0' && c !== ' ') this.add(x + i, y + j); })); return this; }
}
const M = (img) => new Mask(img.w, img.h);

// Fläche mit SPD-typischer Schattierung: Lichtkante oben/links, Schattenkante unten/rechts, Kontur
function paint(img, m, o) {
  m.each((x, y) => {
    let c = o.fn ? o.fn(x, y) : o.fill;
    if (o.light && (!m.has(x, y - 1) || (o.lightLeft !== false && !m.has(x - 1, y)))) c = o.light;
    if (o.dark && (!m.has(x, y + 1) || (o.darkRight !== false && !m.has(x + 1, y)))) c = o.dark;
    img.set(x, y, c);
  });
  if (o.out) outline(img, m, o.out, o.diag);
}
function outline(img, m, c, diag = false) { m.dilate(diag).minus(m).each((x, y) => img.set(x, y, c)); }
// Neonröhre: Röhre mit heller Seele, Halo in zwei Stufen (zweite gerastert)
function neon(img, m, {tube, core, halo, halo2}) {
  const h1 = m.dilate(true), h2 = h1.dilate(false);
  if (halo2) h2.clone().minus(h1).each((x, y) => { if ((x + y) % 2 === 0) img.set(x, y, halo2); });
  if (halo) h1.clone().minus(m).each((x, y) => img.set(x, y, halo));
  m.each((x, y) => img.set(x, y, (!m.has(x - 1, y) || !m.has(x, y - 1)) && core ? core : tube));
}
// Pixelsprite aus ASCII-Zeilen mit Palette
function sprite(img, x, y, rows, pal, flip = false) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const c = pal[ch];
    if (c) img.set(flip ? x + r.length - 1 - i : x + i, y + j, c);
  }));
}

// ---------------------------------------------------------------- Schriften
// KIEZ-FETT: 11 Zeilen, 2-px-Striche, für NEUKÖLLN. Ö hat Punktpositionen (2x2) statt fester Punkte.
const BIG = {
  N: ['110000011', '111000011', '111100011', '110110011', '110011011', '110001111', '110000111', '110000011', '110000011', '110000011', '110000011'],
  E: ['11111111', '11111111', '11000000', '11000000', '11111110', '11111110', '11000000', '11000000', '11000000', '11111111', '11111111'],
  U: ['110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '111111111', '011111110'],
  K: ['110000011', '110000110', '110001100', '110011000', '110110000', '111100000', '111110000', '110011000', '110001100', '110000110', '110000011'],
  O: ['011111110', '111111111', '110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '110000011', '111111111', '011111110'],
  L: ['11000000', '11000000', '11000000', '11000000', '11000000', '11000000', '11000000', '11000000', '11000000', '11111111', '11111111'],
  ' ': ['0000'],
};
BIG['Ö'] = Object.assign([...BIG.O], {dots: [[1, -4], [6, -4]]});
// KLEIN-FETT: 5x7 mit Doppelstrich (bold), für PIXEL DUNGEON
const MID = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  ' ': ['000'],
};
// MINI: 3x5 für Schilder und Unterzeilen; Umlaute mit Punkten zwei Zeilen darüber
const SMALL = {};
(() => {
  const d = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '.': '000000000000010', ':': '000010000010000', '!': '010010010000010', '-': '000000111000000',
    '/': '001001010100100', '?': '110001010000010', ',': '000000000010100', ' ': '000000000000000',
  };
  for (const [k, v] of Object.entries(d)) SMALL[k] = [0, 3, 6, 9, 12].map(i => v.slice(i, i + 3));
  for (const [u, b] of [['Ä', 'A'], ['Ö', 'O'], ['Ü', 'U']]) SMALL[u] = Object.assign([...SMALL[b]], {dots: [[0, -2, 1], [2, -2, 1]]});
  SMALL['→'] = ['00100', '00010', '11111', '00010', '00100'];
})();
function glyphW(g) { return Math.max(...g.map(r => r.length)); }
function textWidth(font, s, {spacing = 1, bold = false} = {}) {
  let w = 0;
  for (const ch of s) w += glyphW(font[ch]) + (bold ? 1 : 0) + spacing;
  return w - spacing;
}
// schreibt Text in eine Maske; liefert Punkt-Positionen der Umlaute (für eigene Deko)
function textMask(m, font, s, x, y, {spacing = 1, bold = false, dots = true} = {}) {
  const dotList = [];
  for (const ch of s) {
    const g = font[ch];
    if (!g) throw new Error('Glyphe fehlt: ' + ch);
    g.forEach((r, j) => [...r].forEach((b, i) => { if (b === '1') { m.add(x + i, y + j); if (bold) m.add(x + i + 1, y + j); } }));
    for (const [dx, dy, sz = 2] of g.dots || []) {
      dotList.push([x + dx, y + dy, sz]);
      if (dots) m.rect(x + dx, y + dy, sz + (bold ? 1 : 0), sz);
    }
    x += glyphW(g) + (bold ? 1 : 0) + spacing;
  }
  return dotList;
}
function text(img, font, s, x, y, c, opt = {}) { const m = M(img); textMask(m, font, s, x, y, opt); m.each((i, j) => img.set(i, j, c)); return m; }
const centerX = (W, font, s, opt) => Math.floor((W - textWidth(font, s, opt)) / 2);

// ---------------------------------------------------------------- Palette
const P = {
  ink: '1c1a24', ink2: '2a2634', cream: 'fff4dc', cream2: 'e8d9b8',
  y0: 'fffbe0', y1: 'fff1a8', y2: 'ffd54a', y3: 'f0a830', y4: 'c9782a',
  poo0: '3b2415', poo1: '6b4226', poo2: '8a5a34', poo3: 'a8743f', poo4: 'd29a5c',
  brick: '7a3b2e', brick2: '6a3226', mortar: '3e2420',
  pink: 'ff5fb0', pink0: 'ffd0e8', pinkH: '9a2c66', pinkH2: '5a2248', pinkOff: '7a4064',
  teal: '4ae8d8', teal0: 'd8fff8', tealH: '1f7a74', tealH2: '1a4a4a',
  sky0: '1e1830', sky1: '2b2142', sky2: '3a2b56',
  pg0: 'dfe2ec', pg1: 'b8bdcc', pg2: '8d93a8', pg3: '5d6378', pg4: '3a3e50',
  neckG: '5fbf8f', neckP: '9a6bc9', eye: 'f08a2a', foot: 'e8849a',
  paper: 'fff4dc', paper2: 'dccaa2', seal: 'd23c3c', seal2: '8e2424',
  tile0: 'd6ecdf', tile1: 'b4d6c4', tileJ: '8fb3a2', band: '2f8f8a', band2: '1f6a66',
  conc0: '9a97a6', conc1: '7d7a8c', conc2: '5f5c6e', line: 'f5c542', line2: 'c99a22',
  enamel: '1e4b6e', enamel2: '163a56', enamelE: 'e9e2cc', orange: 'f07a2a', orange2: 'b8561a',
  steel0: 'eef2f6', steel1: 'b9c3cf', steel2: '7d8898', gold0: 'fff1a8', gold1: 'f5c542', gold2: 'b8862a', grip: '9b3b3b',
};

// ---------------------------------------------------------------- Bausteine
function tileMask(img, r = 6) { return M(img).roundRect(0, 0, img.w, img.h, r); }
function clipToTile(img, tile) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (!tile.has(x, y)) { const i = (y * img.w + x) * 4; img.px.fill(0, i, i + 4); }
  // dunkle Kachelkante
  tile.each((x, y) => { if (!tile.has(x - 1, y) || !tile.has(x + 1, y) || !tile.has(x, y - 1) || !tile.has(x, y + 1)) img.set(x, y, P.ink); });
}
function bricks(img, x0, y0, w, h, {bw = 8, bh = 4, c = [P.brick, P.brick2], mortar = P.mortar, seed = 1} = {}) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / bh), off = row % 2 ? bw / 2 : 0, bx = Math.floor((x - x0 + off) / bw);
    const lx = (x - x0 + off) % bw, ly = (y - y0) % bh;
    if (ly === bh - 1 || lx === bw - 1) img.set(x, y, mortar);
    else img.set(x, y, c[Math.floor(hash(bx, row, seed) * c.length)]);
  }
}
function sparkle(img, x, y, big, c = P.y1, c2 = P.y2) {
  img.set(x, y, P.y0);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) img.set(x + dx, y + dy, c);
  if (big) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) img.set(x + dx, y + dy, c2);
}

// Hundehaufen in drei gestapelten Wülsten mit Spitze (Mitte cx, Unterkante by)
function poop(img, cx, by) {
  const tiers = [[28, 8, 0], [20, 7, 6], [12, 6, 11]]; // Breite, Höhe, Hebung der Oberkante
  const masks = tiers.map(([w, h, up]) => M(img).roundRect(Math.round(cx - w / 2), by - h - up, w, h, Math.floor(h / 2)));
  const tip = M(img).rows(Math.round(cx) - 2, by - 22, ['...1', '..11', '.111', '1111', '11111']);
  const all = M(img); masks.forEach(m => all.or(m)); all.or(tip);
  outline(img, all, P.poo0, true);
  [...masks, tip].forEach((m, i) => {
    let top = 1e9, left = 1e9; m.each((x, y) => { top = Math.min(top, y); left = Math.min(left, x); });
    paint(img, m, {fn: (x, y) => (y === top ? P.poo3 : P.poo2), dark: P.poo1, lightLeft: false});
    // Fuge: dunkle Kante auf der Oberseite der unteren Etage
    if (i > 0) m.each((x, y) => { if (!m.has(x, y + 1) && all.has(x, y + 1)) img.set(x, y + 1, P.poo0); });
    if (i < 3) { img.rect(left + 2, top + 1, 3, 1, P.poo4); img.set(left + 1, top + 2, P.poo3); }
  });
  return all;
}
// Pixelschwert (senkrecht), Spitze bei (x, yTip), Knauf oben bei yTop
function sword(img, x, yTop, yEnd) {
  const m = M(img);
  m.rect(x - 1, yTop, 4, 2);          // Knauf
  m.rect(x, yTop + 2, 2, 4);          // Griff
  m.rect(x - 5, yTop + 6, 12, 2);     // Parierstange
  m.rect(x, yTop + 8, 2, yEnd - yTop - 8); // Klinge
  outline(img, m, P.ink, false);
  img.rect(x - 1, yTop, 4, 2, P.gold1); img.set(x - 1, yTop, P.gold0); img.set(x + 2, yTop + 1, P.gold2);
  img.rect(x, yTop + 2, 2, 4, P.grip); img.set(x, yTop + 2, 'c65a5a'); img.set(x, yTop + 4, 'c65a5a');
  img.rect(x - 5, yTop + 6, 12, 2, P.gold1); img.rect(x - 5, yTop + 6, 12, 1, P.gold0); img.set(x + 6, yTop + 7, P.gold2); img.set(x - 5, yTop + 7, P.gold2);
  img.rect(x, yTop + 8, 1, yEnd - yTop - 8, P.steel0); img.rect(x + 1, yTop + 8, 1, yEnd - yTop - 8, P.steel1);
  img.set(x, yTop + 8, P.steel1);
  return m;
}

// Stadttaube, Seitenansicht nach rechts; Maßstab 1 = ca. 34x30 Pixel, (x,y) = linke obere Ecke
function pigeonBig(img, ox, oy, {scroll = true, crown = false} = {}) {
  const X = (v) => ox + v, Y = (v) => oy + v;
  const tail = M(img).poly([[X(10), Y(19)], [X(0), Y(25)], [X(1), Y(28)], [X(12), Y(26)]]);
  const body = M(img).ellipse(X(15), Y(21), 11, 7.5).or(M(img).ellipse(X(21), Y(18), 7, 8));
  const neck = M(img).ellipse(X(23.5), Y(12), 5, 7);
  const head = M(img).ellipse(X(25.5), Y(6.5), 5.5, 5.5);
  const all = M(img).or(tail).or(body).or(neck).or(head);
  // Füße
  for (const fx of [14, 19]) { img.rect(X(fx), Y(28), 1, 2, P.foot); img.rect(X(fx - 1), Y(30), 3, 1, P.foot); img.set(X(fx - 2), Y(30), 'b85a70'); }
  outline(img, all, P.ink, true);
  paint(img, tail, {fill: P.pg3, dark: P.pg4});
  img.rect(X(1), Y(25), 3, 2, P.pg4);
  paint(img, body, {fill: P.pg1, light: P.pg0, dark: P.pg2});
  // Hals schillernd
  paint(img, neck, {fn: (x, y) => (y < Y(11) ? P.neckG : y < Y(15) ? P.neckP : P.pg1), dark: null});
  neck.each((x, y) => { if (!neck.has(x + 1, y) && y >= Y(9) && y < Y(16)) img.set(x, y, y < Y(12) ? '3f9a70' : '76509e'); });
  paint(img, head, {fill: P.pg1, light: P.pg0, dark: P.pg2});
  // Flügel
  const wing = M(img).ellipse(X(13), Y(19.5), 9, 5.2);
  paint(img, wing, {fill: P.pg2, light: P.pg1, dark: P.pg3});
  img.rect(X(9), Y(19), 7, 1, P.pg4); img.rect(X(10), Y(22), 7, 1, P.pg4);
  img.rect(X(5), Y(21), 3, 2, P.pg3);
  // Auge: orange Ring, schwarze Pupille, Glanzpunkt
  img.rect(X(26), Y(4), 3, 3, P.eye); img.rect(X(27), Y(5), 2, 2, P.ink); img.set(X(27), Y(5), 'ffffff');
  // Schnabel mit weißer Wachshaut
  img.set(X(30), Y(6), 'e9e6ef'); img.set(X(31), Y(6), 'e9e6ef');
  img.rect(X(31), Y(7), 3, 1, P.pg4); img.rect(X(31), Y(8), 2, 1, P.pg4);
  if (scroll) {
    // Mietvertrag hängt am Schnabel: Blatt mit Zeilen, Unterschrift und rotem Siegel
    const d = M(img).rect(X(29), Y(8), 10, 13);
    outline(img, d, P.ink, false);
    paint(img, d, {fill: P.paper, light: 'ffffff', dark: P.paper2});
    for (let j = 0; j < 3; j++) img.rect(X(31), Y(11 + j * 2), j === 2 ? 4 : 6, 1, '6a7088');
    img.set(X(30), Y(18), '3a5a9a'); img.set(X(31), Y(17), '3a5a9a'); img.set(X(32), Y(18), '3a5a9a'); img.set(X(33), Y(17), '3a5a9a');
    const sl = M(img).ellipse(X(36), Y(18), 2, 2);
    paint(img, sl, {fill: P.seal, light: 'ff7a6a', dark: P.seal2});
    img.rect(X(31), Y(7), 3, 2, P.pg4); img.set(X(33), Y(8), P.ink); // Schnabel hält das Blatt
  }
  if (crown) {
    const c = M(img).rows(X(22), Y(-3), ['1.1.1', '11111', '11111']);
    outline(img, c, P.ink, false);
    c.each((x, y) => img.set(x, y, y === Y(-1) ? P.gold2 : P.gold1));
    img.set(X(24), Y(-2), P.seal);
  }
  return all;
}
// kleine Taube (13x10) für Schilder und Szenen
const PIGEON_S = [
  '........oo...',
  '.......oHHo..',
  '.......oHEHbb',
  '......oNHHo..',
  '..ooooNNPo...',
  '.oTBBBBPBBo..',
  'oTTWWWWBBBo..',
  '.oTTWWWBBo...',
  '..oooooooo...',
  '.....f..f....',
];
const PIGEON_PAL = {o: P.ink, H: P.pg1, E: P.eye, b: P.pg4, N: P.neckG, P: P.neckP, B: P.pg1, W: P.pg2, T: P.pg3, f: P.foot};

// ================================================================ KONZEPT A: Schwert im Haufen
function iconA() {
  const g = new Img(48, 48), tile = tileMask(g);
  // Nachthimmel mit Strahlenkranz hinter dem Haufen
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x + 0.5 - 24, dy = y + 0.5 - 27, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    let c = y < 14 ? P.sky0 : y < 26 ? P.sky1 : P.sky2;
    if (Math.floor((a + Math.PI) / (Math.PI / 8)) % 2 === 0 && r < 30) c = r < 17 ? '6a4a78' : '4a3663';
    if (r < 13) c = '8a5e7a';
    if (r < 10) c = 'b07a78';
    g.set(x, y, c);
  }
  // Gehweg
  for (let y = 38; y < 48; y++) for (let x = 0; x < 48; x++) {
    const joint = y === 43 || (x + (y > 43 ? 6 : 0)) % 12 === 0;
    g.set(x, y, y === 38 ? P.conc0 : joint ? P.conc2 : P.conc1);
  }
  g.rect(0, 37, 48, 1, P.conc2);
  // Schatten unterm Haufen
  M(g).ellipse(24, 42, 15, 2.5).each((x, y) => g.set(x, y, P.conc2));
  sword(g, 20, 3, 30);
  poop(g, 24, 42);
  // Klinge steckt: Einstich mit dunklem Rand
  g.rect(19, 25, 4, 1, P.poo0); g.rect(20, 25, 2, 1, P.poo1);
  sparkle(g, 8, 11, true); sparkle(g, 39, 8, false); sparkle(g, 41, 22, true); sparkle(g, 6, 25, false);
  clipToTile(g, tile);
  return g;
}
function logoA() {
  const g = new Img(128, 48);
  const m = M(g), W = textWidth(BIG, 'NEUKÖLLN', {spacing: 2}), x0 = Math.floor((128 - W) / 2), y0 = 9;
  const dots = textMask(m, BIG, 'NEUKÖLLN', x0, y0, {spacing: 2, dots: false});
  const ext = m.shift(0, 1).or(m.shift(0, 2)).minus(m);
  const all = m.clone().or(ext);
  outline(g, all, P.ink, true);
  ext.each((x, y) => g.set(x, y, y - 1 >= 0 && m.has(x, y - 1) ? P.poo2 : P.poo1));
  paint(g, m, {fn: (x, y) => { const r = y - y0; return r < 3 ? P.y1 : r < 7 ? P.y2 : r < 9 ? P.y3 : P.y4; }, light: P.y0, dark: null});
  // Ö-Punkte als zwei Mini-Haufen
  for (const [dx, dy] of dots) {
    const p = M(g).rows(dx - 1, dy - 1, ['.1..', '111.', '1111']);
    outline(g, p, P.ink, true);
    paint(g, p, {fill: P.poo2, light: P.poo3, dark: P.poo1});
  }
  // Banderole mit PIXEL DUNGEON, das I ist ein Schwert
  const sub = 'PIXEL DUNGEON', sw = textWidth(MID, sub, {bold: true}), sx = Math.floor((128 - sw) / 2), sy = 32;
  const band = M(g).rect(sx - 5, sy - 3, sw + 10, 13);
  const tailsL = M(g).poly([[sx - 12, sy - 1], [sx - 4, sy - 1], [sx - 4, sy + 12], [sx - 12, sy + 12], [sx - 9, sy + 5.5]]);
  const tailsR = M(g).poly([[sx + sw + 12, sy - 1], [sx + sw + 4, sy - 1], [sx + sw + 4, sy + 12], [sx + sw + 12, sy + 12], [sx + sw + 9, sy + 5.5]]);
  for (const t of [tailsL, tailsR]) { outline(g, t, P.ink, true); paint(g, t, {fill: '4a2c1c', dark: P.poo0}); }
  outline(g, band, P.ink, true);
  paint(g, band, {fill: P.poo1, light: P.poo2, dark: P.poo0});
  const tm = M(g);
  textMask(tm, MID, sub, sx, sy, {bold: true});
  tm.shift(0, 1).minus(tm).each((x, y) => g.set(x, y, P.poo0));
  tm.each((x, y) => g.set(x, y, P.cream));
  // I als Schwertchen
  const ix = sx + textWidth(MID, 'P', {bold: true}) + 1;
  g.rect(ix, sy, 4, 7, P.poo1);
  g.rect(ix + 1, sy - 2, 2, 1, P.gold1); g.rect(ix + 1, sy - 1, 2, 1, P.grip); g.rect(ix - 1, sy, 6, 1, P.gold1);
  g.rect(ix + 1, sy + 1, 1, 6, P.steel0); g.rect(ix + 2, sy + 1, 1, 6, P.steel1); g.set(ix + 1, sy + 7, P.steel1);
  sparkle(g, x0 - 5, y0 + 1, false); sparkle(g, x0 + W + 5, y0 + 9, false);
  return g;
}
function kombiA() {
  const g = new Img(256, 144);
  // Altbaufassade bei Nacht
  for (let y = 0; y < 144; y++) for (let x = 0; x < 256; x++) g.set(x, y, y < 110 ? (hash(x >> 1, y >> 1, 7) < 0.08 ? '3a2e44' : '2f2640') : P.conc1);
  for (let wx = 8; wx < 256; wx += 36) for (const wy of [6, 58]) {
    if ((wy === 58 && wx > 80 && wx < 170) || (wy === 6 && wx > 50 && wx < 190)) continue; // frei für Logo und Haufen
    const lit = ((wx - 8) / 36 + (wy > 6 ? 1 : 0)) % 3 === 1;
    g.rect(wx - 2, wy - 2, 22, 34, '3f3452'); g.rect(wx, wy, 18, 30, lit ? '8a6a3a' : '1a1624');
    g.rect(wx + 8, wy, 2, 30, '3f3452'); g.rect(wx, wy + 12, 18, 2, '3f3452');
    if (lit) { g.rect(wx, wy, 8, 12, 'f0c060'); g.rect(wx + 10, wy, 8, 12, 'd8a048'); }
    g.rect(wx - 3, wy + 30, 24, 3, '4a3e5e');
  }
  // Strahlen hinter dem Haufen
  for (let y = 40; y < 118; y++) for (let x = 60; x < 196; x++) {
    const dx = x + 0.5 - 128, dy = y + 0.5 - 104, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    if (dy < 4 && r < 62 && Math.floor((a + Math.PI) / (Math.PI / 10)) % 2 === 0) g.set(x, y, r < 34 ? '6a4a78c0' : '4a3663a0');
  }
  // Gehweg
  for (let y = 110; y < 144; y++) for (let x = 0; x < 256; x++) {
    const joint = (y - 110) % 11 === 10 || (x + (Math.floor((y - 110) / 11) % 2) * 8) % 16 === 0;
    g.set(x, y, y === 110 ? P.conc0 : joint ? P.conc2 : P.conc1);
  }
  g.rect(0, 108, 256, 2, '4a3e5e');
  M(g).ellipse(128, 128, 17, 3).each((x, y) => g.set(x, y, P.conc2));
  sword(g, 124, 88, 116);
  poop(g, 128, 128);
  g.rect(123, 111, 4, 1, P.poo0);
  g.blit(logoA(), 64, 8);
  sparkle(g, 100, 84, true); sparkle(g, 156, 90, false); sparkle(g, 162, 72, true); sparkle(g, 92, 104, false);
  // Unterzeile
  const t = 'DIE LEGENDE VOM GEHWEG';
  const tx = centerX(256, SMALL, t);
  g.rect(tx - 4, 134, textWidth(SMALL, t) + 8, 9, P.ink);
  text(g, SMALL, t, tx, 136, P.y1);
  return g;
}

// ================================================================ KONZEPT B: Neon-Ö
function wallNight(g, x0, y0, w, h, seed = 2) {
  bricks(g, x0, y0, w, h, {bw: 8, bh: 4, c: ['3a2733', '432d3b', '35232f'], mortar: '231821', seed});
}
function neonO(g, cx, cy, rx, ry, t = 2) {
  return M(g).ellipse(cx, cy, rx, ry).minus(M(g).ellipse(cx, cy, rx - t, ry - t));
}
function iconB() {
  const g = new Img(48, 48), tile = tileMask(g);
  wallNight(g, 0, 0, 48, 48);
  // Ö: pinker Ring, ein Punkt leuchtet, einer ist kaputt
  const ring = M(g).ellipse(24, 28.5, 15.5, 15).minus(M(g).ellipse(24, 28.5, 12.5, 12));
  const dotL = M(g).roundRect(11, 4, 6, 6, 2), dotR = M(g).roundRect(31, 4, 6, 6, 2);
  neon(g, M(g).or(ring).or(dotL), {tube: P.pink, core: P.pink0, halo: P.pinkH, halo2: P.pinkH2});
  dotR.each((x, y) => g.set(x, y, P.pinkOff)); outline(g, dotR, '2a1a26', false);
  g.set(32, 5, '7a4868');
  // Halterungen
  for (const [x, y] of [[6, 27], [40, 27]]) { g.rect(x, y, 2, 3, P.steel2); g.set(x, y, P.steel1); }
  // SPÄTI in Türkis im Ring
  const sm = M(g), sx = centerX(48, SMALL, 'SPÄTI');
  textMask(sm, SMALL, 'SPÄTI', sx, 28);
  neon(g, sm, {tube: P.teal, core: P.teal0, halo: null, halo2: null});
  // Taube auf dem Ring
  sprite(g, 18, 4, PIGEON_S, PIGEON_PAL);
  // Kabel
  g.set(44, 30, '111018'); g.set(45, 31, '111018'); g.set(45, 32, '111018'); g.set(44, 33, '111018');
  clipToTile(g, tile);
  return g;
}
function signBoard(g, x, y, w, h) {
  const b = M(g).roundRect(x, y, w, h, 4);
  outline(g, b, P.ink, true);
  paint(g, b, {fill: '1d1826', light: '3a3446', dark: '3a3446'});
  b.each((i, j) => { if (!b.has(i - 1, j) || !b.has(i + 1, j) || !b.has(i, j - 1) || !b.has(i, j + 1)) g.set(i, j, '4a4458'); });
  for (const [i, j] of [[x + 3, y + 3], [x + w - 4, y + 3], [x + 3, y + h - 4], [x + w - 4, y + h - 4]]) { g.set(i, j, P.steel1); }
  return b;
}
function logoB() {
  const g = new Img(128, 48);
  signBoard(g, 1, 1, 126, 46);
  const m = M(g), W = textWidth(BIG, 'NEUKÖLLN', {spacing: 3}), x0 = Math.floor((128 - W) / 2), y0 = 10;
  textMask(m, BIG, 'NEUKÖLLN', x0, y0, {spacing: 3});
  // zweites L flackert (Röhre aus)
  const lx = x0 + textWidth(BIG, 'NEUKÖL', {spacing: 3}) + 3;
  const off = M(g); m.each((x, y) => { if (x >= lx && x < lx + 8) off.add(x, y); });
  neon(g, m.clone().minus(off), {tube: P.pink, core: P.pink0, halo: P.pinkH, halo2: P.pinkH2});
  off.each((x, y) => g.set(x, y, P.pinkOff));
  sparkle(g, lx + 9, y0 - 2, false, P.y1); // Funke der Wackelröhre
  const s = M(g), sub = 'PIXEL DUNGEON', sx = centerX(128, MID, sub, {spacing: 2}), sy = 30;
  textMask(s, MID, sub, sx, sy, {spacing: 2});
  neon(g, s, {tube: P.teal, core: P.teal0, halo: P.tealH, halo2: null});
  return g;
}
function kombiB() {
  const g = new Img(256, 144);
  wallNight(g, 0, 0, 256, 144, 5);
  // Gehweg
  g.rect(0, 128, 256, 16, P.conc1); g.rect(0, 128, 256, 1, P.conc0);
  for (let x = 0; x < 256; x += 16) g.rect(x, 129, 1, 15, P.conc2);
  // Schild
  g.rect(70, 0, 2, 8, P.steel2); g.rect(184, 0, 2, 8, P.steel2);
  g.blit(logoB(), 64, 6);
  sprite(g, 150, -3 + 6, PIGEON_S, PIGEON_PAL);
  // Späti-Schaufenster mit Kühlschrankglühen
  const fx = 60, fy = 62, fw = 136, fh = 66;
  g.rect(fx - 4, fy - 4, fw + 8, fh + 4, '4a4458'); g.rect(fx - 3, fy - 3, fw + 6, fh + 3, '2a2634');
  g.rect(fx, fy, fw, fh, 'b8f0e8');
  for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) if ((x + y) % 2 === 0 && (y - fy) > 44) g.set(x, y, '8fd8d0');
  // Regale und Flaschen
  const bottle = ['f5c542', '6fcf5a', 'ff5fb0', '4a8ee8', 'f07a2a', 'c9e0f0'];
  for (let r = 0; r < 3; r++) {
    const sy = fy + 18 + r * 16;
    g.rect(fx + 2, sy, fw - 4, 2, '6a6478');
    for (let i = 0; i < 20; i++) {
      const bx = fx + 5 + i * 6.5 | 0, c = bottle[Math.floor(hash(i, r, 11) * bottle.length)];
      if (hash(i, r, 12) < 0.12) continue;
      g.rect(bx, sy - 10, 4, 10, c); g.rect(bx + 1, sy - 13, 2, 3, c); g.set(bx + 1, sy - 9, 'ffffff'); g.rect(bx, sy - 7, 4, 3, 'fff4dc');
    }
  }
  g.rect(fx + fw / 2 - 1, fy, 2, fh, '2a2634');
  // Aufkleber „24/7“ und Zettel
  g.rect(fx + 6, fy + 3, 21, 9, P.ink); text(g, SMALL, '24/7', fx + 8, fy + 5, P.y2);
  g.rect(fx + fw - 42, fy + 3, 38, 9, P.cream); text(g, SMALL, 'NUR BAR', fx + fw - 40, fy + 5, P.seal);
  // Unterzeile
  const t = 'GEÖFFNET BIS ZUM ENDBOSS';
  const tx = centerX(256, SMALL, t);
  g.rect(tx - 4, 132, textWidth(SMALL, t) + 8, 10, P.ink);
  text(g, SMALL, t, tx, 135, P.teal);
  return g;
}

// ================================================================ KONZEPT C: Taube mit Mietvertrag
function stationWall(g, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = (x - x0) % 6, ly = (y - y0) % 4;
    g.set(x, y, lx === 5 || ly === 3 ? P.tileJ : (hash((x - x0) / 6 | 0, (y - y0) / 4 | 0, 4) < 0.15 ? P.tile1 : P.tile0));
  }
}
function iconC() {
  const g = new Img(48, 48), tile = tileMask(g);
  stationWall(g, 0, 0, 48, 40);
  g.rect(0, 6, 48, 4, P.band); g.rect(0, 9, 48, 1, P.band2);
  // Bahnsteig mit gelber Kante
  g.rect(0, 40, 48, 8, P.conc1); g.rect(0, 40, 48, 1, P.conc0);
  g.rect(0, 44, 48, 2, P.line); for (let x = 0; x < 48; x += 2) g.set(x, 45, P.line2);
  g.rect(0, 46, 48, 2, P.conc2);
  M(g).ellipse(20, 41, 13, 1.6).each((x, y) => g.set(x, y, P.conc2));
  pigeonBig(g, 4, 10, {scroll: true});
  clipToTile(g, tile);
  return g;
}
function stationSign(g, x, y, w, h, withLine = true) {
  const b = M(g).roundRect(x, y, w, h, 3);
  outline(g, b, P.ink, true);
  paint(g, b, {fill: P.enamel, light: '2a6490', dark: P.enamel2});
  b.each((i, j) => { if (!b.has(i - 1, j) || !b.has(i + 1, j) || !b.has(i, j - 1) || !b.has(i, j + 1)) g.set(i, j, P.enamelE); });
  return b;
}
function logoC() {
  const g = new Img(128, 48);
  stationSign(g, 1, 10, 126, 27);
  // fiktive Linienmarke „UG“ (Untergeschoss), bewusst kein Verkehrsbetriebs-Signet
  const lb = M(g).roundRect(5, 16, 15, 13, 3);
  outline(g, lb, P.ink, false); paint(g, lb, {fill: P.orange, light: 'ffa060', dark: P.orange2});
  text(g, MID, 'U', 7, 19, P.cream); text(g, MID, 'G', 13, 19, P.cream);
  const m = M(g), x0 = 25, y0 = 18;
  textMask(m, BIG, 'NEUKÖLLN', x0, y0, {spacing: 2});
  m.shift(1, 1).minus(m).each((i, j) => g.set(i, j, P.enamel2));
  m.each((i, j) => g.set(i, j, P.enamelE));
  // Linienband mit PIXEL DUNGEON
  const sub = 'PIXEL DUNGEON', sw = textWidth(MID, sub, {bold: true}), sx = Math.floor((128 - sw) / 2);
  const band = M(g).rect(sx - 6, 35, sw + 12, 12);
  outline(g, band, P.ink, false);
  paint(g, band, {fill: P.orange, light: 'ffa060', dark: P.orange2});
  const tm = M(g); textMask(tm, MID, sub, sx, 37, {bold: true});
  tm.shift(0, 1).minus(tm).each((i, j) => g.set(i, j, P.orange2));
  tm.each((i, j) => g.set(i, j, P.cream));
  sprite(g, 104, 0, PIGEON_S, PIGEON_PAL);
  return g;
}
function kombiC() {
  const g = new Img(256, 144);
  stationWall(g, 0, 0, 256, 112);
  g.rect(0, 70, 256, 6, P.band); g.rect(0, 75, 256, 1, P.band2);
  // Tunnelmund links, dunkel
  const tun = M(g).roundRect(-20, 78, 60, 60, 20);
  tun.each((x, y) => g.set(x, y, '14121c')); outline(g, tun, '4a4458', false);
  g.set(22, 96, 'ffe58b'); g.set(23, 96, 'ffe58b');
  // Bahnsteig
  g.rect(0, 112, 256, 32, P.conc1); g.rect(0, 112, 256, 1, P.conc0);
  g.rect(0, 134, 256, 4, P.line); for (let x = 0; x < 256; x += 3) { g.set(x, 135, P.line2); g.set(x + 1, 137, P.line2); }
  g.rect(0, 138, 256, 6, '14121c');
  // Schild mit Taube obendrauf
  g.rect(78, 0, 2, 16, P.steel2); g.rect(176, 0, 2, 16, P.steel2);
  g.blit(logoC(), 64, 4);
  // große Taube auf dem Bahnsteig
  M(g).ellipse(128, 113, 16, 2).each((x, y) => g.set(x, y, P.conc2));
  pigeonBig(g, 110, 82, {scroll: true});
  // Fahrplan-Aushang
  g.rect(206, 72, 30, 36, P.ink); g.rect(207, 73, 28, 34, P.cream);
  for (let j = 0; j < 7; j++) g.rect(210, 78 + j * 4, 10 + (j * 7) % 12, 1, '8a8fa3');
  text(g, SMALL, '??:??', 211, 99, P.seal);
  const t = 'NÄCHSTER HALT: KELLER';
  const tx = centerX(256, SMALL, t);
  g.rect(tx - 4, 122, textWidth(SMALL, t) + 8, 10, P.enamel);
  text(g, SMALL, t, tx, 125, P.enamelE);
  return g;
}

// ---------------------------------------------------------------- Übersicht
function label(g, s, x, y, c, s2 = 2) { const t = new Img(textWidth(SMALL, s) + 1, 8); text(t, SMALL, s, 0, 2, c); g.blit(t, x, y, s2); }
function overview(name, icon, logo, kombi) {
  const pad = 24, pw = pad + 48 + pad + 192 + pad + logo.w * 3 + pad; // Panelbreite
  const W = pw * 2, H = 40 + 192 + pad + kombi.h * 2 + pad + 40;
  const g = new Img(W, H);
  const panels = [['f3ecdf', '5a5068'], ['17151f', 'b8b0c8']];
  panels.forEach(([bg, fg], k) => {
    const ox = k * pw;
    g.rect(ox, 0, pw, H, bg);
    label(g, (k ? 'DUNKEL' : 'HELL') + ' - ' + name, ox + pad, 12, fg);
    let x = ox + pad, y = 40;
    g.blit(icon, x, y + 72); label(g, '48', x + 16, y + 126, fg, 1);
    x += 48 + pad;
    g.blit(icon, x, y, 4); label(g, '192', x + 88, y + 196, fg, 1);
    x += 192 + pad;
    g.blit(logo, x, y, 3);
    label(g, 'LOGO X3 UND 1X', x, y + logo.h * 3 + 6, fg, 1);
    g.blit(logo, x + logo.w * 3 - logo.w, y + logo.h * 3 + 4);
    const ky = 40 + 192 + pad + 8;
    g.blit(kombi, ox + Math.floor((pw - kombi.w * 2) / 2), ky, 2);
  });
  return g;
}

// ---------------------------------------------------------------- Ausgabe
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const OUT = opt('--out');
if (!OUT) { console.error('Aufruf: node tools/generate-kiez-logo.cjs --out DIR [--only a,b,c]'); process.exit(1); }
const only = (opt('--only') || 'a,b,c').split(',');
const CONCEPTS = {
  a: ['A SCHWERT IM HAUFEN', iconA, logoA, kombiA],
  b: ['B NEON-Ö', iconB, logoB, kombiB],
  c: ['C TAUBE MIT MIETVERTRAG', iconC, logoC, kombiC],
};
function write(file, img) { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, encodePNG(img)); }
for (const k of only) {
  const [name, fi, fl, fk] = CONCEPTS[k];
  const icon = fi(), logo = fl(), kombi = fk(), dir = path.join(OUT, 'konzept-' + k);
  write(path.join(dir, 'icon-48.png'), icon);
  write(path.join(dir, 'icon-192.png'), icon.scaled(4));
  write(path.join(dir, 'icon-512.png'), new Img(512, 512).blit(icon, 16, 16, 10));
  write(path.join(dir, 'logo-1x.png'), logo);
  write(path.join(dir, 'logo-4x.png'), logo.scaled(4));
  write(path.join(dir, 'kombi-1x.png'), kombi);
  write(path.join(dir, 'kombi-4x.png'), kombi.scaled(4));
  write(path.join(dir, `konzept-${k}-uebersicht.png`), overview(name, icon, logo, kombi));
  console.log('geschrieben: ' + dir);
}
