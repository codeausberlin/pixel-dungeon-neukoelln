// Neuköllner Hinterhöfe: rebuilds environment/tiles_sewers.png (floors 1-5) from the
// upstream Shattered Pixel Dungeon sewer atlas. Pure Node (zlib only), no npm packages.
//
//   node tools/generate-hinterhof-tiles.cjs                 write the atlas
//   node tools/generate-hinterhof-tiles.cjs --preview DIR   also write 3x previews + mini map
//   node tools/generate-hinterhof-tiles.cjs --source X.png  use another copy of the original
//
// Contract: every cell keeps its position in the 16x16 grid and every pixel keeps its
// original alpha value, so autotiling, wall stitching, overhangs and shadows still line up.
// Only RGB values change: palette remaps per tile function plus hand-placed pixel overlays.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'core/src/main/assets/environment/tiles_sewers.png');
const WATER = path.join(ROOT, 'core/src/main/assets/environment/water0.png');
// git blob of the unmodified upstream v4.0.0 tiles_sewers.png (always read, never the output).
const SOURCE_BLOB = '77569cd99f0b5cc30629e28a29892f42206e7c86';

// ---------------------------------------------------------------- PNG codec
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w, h, depth, type, plte = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; if (d[12]) throw new Error('interlaced PNG'); }
    else if (kind === 'PLTE') plte = d; else if (kind === 'tRNS') trns = d;
    else if (kind === 'IDAT') idat.push(d); else if (kind === 'IEND') break;
    p += 12 + len;
  }
  const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[type];
  const bpp = Math.max(1, channels * depth / 8), stride = Math.ceil(w * channels * depth / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat)), data = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) { // undo all five PNG filter types
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = data.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      else if (f !== 0) throw new Error('bad filter ' + f);
      cur[i] = v & 255;
    }
    prev = cur;
  }
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, r = data.subarray(y * stride);
    if (depth !== 8 && type !== 3) throw new Error('unsupported bit depth');
    if (type === 6) r.copy(px, o, x * 4, x * 4 + 4);
    else if (type === 2) { px[o] = r[x * 3]; px[o + 1] = r[x * 3 + 1]; px[o + 2] = r[x * 3 + 2]; px[o + 3] = 255; }
    else if (type === 0) { px[o] = px[o + 1] = px[o + 2] = r[x]; px[o + 3] = 255; }
    else if (type === 4) { px[o] = px[o + 1] = px[o + 2] = r[x * 2]; px[o + 3] = r[x * 2 + 1]; }
    else if (type === 3) {
      const bit = x * depth, idx = (r[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
      px[o] = plte[idx * 3]; px[o + 1] = plte[idx * 3 + 1]; px[o + 2] = plte[idx * 3 + 2];
      px[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return {w, h, px};
}
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(b) { let c = ~0; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; }
function chunk(kind, d) {
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const body = Buffer.concat([Buffer.from(kind, 'ascii'), d]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG({w, h, px}) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- colour helpers
const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const hex = c => c.map(v => v.toString(16).padStart(2, '0')).join('');
const lum = (r, g, b) => (r * 299 + g * 587 + b * 114) / 1000;
// A ramp maps source luminance to a target colour, interpolating between stops so
// the original shading (bevels, grout, highlights) survives in the new palette.
function ramp(stops) {
  const s = stops.map(([l, c]) => [l, rgb(c)]);
  return L => {
    if (L <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) if (L <= s[i][0]) {
      const t = (L - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return s[i][1].map((v, k) => Math.round(s[i - 1][1][k] + (v - s[i - 1][1][k]) * t));
    }
    return s[s.length - 1][1];
  };
}

// ---------------------------------------------------------------- palette
// Kept close to the original value range so fog, lighting and sprite contrast behave the same.
const PAL = {
  // grey Gehwegplatten / Kleinpflaster
  joint: '393836', slabDark: '484743', slab: '56554f', slabAlt: '52514c', slabLight: '5f5e58', speck: '45443f',
  cobble: '55534e', cobbleLight: '625f59', cobbleDark: '403e3a',
  iron: '46474a', ironLight: '616367', ironSlot: '2c2d30',
  // brick, plaster, moss
  plaster: 'a39987', plasterLight: 'b9b09c', plasterDark: '857b6c', plasterEdge: '4a332c',
  // cellar window, downpipe
  glass: '1d2426', glassShine: '4f6e70', bar: '5c5f63', sill: 'a39a8a', sillDark: '6f675d',
  zinc: '8c969b', zincLight: 'b4bec2', zincDark: '5d676c', zincShadow: '3e4548',
  // graffiti tag (abstract, no words)
  tagPink: 'd76a9a', tagTeal: '4fb3a8', tagDark: '2a1f2a',
  // Waschbeton pebbles, Mosaikpflaster, lightwell grate
  pebble: '67655f', pebbleDark: '45443f', mosA: '5e5c57', mosB: '54524d', mosC: '67645e', mosGap: '34332f',
  // facade: grey-brown Rauputz over a yellow clinker plinth
  putz: '776e63', putzLight: '847a6e', putzDark: '685f55', sockel: '948a7c',
  klinker: 'c29b4a', klinkerLight: 'd4ae5d', klinkerDark: 'a8843b', klinkerMortar: '6f6048', redBrick: '8a4a38', redBrickD: '5e3024',
  tagWhite: 'e8e6df', tagBlack: '1e1c1e',
  // orange street litter bin (generic, no logo)
  korbOrange: 'e0782a', korbLight: 'f29a4a', korbDark: 'a8521a', korbHole: '2a1a12', tape: 'a9a9a4',
  flower: 'e8cf3c', flowerDark: 'b89a22',
  // Kippe on the floor
  butt: 'e6dcc6', buttTip: 'c9793c',
};
const C = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, rgb(v)]));

const RAMP = {
  // top-down wall rim (the light stones in the original): pale, dusty clinker
  cap: ramp([[0x00, '000000'], [0x3a, '35312d'], [0x54, '514a43'], [0x61, '5e564e'], [0x9b, '8a8174'],
    [0xab, '978d80'], [0xbf, 'a59b8d'], [0xd4, 'b4aa9b'], [0xdd, 'c0b6a7'], [0xff, 'ddd5c8']]),
  // front face of raised walls: darker red-brown brick with dark grout
  face: ramp([[0x00, '000000'], [0x20, '241715'], [0x34, '35231f'], [0x44, '472d27'], [0x5c, '6b372c'],
    [0x74, '7e4233'], [0x88, '8f4c3a'], [0x9c, 'a05a43'], [0xc0, 'b8765a']]),
  moss: ramp([[0x30, '2c3322'], [0x60, '4f5a36'], [0x90, '75804f'], [0xc0, '9aa46c']]),
  doorGreen: ramp([[0x00, '0d140f'], [0x20, '1a2a1e'], [0x40, '2b4632'], [0x60, '3b6144'], [0x80, '507d57'], [0xa0, '6c9a6c'], [0xc0, '8cb688']]),
  doorGrey: ramp([[0x00, '101113'], [0x20, '222428'], [0x40, '393c42'], [0x60, '52565d'], [0x80, '6c7179'], [0xa0, '878d95'], [0xc0, 'a5abb2']]),
  frameGreen: ramp([[0x00, '090d0a'], [0x40, '223326']]),
  frameGrey: ramp([[0x00, '0c0c0e'], [0x40, '2d2f33']]),
  brass: ramp([[0x30, '4a3a14'], [0x60, '8a6a26'], [0x90, 'c49a3e'], [0xb8, 'e8cc6a']]),
  // Ochsenblut floorboards (FLOOR_SP) — the classic painted Altbau Dielen
  dielen: ramp([[0x10, '1f0e0c'], [0x30, '4a1f1a'], [0x40, '5d2820'], [0x50, '6e3226'], [0x60, '7d3b2c'], [0x80, '94503a']]),
  binBody: ramp([[0x00, '0e1011'], [0x18, '1a1d1f'], [0x30, '2e3438'], [0x48, '434b50'], [0x58, '535c62'], [0x70, '66717a'], [0x90, '84909a']]),
  lidBlack: ramp([[0x00, '0e1011'], [0x40, '25292c'], [0x60, '363b3f'], [0x80, '4a5055'], [0xa0, '5e666c']]),
  lidYellow: ramp([[0x00, '1f1806'], [0x40, '7a5c10'], [0x60, 'a8821c'], [0x80, 'd2a82c'], [0xa0, 'ecca4c']]),
  sperr: ramp([[0x00, '0c0a08'], [0x20, '2a221a'], [0x40, '4f4232'], [0x60, '76644a'], [0x80, '9c8766'], [0xa0, 'bba684']]),
  concrete: ramp([[0x00, '000000'], [0x20, '1e1d1b'], [0x40, '3f3d39'], [0x60, '5f5c56'], [0x80, '837f77'], [0xa0, 'a39e94'], [0xff, 'e8e3d8']]),
};

// ---------------------------------------------------------------- tile map (see DungeonTileSheet.java)
const T = {
  FLOOR: 0, FLOOR_DECO: 1, GRASS: 2, EMBERS: 3, FLOOR_SP: 4, FLOOR_ALT_1: 6, FLOOR_DECO_ALT: 7, GRASS_ALT: 8,
  EMBERS_ALT: 9, FLOOR_SP_ALT: 10, FLOOR_ALT_2: 12, ENTRANCE: 16, EXIT: 17, WELL: 18, EMPTY_WELL: 19, PEDESTAL: 20,
  ENTRANCE_SP: 22, CHASM: 24, CHASM_FLOOR: 25, CHASM_FLOOR_SP: 26, CHASM_WALL: 27, CHASM_WATER: 28, WATER: 32,
  FLAT_WALL: 48, FLAT_WALL_DECO: 49, FLAT_BOOKSHELF: 50, FLAT_WALL_ALT: 52, FLAT_WALL_DECO_ALT: 53,
  FLAT_DOOR: 56, FLAT_DOOR_OPEN: 57, FLAT_DOOR_LOCKED: 58, FLAT_DOOR_CRYSTAL: 59,
  FLAT_BARRICADE: 65, FLAT_REGION_DECO: 74, FLAT_REGION_DECO_ALT: 75,
  RAISED_WALL: 80, RAISED_WALL_DECO: 84, RAISED_WALL_DOOR: 88, RAISED_WALL_ALT: 96, RAISED_WALL_DECO_ALT: 100,
  RAISED_DOOR: 112, RAISED_DOOR_OPEN: 113, RAISED_DOOR_LOCKED: 114, RAISED_DOOR_CRYSTAL: 115, RAISED_DOOR_SIDEWAYS: 116,
  RAISED_BARRICADE: 121, RAISED_REGION_DECO: 130, RAISED_REGION_DECO_ALT: 131,
  WALLS_INTERNAL: 144, WALL_OVERHANG: 192, DOOR_SIDEWAYS_OVERHANG: 208, DOOR_SIDEWAYS_OVERHANG_CLOSED: 212,
  DOOR_SIDEWAYS_OVERHANG_LOCKED: 216, DOOR_SIDEWAYS_OVERHANG_CRYSTAL: 220,
  DOOR_OVERHANG: 224, DOOR_OVERHANG_OPEN: 225, DOOR_OVERHANG_CRYSTAL: 226, DOOR_SIDEWAYS: 227,
  DOOR_SIDEWAYS_LOCKED: 228, DOOR_SIDEWAYS_CRYSTAL: 229, EXIT_UNDERHANG: 230,
  BARRICADE_OVERHANG: 233, REGION_DECO_OVERHANG: 242, REGION_DECO_ALT_OVERHANG: 243,
};
const range = (a, n) => Array.from({length: n}, (_, i) => a + i);
const ORIGINAL_FLOOR = new Set(['53524e', '353431', '464541', '4c4b47', '4f4e4a', '3b3a36']);
const ORIGINAL_DIELEN = new Set(['59421f', '533d1b', '42321c', '4c381b', '3d2d17', '66491f']);

// ---------------------------------------------------------------- atlas access
function loadSource(argv) {
  const i = argv.indexOf('--source');
  if (i >= 0) return fs.readFileSync(argv[i + 1]);
  try { return execFileSync('git', ['cat-file', 'blob', SOURCE_BLOB], {cwd: ROOT, maxBuffer: 1 << 24}); }
  catch (e) {
    throw new Error('Original sewer atlas (git blob ' + SOURCE_BLOB + ') not found. Fetch full history ' +
      'or pass --source path/to/upstream/tiles_sewers.png');
  }
}
const argv = process.argv.slice(2);
const src = decodePNG(loadSource(argv));
if (src.w !== 256 || src.h !== 256) throw new Error('unexpected source size');
const out = {w: 256, h: 256, px: Buffer.from(src.px)};

const idx = (t, x, y) => ((((t >> 4) * 16 + y) * 256) + (t % 16) * 16 + x) * 4;
const alphaAt = (t, x, y) => src.px[idx(t, x, y) + 3];
const srcRGB = (t, x, y) => { const i = idx(t, x, y); return [src.px[i], src.px[i + 1], src.px[i + 2]]; };
const outRGB = (t, x, y) => { const i = idx(t, x, y); return [out.px[i], out.px[i + 1], out.px[i + 2]]; };
function put(t, x, y, c) { // RGB only: alpha is never touched
  if (x < 0 || y < 0 || x > 15 || y > 15) return;
  const i = idx(t, x, y); if (!src.px[i + 3]) return;
  out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2];
}
const paintSolid = (t, x, y, c) => { if (alphaAt(t, x, y) === 255) put(t, x, y, c); };
// ascii overlay: each char maps to a colour key; '.' or ' ' leaves the pixel alone
function stamp(t, ox, oy, rows, keys) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const k = keys[ch]; if (!k) throw new Error('no colour for ' + ch);
    paintSolid(t, ox + x, oy + y, Array.isArray(k) ? k : C[k]);
  }));
}
function copyTile(from, to) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (alphaAt(to, x, y)) put(to, x, y, outRGB(from, x, y)); }

// per-pixel classification of the original art
function classify([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = lum(r, g, b), sat = mx - mn;
  if (mx < 6) return {kind: 'black', L};
  if (ORIGINAL_FLOOR.has(hex([r, g, b]))) return {kind: 'floor', L};
  if (sat <= 6) return {kind: 'grey', L};
  if (g > r + 6 && b > r && g >= b) return {kind: 'moss', L}; // grey-green lichen (crystal cyan has b > g)
  return {kind: 'colour', L, sat};
}
function mapTile(t, fn) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!alphaAt(t, x, y)) continue;
    const c = srcRGB(t, x, y), res = fn(classify(c), x, y, c);
    if (res) put(t, x, y, res);
  }
}

// ---------------------------------------------------------------- 1. floors: Gehwegplatten
// Berlin sidewalk slabs on an 8px grid, running bond, low contrast so sprites stay readable.
const FLOOR_ART = [
  'jjjjjjjjjjjjjjjj',
  'jLLLLLLjLLLLLLLj',
  'jLsssssdLssssssd',
  'jLsssssdLssspssd',
  'jLspsssdLssssssd',
  'jLsssssdLssssssd',
  'jLssssddLsssssdd',
  'jddddddjddddddjj',
  'jjjjjjjjjjjjjjjj',
  'LLLjLLLLLLLjLLLL',
  'aaadLaaaaaadLaaa',
  'aaadLaaaaaadLaaa',
  'aaadLaapaaadLaaa',
  'apadLaaaaaadLapa',
  'aaadLaaaaaadLaaa',
  'dddjdddddddjdddd',
];
const FLOOR_KEYS = {j: 'joint', L: 'slabLight', s: 'slab', a: 'slabAlt', d: 'slabDark', p: 'speck'};
function drawFloor(t, art) { art.forEach((row, y) => [...row].forEach((ch, x) => put(t, x, y, C[FLOOR_KEYS[ch] || ch]))); }
const fhash = (x, y, k = 0) => { let v = Math.imul(x + 3 + k, 374761393) ^ Math.imul(y + 9, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
function waschbeton(t) { // big washed-concrete slabs: sparse exposed pebbles, no noise carpet
  drawFloor(t, FLOOR_ART);
  FLOOR_ART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== 's' && ch !== 'a') return;
    const h = fhash(x, y);
    if (h < 9) put(t, x, y, C.pebble); else if (h > 93) put(t, x, y, C.pebbleDark);
  }));
}
waschbeton(T.FLOOR);
// ALT_1: Mosaikpflaster — small irregular grey stones with dark sand joints
function mosaic(t) {
  for (let y = 0; y < 16; y++) {
    const band = y >> 2, ry = y & 3, shift = (band * 3) % 4;
    for (let x = 0; x < 16; x++) {
      const xs = x + shift, w = 3 + (fhash(xs >> 2, band, 5) % 2), cell = Math.floor(xs / 4), cx = xs % 4;
      const gap = ry === 3 || cx === 3 || (w === 3 && cx === 2 && ry === 0 && fhash(cell, band, 6) < 40);
      const shadeKey = ['mosA', 'mosB', 'mosC'][fhash(cell, band, 7) % 3];
      put(t, x, y, gap ? C.mosGap : (ry === 0 && cx === 0 ? C.mosC : C[shadeKey]));
    }
  }
}
mosaic(T.FLOOR_ALT_1);
// ALT_2 (rare): a Kellerlichtschacht grate set into a slab — low contrast, clearly flat
waschbeton(T.FLOOR_ALT_2);
stamp(T.FLOOR_ALT_2, 2, 3, [
  'HHHHHHHHHHHH',
  'HxIxIxIxIxIi',
  'HIIIIIIIIIIi',
  'HxIxIxIxIxIi',
  'HIIIIIIIIIIi',
  'HxIxIxIxIxIi',
  'iiiiiiiiiiii',
], {H: 'ironLight', I: 'iron', x: 'ironSlot', i: 'ironSlot'});

// Every other tile that shows floor through (water edges, stairs, grass, doors, props…)
// gets the new slab pattern at the same grid position, so seams line up.
const FLOOR_PIX = []; for (let y = 0; y < 16; y++) { FLOOR_PIX.push([]); for (let x = 0; x < 16; x++) FLOOR_PIX[y].push(outRGB(T.FLOOR, x, y)); }
for (let t = 0; t < 256; t++) {
  if (t === T.FLOOR || t === T.FLOOR_ALT_1 || t === T.FLOOR_ALT_2) continue;
  mapTile(t, (k, x, y) => k.kind === 'floor' ? FLOOR_PIX[y][x] : null);
}

// FLOOR_SP: Ochsenblut-painted floorboards; also under the SP barrel, statue and entrance
for (const t of [T.FLOOR_SP, T.FLOOR_SP_ALT, T.CHASM_FLOOR_SP, T.ENTRANCE_SP, 73, 75, 129, 131, 241, 243])
  mapTile(t, (k, x, y, c) => (ORIGINAL_DIELEN.has(hex(c)) || [T.FLOOR_SP, T.FLOOR_SP_ALT, T.CHASM_FLOOR_SP].includes(t) && k.kind !== 'black') ? RAMP.dielen(k.L) : null);

// ---------------------------------------------------------------- 2. walls: Klinker
const capOrMoss = k => k.kind === 'grey' ? RAMP.cap(k.L) : k.kind === 'moss' ? RAMP.moss(k.L) : null;
const faceOrMoss = k => k.kind === 'grey' ? RAMP.face(k.L) : k.kind === 'moss' ? mix(RAMP.face(k.L * 0.92), RAMP.moss(k.L), 0.45) : null;
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }

// flat (top-down) walls and all wall-top rims
for (const t of [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 48), ...range(T.WALL_OVERHANG, 16)])
  mapTile(t, k => capOrMoss(k));
// raised walls: rows 0-3 are the rim (Rauputz ramp); rows 4-15 are redrawn as grey-brown
// Rauputz over a yellow clinker plinth. The +1/+2/+3 variants keep their end-of-wall
// shading as a brightness ratio against variant +0.
for (const t of [...range(T.RAISED_WALL, 12), ...range(T.RAISED_WALL_ALT, 12)]) mapTile(t, (k, x, y) => y < 4 ? capOrMoss(k) : null);
mapTile(T.CHASM_WALL, k => faceOrMoss(k));
function facade(x, y) {
  if (y === 4) return rgb('3e3832');
  if (y <= 9) { const h = fhash(x, y, 11); return h < 14 ? C.putzLight : h > 86 ? C.putzDark : C.putz; }
  if (y === 10) return C.sockel;
  if (y === 13) return C.klinkerMortar;
  const off = y < 13 ? 0 : 2;
  if ((x + off) % 5 === 4) return C.klinkerMortar;
  if (y === 11 || y === 14) return C.klinkerLight;
  return fhash((x + off) / 5 | 0, y > 13 ? 1 : 0, 12) < 30 ? C.klinkerDark : C.klinker;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DOOR, T.RAISED_WALL_ALT]) for (let v = 0; v < 4; v++)
  for (let y = 4; y < 16; y++) for (let x = 0; x < 16; x++) {
    const L0 = lum(...srcRGB(base, x, y)), L1 = lum(...srcRGB(base + v, x, y));
    const f = Math.abs(L1 - L0) < 3 ? 1 : Math.max(0.35, Math.min(1.6, (L1 + 8) / (L0 + 8)));
    put(base + v, x, y, facade(x, y).map(c => Math.max(0, Math.min(255, Math.round(c * f)))));
  }

// bookshelf walls: only their stone parts
for (const t of [T.FLAT_BOOKSHELF, 54, ...range(92, 4), ...range(108, 4)])
  mapTile(t, (k, x, y) => (t >= 92 && y >= 4) ? faceOrMoss(k) : capOrMoss(k));

// ---------------------------------------------------------------- 3. doors: Altbau-Hoftüren
const LOCK_TILES = new Set([T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED]);
function doorMapper(t, style, stone) {
  const paint = style === 'grey' ? RAMP.doorGrey : RAMP.doorGreen, frame = style === 'grey' ? RAMP.frameGrey : RAMP.frameGreen;
  return (k, x, y) => {
    if (style === 'keep') return k.kind === 'grey' ? stone(k, x, y) : null; // crystal vault doors stay as they are
    if (k.kind === 'grey' || k.kind === 'moss') return stone(k, x, y);
    if (k.kind !== 'colour') return null;
    if (k.L < 0x3c) return frame(k.L);
    if (k.sat < 44 && LOCK_TILES.has(t)) return RAMP.brass(k.L); // the padlock
    return paint(k.L + 8);
  };
}
const capStone = k => capOrMoss(k), faceStone = k => faceOrMoss(k);
const DOORS = [
  [T.FLAT_DOOR, 'green', capStone], [T.FLAT_DOOR_OPEN, 'green', capStone], [T.FLAT_DOOR_LOCKED, 'grey', capStone],
  [T.FLAT_DOOR_CRYSTAL, 'keep', capStone], [60, 'keep', capStone], [61, 'keep', capStone],
  [T.RAISED_DOOR, 'green', faceStone], [T.RAISED_DOOR_OPEN, 'green', faceStone], [T.RAISED_DOOR_LOCKED, 'grey', faceStone],
  [T.RAISED_DOOR_CRYSTAL, 'keep', faceStone], [T.RAISED_DOOR_SIDEWAYS, 'green', capStone],
  ...range(208, 4).map(t => [t, 'green', capStone]), ...range(212, 4).map(t => [t, 'green', capStone]),
  ...range(216, 4).map(t => [t, 'grey', capStone]), ...range(220, 4).map(t => [t, 'keep', capStone]),
  [T.DOOR_OVERHANG, 'green', capStone], [T.DOOR_OVERHANG_OPEN, 'green', capStone], [T.DOOR_OVERHANG_CRYSTAL, 'keep', capStone],
  [T.DOOR_SIDEWAYS, 'green', capStone], [T.DOOR_SIDEWAYS_LOCKED, 'grey', capStone], [T.DOOR_SIDEWAYS_CRYSTAL, 'keep', capStone],
  [T.EXIT_UNDERHANG, 'keep', capStone],
];
for (const [t, style, stone] of DOORS) mapTile(t, doorMapper(t, style, stone));

// ---------------------------------------------------------------- 4. wall decorations
// WALL_DECO keeps SewerLevel's dripping Sink emitter (tile centre, 3px down), so both
// designs have a wet source there: the Barbershop window sill (see 4b) and a zinc
// Fallrohr whose elbow ends at the drip point.
const PIPE = [
  '.zZy.',
  '.zZy.',
  'kkkkk',
  '.zZy.',
  '.zZy.',
  '.zZy.',
  'kkkkk',
  '.zZyy',
  '.zZZy',
  '..wwy',
];
const PKEYS = {z: 'zincLight', Z: 'zinc', y: 'zincDark', k: 'zincShadow', w: 'zincShadow'};

// RAISED_WALL_ALT details, all inside the cell so seams stay clean:
// +0 Putzabplatzer (chipped render showing old red brick), +1 white bubble tag on the
// clinker, +2 black tag on the render, +3 small pink tag. Abstract shapes, no letters.
stamp(T.RAISED_WALL_ALT, 3, 5, [
  '.eeeeee.',
  'eRRmRRRe',
  'emmmmmme',
  'eRmRRRme',
  '.eeeeee.',
], {e: 'plasterEdge', R: 'redBrick', m: 'putzDark'});
const BUBBLE = [
  '..kkk..kkkk.',
  '.kWWWkkWWWWk',
  'kWWkWWWWkWWk',
  'kWWWkWWkWWk.',
  '.kkk.kkk.kk.',
];
// Satire on the wall ends (+1/+2/+3); fictional chancellor "März", parody clubs, no real
// names, logos or faces. See docs "Wandplakate und Graffiti".
const KIT = require('./lib/tileset-kit.cjs');
// a kit wall motif with the end-of-wall shading of its cell (against +0 of the same row)
function wallMotifShaded(t, name) {
  const sh = [t - (t % 4), t];
  KIT.wallMotif((tt, x, y, c) => { const f = endShade(sh, x, y); paintSolid(tt, x, y, c.map(v => Math.max(0, Math.min(255, Math.round(v * f))))); }, t, name);
}
const P_KEYS = {p: rgb('6f7f95'), x: rgb('e8ecf0'), b: rgb('9fb8d8'), m: rgb('141214'), g: rgb('4a9a3c'), y: rgb('e8cf3c'), t: rgb('5b6678')};
function wordStamp(t, ox, oy, w, ink, bg) { KIT.word(w).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') paintSolid(t, ox + x, oy + y, ink); else if (bg) paintSolid(t, ox + x, oy + y, bg); })); }
// +1: torn election poster "MÄRZ", moustache painted over, a spring-flower sticker
{ const t = T.RAISED_WALL_ALT + 1;
  for (let y = 5; y <= 12; y++) for (let x = 0; x < 16; x++) {
    const torn = (y === 12 && (x % 4 === 1 || x > 11)) || (y === 5 && x < 2) || (y === 11 && x > 13);
    if (!torn) paintSolid(t, x, y, y === 10 ? P_KEYS.b : P_KEYS.p);
  }
  wordStamp(t, 0, 5, 'MÄRZ', P_KEYS.x);
  stamp(t, 4, 10, ['mm.mm', '.m.m.'], {m: P_KEYS.m});          // moustache graffiti
  stamp(t, 12, 10, ['ggg', 'gyg', 'ggg'], {g: P_KEYS.g, y: P_KEYS.y}); // "Frühling kommt trotzdem" sticker (unreadable at this size)
}
// +2 (round 4): pink "MIE-/TE?!" graffiti over render and clinker (levels.walldeco.graffiti_miete).
// It replaces the crossed-out "M" with "RAUS": less März, and no "raus" slogan on a wall.
wallMotifShaded(T.RAISED_WALL_ALT + 2, 'graffiti_miete');
// +3: club flyer wall — a pink "BÄRG" flyer over small colourful ones
{ const t = T.RAISED_WALL_ALT + 3;
  for (let y = 5; y <= 9; y++) for (let x = 0; x < 15; x++) paintSolid(t, x, y, rgb('e0609a'));
  wordStamp(t, 0, 5, 'BÄRG', rgb('1a1418'));
  const fly = [[1, 'e8cf3c'], [6, '4fb3a8'], [11, '9a6ad0']];
  for (const [fx, col] of fly) for (let y = 10; y <= 14; y++) for (let x = fx; x < fx + 4; x++)
    paintSolid(t, x, y, (y === 12 && x > fx && x < fx + 3) ? rgb('2a2226') : rgb(col));
}
stamp(T.FLAT_WALL_ALT, 2, 9, BUBBLE, {k: 'tagBlack', W: 'tagWhite'});

// ---------------------------------------------------------------- 4b. Sonnenallee shopfronts
// The Kiez around the Hinterhof: Barbershop, Shisha-Bar, Konditorei. Shops only, no
// people, no readable names (the neon is an abstract wave). Placement, without new cells:
//   RAISED_WALL_DECO (+0..+3, wall deco over water, 50%): Barbershop window with pole,
//     its sill still catches SewerLevel's Sink drip (tile centre, 3px down);
//   RAISED_WALL +1 (wall end with a door/opening to the right): Shisha-Bar;
//   RAISED_WALL +2 (opening to the left): Konditorei with baklava trays;
//   RAISED_WALL +3 (single pillar): a lone barber pole.
// The ALT walls (+1 MÄRZ, +2 MIETE?!, +3 BÄRG) and the Fallrohr (DECO_ALT) stay as they are.
const SHOP = {
  f: rgb('2a2624'), M: rgb('a9c4cc'), L: rgb('e6f2f4'), g: rgb('3a4448'), R: rgb('c0392f'), r: rgb('7e2320'),
  c: rgb('b4bec2'), K: rgb('2c2d30'), s: C.sill, d: C.sillDark,
  // Shisha-Bar
  b: rgb('1c1820'), P: rgb('ff5fa8'), N: rgb('5ff0e8'), o: rgb('ffb347'), m: rgb('9aa0a6'), a: rgb('6a4a3a'),
  G: rgb('2e2430'), T: rgb('3fa0a0'), t: rgb('8fe0d8'), V: rgb('8a5ac8'), v: rgb('c4a0f0'), w: rgb('ecebe4'), W: rgb('b3b1aa'),
  // Konditorei
  A: rgb('3f7a4a'), H: rgb('2c5634'), e: rgb('c9bc98'), E: rgb('ece0bc'), F: rgb('4a3222'), I: rgb('f4e6c0'),
  y: rgb('dca544'), Y: rgb('a36a26'), p: rgb('7cb342'), S: rgb('c9ced2'),
};
// end-of-wall shading of the +1/+2/+3 variants, as a brightness ratio against variant +0
// (sh = [base, variant] of the plain wall row, or null for no shading)
function endShade(sh, x, y) {
  if (!sh) return 1;
  const L0 = lum(...srcRGB(sh[0], x, y)), L1 = lum(...srcRGB(sh[1], x, y));
  return Math.abs(L1 - L0) < 3 ? 1 : Math.max(0.35, Math.min(1.6, (L1 + 8) / (L0 + 8)));
}
function shopStamp(t, sh, ox, oy, rows) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const c = SHOP[ch]; if (!c) throw new Error('shop: no colour for ' + ch);
    const f = endShade(sh, ox + x, oy + y);
    paintSolid(t, ox + x, oy + y, c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))));
  }));
}
// rot-weiss-blau barber pole: diagonal stripes, chrome caps, darker right side
function barberPole(t, sh, px, top = 4, bottom = 13) {
  const stripes = [[rgb('d23a34'), rgb('9a2622')], [rgb('f2f0ea'), rgb('b8b6b0')], [rgb('3a64c0'), rgb('27448a')]];
  for (let y = top; y <= bottom; y++) for (let x = px; x < px + 3; x++) {
    let c;
    if (y === top || y === bottom) c = x === px + 2 ? SHOP.m : SHOP.c;
    else c = stripes[(x + y) % 3][x === px + 2 ? 1 : 0];
    const f = endShade(sh, x, y);
    paintSolid(t, x, y, c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))));
  }
}
const BARBER_WINDOW = [ // mirror with a highlight, red barber chair (side view) on a chrome foot
  'ffffffffff',
  'fMMMMMMMMf',
  'fMLMMMMRMf',
  'fMMLMMMRMf',
  'fMMMRRRRMf',
  'fggrRgcggf',
  'fgggKccKgf',
  'ssssssssss',
  '.dddddddd.',
];
const SHISHA = [ // x0..15, y5..15: neon wave sign, two water pipes in the window, a plastic chair
  'bbbbbbbbbbbbbbb.',
  'bbNbbbPPbbPPbbP.',
  'bNNNbPbbPPbbPPb.',
  'bbbbbbbbbbbbbbb.',
  'fGoGGGGGGoGGGwf.',
  'fGmGaGGGGmGaGwf.',
  'fTTTGGGGVVVGGwf.',
  'fTtTGGGGVvVwwwf.',
  'sssssssssssW.Ws.',
  '...........W.W..',
  '...........W.W..',
];
const KONDITOREI = [ // x0..15, y5..13: striped awning, baklava trays on silver platters
  '.AAEEAAEEAAEEAAE',
  '.AAEEAAEEAAEEAAE',
  '.H.e.H.e.H.e.H.e',
  '.FIIIIIIIIIIIIIF',
  '.FyYyYyYIYyYyYyF',
  '.FYpYyYpIyYpYyYF',
  '.FSSSSSSISSSSSSF',
  '.FIIIyYyYyYyIIIF',
  '.sssssssssssssss',
];
// RAISED_WALL_NOTICE (round 4, new cells 104-107 cloned from the plain faces before the
// shops go on): a tear-off flat-hunt note, "Hund heisst Keks" (levels.walldeco.gesuch_1)
KIT.cloneNoticeCells(src, out, idx);
for (let v = 0; v < 4; v++) wallMotifShaded(KIT.T.RAISED_WALL_NOTICE + v, 'gesuch_1');
for (let v = 0; v < 4; v++) {
  copyTile(T.RAISED_WALL + v, T.RAISED_WALL_DECO + v);
  const sh = [T.RAISED_WALL, T.RAISED_WALL + v];
  barberPole(T.RAISED_WALL_DECO + v, sh, 1);
  shopStamp(T.RAISED_WALL_DECO + v, sh, 5, 4, BARBER_WINDOW);
  copyTile(T.RAISED_WALL + v, T.RAISED_WALL_DECO_ALT + v);
  stamp(T.RAISED_WALL_DECO_ALT + v, 6, 3, PIPE, PKEYS);
}
shopStamp(T.RAISED_WALL + 1, [T.RAISED_WALL, T.RAISED_WALL + 1], 0, 5, SHISHA);
shopStamp(T.RAISED_WALL + 2, [T.RAISED_WALL, T.RAISED_WALL + 2], 0, 5, KONDITOREI);
barberPole(T.RAISED_WALL + 3, [T.RAISED_WALL, T.RAISED_WALL + 3], 6);
copyTile(T.FLAT_WALL, T.FLAT_WALL_DECO); barberPole(T.FLAT_WALL_DECO, null, 1, 3, 12); shopStamp(T.FLAT_WALL_DECO, null, 5, 3, BARBER_WINDOW);
copyTile(T.FLAT_WALL, T.FLAT_WALL_DECO_ALT); stamp(T.FLAT_WALL_DECO_ALT, 6, 3, PIPE, PKEYS);

// ---------------------------------------------------------------- 5. props
// REGION_DECO barrels become Mülltonnen, redrawn inside the barrel silhouette: lid, lip,
// cylindrical shading and vertical ribs. Black lid (Restmüll) / yellow lid on the alt.
// Raised versions span two cells (overhang above + base), so they are drawn as one canvas.
function bin(parts, lid) {
  const cells = [];
  for (const [t, dy] of parts) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (alphaAt(t, x, y) !== 255) continue;
    const c = srcRGB(t, x, y), k = classify(c);
    if (k.kind === 'floor' || ORIGINAL_DIELEN.has(hex(c))) continue;
    if (k.kind === 'colour' && c[1] >= c[0]) { put(t, x, y, C.joint); continue; } // moss specks -> shadow
    if (k.kind !== 'colour' && k.L >= 0x30) continue; // keep only wood + dark bands/outline
    cells.push({t, x, y, cy: y + dy, L: k.L});
  }
  const inMask = new Set(cells.map(p => p.x + ',' + p.cy));
  const top = Math.min(...cells.map(p => p.cy)), bottom = Math.max(...cells.map(p => p.cy));
  const x0 = Math.min(...cells.map(p => p.x)), x1 = Math.max(...cells.map(p => p.x));
  for (const p of cells) {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inMask.has((p.x + dx) + ',' + (p.cy + dy)));
    const u = (p.x - x0) / Math.max(1, x1 - x0), r = p.cy - top;
    let col;
    if (edge && p.L < 0x30) col = RAMP.binBody(0x08);
    else if (r <= 2) col = lid(r === 0 ? 0x88 : u < 0.3 ? 0x80 : u > 0.75 ? 0x50 : 0x68);
    else if (r === 3) col = lid(0x30);
    else if (p.cy === bottom || edge) col = RAMP.binBody(0x18);
    else {
      let L = u < 0.22 ? 0x68 : u < 0.62 ? 0x52 : 0x3a;
      if ((p.x - x0) % 3 === 2 && r > 4) L -= 0x0e; // ribs
      if (r === 4) L -= 0x10;                        // shadow under the lip
      col = RAMP.binBody(L);
    }
    put(p.t, p.x, p.y, col);
  }
}
// REGION_DECO: orange street litter bin with a round slot (reads best on grey pavement);
// REGION_DECO_ALT (on floorboards): the grey courtyard bin with a yellow lid.
function korb(parts) {
  const cells = [];
  for (const [t, dy] of parts) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (alphaAt(t, x, y) !== 255) continue;
    const c = srcRGB(t, x, y), k = classify(c);
    if (k.kind === 'floor' || ORIGINAL_DIELEN.has(hex(c))) continue;
    if (k.kind === 'colour' && c[1] >= c[0]) { put(t, x, y, C.joint); continue; }
    if (k.kind !== 'colour' && k.L >= 0x30) continue;
    cells.push({t, x, y, cy: y + dy, L: k.L});
  }
  const inMask = new Set(cells.map(p => p.x + ',' + p.cy));
  const top = Math.min(...cells.map(p => p.cy)), bottom = Math.max(...cells.map(p => p.cy));
  const x0 = Math.min(...cells.map(p => p.x)), x1 = Math.max(...cells.map(p => p.x)), w = x1 - x0;
  for (const p of cells) {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inMask.has((p.x + dx) + ',' + (p.cy + dy)));
    const u = (p.x - x0) / Math.max(1, w), r = p.cy - top, cxr = Math.abs(u - 0.5);
    let col;
    if (edge) col = p.L < 0x30 ? rgb('2a1408') : C.korbDark;
    else if (r >= 2 && r <= 4 && cxr < (r === 3 ? 0.3 : 0.22)) col = C.korbHole;          // round slot
    else if (r >= 1 && r <= 5 && cxr < (r === 3 ? 0.38 : 0.32)) col = C.korbLight;        // rim around the slot
    else if (r === 7) col = u > 0.15 && u < 0.85 ? C.tape : C.korbDark;                   // tape band
    else if (p.cy === bottom) col = C.korbDark;
    else col = u < 0.22 ? C.korbLight : u > 0.72 ? C.korbDark : C.korbOrange;
    put(p.t, p.x, p.y, col);
  }
  // a small scribbled tag on the lower body (abstract)
  const low = cells.filter(p => p.cy - top >= 9 && p.cy - top <= 10 && (p.x - x0) >= 3 && (p.x - x0) <= w - 3);
  low.forEach((p, i) => { if (i % 3 !== 1) put(p.t, p.x, p.y, rgb('1e1c1e')); });
}
korb([[T.FLAT_REGION_DECO, 0]]);
korb([[T.REGION_DECO_OVERHANG, 0], [T.RAISED_REGION_DECO, 16]]);
bin([[T.FLAT_REGION_DECO_ALT, 0]], RAMP.lidYellow);
bin([[T.REGION_DECO_ALT_OVERHANG, 0], [T.RAISED_REGION_DECO_ALT, 16]], RAMP.lidYellow);

// grass and tall grass: an overgrown tree pit with small yellow flowers
for (const t of [T.GRASS, T.GRASS_ALT, 66, 69, 122, 125, 234, 237]) mapTile(t, (k, x, y, c) => {
  if (k.kind !== 'colour' || !(c[1] > c[0] + 20 && c[1] > c[2] + 20)) return null;
  const h = (Math.imul(x + 31, 2654435761) ^ Math.imul(y + t, 40503)) >>> 0;
  return h % 23 === 0 ? C.flower : h % 23 === 1 && [66, 69, 122, 125, 234, 237].includes(t) ? C.flowerDark : null;
});

// BARRICADE becomes a Sperrmüll pile (still dry wood, still flammable) with a bike wheel.
for (const t of [T.FLAT_BARRICADE, T.RAISED_BARRICADE, T.BARRICADE_OVERHANG])
  mapTile(t, k => k.kind === 'colour' ? RAMP.sperr(k.L) : null);
const WHEEL = [
  '.RRR.',
  'R.s.R',
  'RsHsR',
  'R.s.R',
  '.RRR.',
];
stamp(T.FLAT_BARRICADE, 9, 1, WHEEL, {R: 'zincLight', s: 'zincDark', H: 'zincShadow'});
stamp(T.BARRICADE_OVERHANG, 1, 9, WHEEL, {R: 'zincLight', s: 'zincDark', H: 'zincShadow'});

// stairs: concrete Kellertreppe, the down-stair pit gets a clinker edge
mapTile(T.ENTRANCE, k => k.kind === 'grey' ? RAMP.concrete(k.L) : null);
mapTile(T.EXIT, (k, x, y) => k.kind !== 'grey' ? null : (k.L > 0x78 ? RAMP.face(k.L) : RAMP.concrete(k.L)));

// small litter on the moss deco alt: a cigarette butt
stamp(T.FLOOR_DECO_ALT, 10, 11, ['bbt'], {b: 'butt', t: 'buttTip'});

// Abgruende: nie fertig gebaute A100-Abschnitte (shared with the other regions)
KIT.a100Chasm(put);

// ---------------------------------------------------------------- verify + write
for (let i = 3; i < out.px.length; i += 4) if (out.px[i] !== src.px[i]) throw new Error('alpha changed at ' + (i >> 2));
const outPath = (() => { const i = argv.indexOf('--out'); return i >= 0 ? argv[i + 1] : TARGET; })();
fs.writeFileSync(outPath, encodePNG(out));
console.log('wrote ' + path.relative(process.cwd(), outPath));
// Since v4.0 the in-game props (barrels, barricade, grass…) come from terrain_features.png,
// row 0 for the sewers; copy the new pixels there too (see tools/lib/tileset-kit.cjs).
require('./lib/tileset-kit.cjs').syncFeatures(src, out, 0, argv);

// ---------------------------------------------------------------- optional previews
const pi = argv.indexOf('--preview');
if (pi >= 0) {
  const dir = argv[pi + 1]; fs.mkdirSync(dir, {recursive: true});
  const scale = (img, s, bgFn) => {
    const W = img.w * s, H = img.h * s, px = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = ((y / s | 0) * img.w + (x / s | 0)) * 4, j = (y * W + x) * 4, a = img.px[i + 3] / 255, bg = bgFn(x / s | 0, y / s | 0);
      for (let k = 0; k < 3; k++) px[j + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a)); px[j + 3] = 255;
    }
    return {w: W, h: H, px};
  };
  const checker = (x, y) => ((x >> 2) + (y >> 2)) & 1 ? [120, 40, 120] : [80, 20, 80];
  fs.writeFileSync(path.join(dir, 'hinterhof-atlas-3x.png'), encodePNG(scale(out, 3, checker)));
  fs.writeFileSync(path.join(dir, 'original-atlas-3x.png'), encodePNG(scale(src, 3, checker)));
  for (const [name, atlas] of [['hinterhof-minimap-3x.png', out], ['original-minimap-3x.png', src]])
    fs.writeFileSync(path.join(dir, name), encodePNG(scale(miniMap(atlas), 3, () => [0, 0, 0])));
  console.log('previews in ' + dir);
}

// A tiny re-implementation of DungeonTerrainTilemap + DungeonWallsTilemap selection logic.
function miniMap(atlas) {
  const MAP = [
    'WWWWWWWWWWWWWW',
    'WWWDWWDWWWDWDW',
    'W<...,.W..B.bW',
    'W..gg..d.....W',
    'W.gg~~~W.X...W',
    'W..~~~.WWWLWWW',
    'W...~.s.W....W',
    'WWoWW.ssD.".>W',
    'W....e...."".W',
    'WWWWWWWWWWWWWW',
  ];
  const w = MAP[0].length, h = MAP.length, cell = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : MAP[y][x];
  const isWall = c => c === null || c === 'W' || c === 'D';
  const isDoor = c => c === 'd' || c === 'o' || c === 'L';
  const waterOK = c => c !== null && !isWall(c) && c !== '~';
  const hash = (x, y) => { let v = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
  const variance = MAP.map((r, y) => [...r].map((_, x) => hash(x, y)));
  const img = {w: w * 16, h: h * 16, px: Buffer.alloc(w * h * 256 * 4)};
  const waterTex = fs.existsSync(WATER) ? decodePNG(fs.readFileSync(WATER)) : null;
  function blit(t, cx, cy) {
    if (t < 0) return;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = idx(t, x, y), a = atlas.px[i + 3] / 255; if (!a) continue;
      const j = ((cy * 16 + y) * img.w + cx * 16 + x) * 4;
      for (let k = 0; k < 3; k++) img.px[j + k] = Math.round(atlas.px[i + k] * a + img.px[j + k] * (1 - a));
      img.px[j + 3] = 255;
    }
  }
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    if (cell(cx, cy) !== '~' || !waterTex) continue;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = (((cy * 16 + y) % waterTex.h) * waterTex.w + (cx * 16 + x) % waterTex.w) * 4, j = ((cy * 16 + y) * img.w + cx * 16 + x) * 4;
      waterTex.px.copy(img.px, j, i, i + 4); img.px[j + 3] = 255;
    }
  }
  const alt = (base, v, pairs) => { for (const [chance, a] of pairs) if (v < chance) base = a; return base; };
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const c = cell(cx, cy), v = variance[cy][cx], below = cell(cx, cy + 1), above = cell(cx, cy - 1);
    let t = -1;
    if (c === '.' || c === '"' || c === 'X' || c === 'B' || c === 'b') t = alt(T.FLOOR, v, [[52.5, T.FLOOR_ALT_1], [5, T.FLOOR_ALT_2]]);
    if (c === ',') t = alt(T.FLOOR_DECO, v, [[50, T.FLOOR_DECO_ALT]]);
    if (c === 'g') t = alt(T.GRASS, v, [[50, T.GRASS_ALT]]);
    if (c === 'e') t = alt(T.EMBERS, v, [[50, T.EMBERS_ALT]]);
    if (c === 's') t = alt(T.FLOOR_SP, v, [[50, T.FLOOR_SP_ALT]]);
    if (c === '<') t = T.ENTRANCE; if (c === '>') t = T.EXIT;
    if (c === '~') t = T.WATER + (waterOK(above) ? 1 : 0) + (waterOK(cell(cx + 1, cy)) ? 2 : 0) + (waterOK(below) ? 4 : 0) + (waterOK(cell(cx - 1, cy)) ? 8 : 0);
    blit(t, cx, cy);
    if (c === 'B') t = T.RAISED_REGION_DECO; else if (c === 'b') t = T.RAISED_REGION_DECO_ALT; else if (c === 'X') t = T.RAISED_BARRICADE;
    else if (c === '"') t = alt(122, v, [[50, 125]]);
    else if (isDoor(c)) t = isWall(above) ? T.RAISED_DOOR_SIDEWAYS : ({d: T.RAISED_DOOR, o: T.RAISED_DOOR_OPEN, L: T.RAISED_DOOR_LOCKED})[c];
    else if (isWall(c)) {
      if (below === null || isWall(below)) t = -1;
      else {
        t = isDoor(below) ? 88 : c === 'D' ? alt(84, v, [[50, 100]]) : alt(80, v, [[50, 96]]);
        if (!isWall(cell(cx + 1, cy))) t += 1; if (!isWall(cell(cx - 1, cy))) t += 2;
      }
    } else t = -1;
    blit(t, cx, cy);
  }
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) { // walls layer
    const c = cell(cx, cy), below = cell(cx, cy + 1); let t = -1;
    if (isWall(c)) {
      if (below !== null && !isWall(below)) {
        t = below === 'd' ? T.DOOR_SIDEWAYS : below === 'L' ? T.DOOR_SIDEWAYS_LOCKED : -1;
      } else {
        t = T.WALLS_INTERNAL;
        if (!isWall(cell(cx + 1, cy))) t += 1; if (!isWall(cell(cx + 1, cy + 1))) t += 2;
        if (!isWall(cell(cx - 1, cy + 1))) t += 4; if (!isWall(cell(cx - 1, cy))) t += 8;
      }
    } else if (below !== null && isWall(below)) {
      t = c === 'o' ? T.DOOR_SIDEWAYS_OVERHANG : c === 'd' ? T.DOOR_SIDEWAYS_OVERHANG_CLOSED : c === 'L' ? T.DOOR_SIDEWAYS_OVERHANG_LOCKED : T.WALL_OVERHANG;
      if (!isWall(cell(cx + 1, cy + 1))) t += 1; if (!isWall(cell(cx - 1, cy + 1))) t += 2;
    } else if (below === 'd' || below === 'L') t = T.DOOR_OVERHANG;
    else if (below === 'o') t = T.DOOR_OVERHANG_OPEN;
    else if (below === 'B') t = T.REGION_DECO_OVERHANG; else if (below === 'b') t = T.REGION_DECO_ALT_OVERHANG;
    else if (below === 'X') t = T.BARRICADE_OVERHANG; else if (below === '"') t = alt(234, variance[cy + 1][cx], [[50, 237]]);
    blit(t, cx, cy);
  }
  return img;
}
