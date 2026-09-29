// Shared toolkit for the Neukölln region tilesets (tiles_prison/caves/city/halls.png).
// Pure Node (zlib only). Each region script opens the unmodified upstream atlas from a
// git blob, rewrites RGB per tile function and writes the result; alpha is never changed.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');

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
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const shade = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
// luminance -> colour, linear between stops, so original shading survives a recolour
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
const range = (a, n) => Array.from({length: n}, (_, i) => a + i);

// ---------------------------------------------------------------- DungeonTileSheet cell indices
const T = {
  FLOOR: 0, FLOOR_DECO: 1, GRASS: 2, EMBERS: 3, FLOOR_SP: 4, FLOOR_ALT_1: 6, FLOOR_DECO_ALT: 7, GRASS_ALT: 8,
  EMBERS_ALT: 9, FLOOR_SP_ALT: 10, FLOOR_ALT_2: 12, ENTRANCE: 16, EXIT: 17, WELL: 18, EMPTY_WELL: 19, PEDESTAL: 20,
  ENTRANCE_SP: 22, CHASM: 24, CHASM_FLOOR: 25, CHASM_FLOOR_SP: 26, CHASM_WALL: 27, CHASM_WATER: 28, WATER: 32,
  FLAT_WALL: 48, FLAT_WALL_DECO: 49, FLAT_BOOKSHELF: 50, FLAT_WALL_ALT: 52, FLAT_WALL_DECO_ALT: 53, FLAT_BOOKSHELF_ALT: 54,
  FLAT_DOOR: 56, FLAT_DOOR_OPEN: 57, FLAT_DOOR_LOCKED: 58, FLAT_DOOR_CRYSTAL: 59, UNLOCKED_EXIT: 60, LOCKED_EXIT: 61,
  FLAT_ALCHEMY_POT: 64, FLAT_BARRICADE: 65, FLAT_HIGH_GRASS: 66, FLAT_FURROWED_GRASS: 67, FLAT_HIGH_GRASS_ALT: 69, FLAT_FURROWED_ALT: 70,
  FLAT_STATUE: 72, FLAT_STATUE_SP: 73, FLAT_REGION_DECO: 74, FLAT_REGION_DECO_ALT: 75,
  RAISED_WALL: 80, RAISED_WALL_DECO: 84, RAISED_WALL_DOOR: 88, RAISED_WALL_BOOKSHELF: 92,
  RAISED_WALL_ALT: 96, RAISED_WALL_DECO_ALT: 100, RAISED_WALL_BOOKSHELF_ALT: 108,
  RAISED_DOOR: 112, RAISED_DOOR_OPEN: 113, RAISED_DOOR_LOCKED: 114, RAISED_DOOR_CRYSTAL: 115, RAISED_DOOR_SIDEWAYS: 116,
  RAISED_ALCHEMY_POT: 120, RAISED_BARRICADE: 121, RAISED_HIGH_GRASS: 122, RAISED_FURROWED_GRASS: 123,
  RAISED_HIGH_GRASS_ALT: 125, RAISED_FURROWED_ALT: 126,
  RAISED_STATUE: 128, RAISED_STATUE_SP: 129, RAISED_REGION_DECO: 130, RAISED_REGION_DECO_ALT: 131,
  WALLS_INTERNAL: 144, WALL_INTERNAL_DECO: 160, WALL_INTERNAL_WOODEN: 176,
  WALL_OVERHANG: 192, WALL_OVERHANG_DECO: 196, WALL_OVERHANG_WOODEN: 200,
  DOOR_SIDEWAYS_OVERHANG: 208, DOOR_SIDEWAYS_OVERHANG_CLOSED: 212, DOOR_SIDEWAYS_OVERHANG_LOCKED: 216, DOOR_SIDEWAYS_OVERHANG_CRYSTAL: 220,
  DOOR_OVERHANG: 224, DOOR_OVERHANG_OPEN: 225, DOOR_OVERHANG_CRYSTAL: 226, DOOR_SIDEWAYS: 227,
  DOOR_SIDEWAYS_LOCKED: 228, DOOR_SIDEWAYS_CRYSTAL: 229, EXIT_UNDERHANG: 230,
  ALCHEMY_POT_OVERHANG: 232, BARRICADE_OVERHANG: 233, HIGH_GRASS_OVERHANG: 234, FURROWED_OVERHANG: 235,
  HIGH_GRASS_OVERHANG_ALT: 237, FURROWED_OVERHANG_ALT: 238,
  STATUE_OVERHANG: 240, STATUE_SP_OVERHANG: 241, REGION_DECO_OVERHANG: 242, REGION_DECO_ALT_OVERHANG: 243,
};
// cells that show the plain floor through (water edges, stairs, grass, props, doorways)
const FLOOR_THROUGH = [T.FLOOR_DECO, T.GRASS, T.EMBERS, T.FLOOR_DECO_ALT, T.GRASS_ALT, T.EMBERS_ALT, T.ENTRANCE, T.EXIT,
  T.WELL, T.EMPTY_WELL, T.PEDESTAL, T.CHASM_FLOOR, ...range(33, 15), T.FLAT_DOOR_OPEN, T.FLAT_BARRICADE, T.FLAT_HIGH_GRASS,
  T.FLAT_FURROWED_GRASS, T.FLAT_HIGH_GRASS_ALT, T.FLAT_FURROWED_ALT, T.FLAT_STATUE, T.FLAT_REGION_DECO,
  T.RAISED_DOOR, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_LOCKED, T.RAISED_DOOR_CRYSTAL, T.RAISED_DOOR_SIDEWAYS,
  T.RAISED_BARRICADE, T.RAISED_HIGH_GRASS, T.RAISED_FURROWED_GRASS, T.RAISED_HIGH_GRASS_ALT, T.RAISED_FURROWED_ALT,
  T.RAISED_STATUE, T.RAISED_REGION_DECO, T.RAISED_ALCHEMY_POT, T.FLAT_ALCHEMY_POT];
const RAISED_DOORS = [T.RAISED_DOOR, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_LOCKED, T.RAISED_DOOR_CRYSTAL];

// ---------------------------------------------------------------- atlas
function open({name, blob, argv = process.argv.slice(2)}) {
  const target = path.join(ROOT, 'core/src/main/assets/environment', name);
  const si = argv.indexOf('--source');
  let buf;
  if (si >= 0) buf = fs.readFileSync(argv[si + 1]);
  else {
    try { buf = execFileSync('git', ['cat-file', 'blob', blob], {cwd: ROOT, maxBuffer: 1 << 24}); }
    catch (e) { throw new Error(`Original ${name} (git blob ${blob}) not found; fetch history or pass --source`); }
  }
  const src = decodePNG(buf);
  if (src.w !== 256 || src.h !== 256) throw new Error('unexpected source size');
  const out = {w: 256, h: 256, px: Buffer.from(src.px)};
  const idx = (t, x, y) => ((((t >> 4) * 16 + y) * 256) + (t % 16) * 16 + x) * 4;
  const A = {src, out, target, argv, idx};
  A.alphaAt = (t, x, y) => src.px[idx(t, x, y) + 3];
  A.srcRGB = (t, x, y) => { const i = idx(t, x, y); return [src.px[i], src.px[i + 1], src.px[i + 2]]; };
  A.outRGB = (t, x, y) => { const i = idx(t, x, y); return [out.px[i], out.px[i + 1], out.px[i + 2]]; };
  A.put = (t, x, y, c) => {
    if (!c || x < 0 || y < 0 || x > 15 || y > 15) return;
    const i = idx(t, x, y); if (!src.px[i + 3]) return;
    out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2];
  };
  A.solid = (t, x, y, c) => { if (x >= 0 && y >= 0 && x < 16 && y < 16 && A.alphaAt(t, x, y) === 255) A.put(t, x, y, c); };
  // ascii overlay; '.' and ' ' leave pixels alone; only fully opaque pixels are painted
  A.stamp = (t, ox, oy, rows, keys) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const k = keys[ch]; if (!k) throw new Error('no colour for ' + ch);
    A.solid(t, ox + x, oy + y, typeof k === 'string' ? rgb(k) : k);
  }));
  A.copyTile = (from, to, rows = [0, 16]) => { for (let y = rows[0]; y < rows[1]; y++) for (let x = 0; x < 16; x++) A.put(to, x, y, A.outRGB(from, x, y)); };
  A.floorSet = new Set();
  A.classify = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = lum(r, g, b), sat = mx - mn, h = hex([r, g, b]);
    if (mx < 6) return {kind: 'black', L, sat, h};
    if (A.floorSet.has(h)) return {kind: 'floor', L, sat, h};
    if (sat <= 8) return {kind: 'grey', L, sat, h};
    return {kind: 'colour', L, sat, h, r, g, b};
  };
  // fn(k, x, y, rgb) returns new rgb or null; rows limits the y range
  A.mapTile = (t, fn, rows = [0, 16]) => {
    for (let y = rows[0]; y < rows[1]; y++) for (let x = 0; x < 16; x++) {
      if (!A.alphaAt(t, x, y)) continue;
      const c = A.srcRGB(t, x, y), res = fn(A.classify(c), x, y, c);
      if (res) A.put(t, x, y, res);
    }
  };
  A.tileColours = t => { const s = new Set(); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (A.alphaAt(t, x, y)) s.add(hex(A.srcRGB(t, x, y))); return s; };
  // draw a 16x16 ascii design with a key->colour map onto a cell (all opaque pixels)
  A.draw = (t, art, keys) => art.forEach((row, y) => [...row].forEach((ch, x) => { const k = keys[ch]; if (k) A.put(t, x, y, typeof k === 'string' ? rgb(k) : k); }));
  // original floor colours inside FLOOR_THROUGH cells -> new floor at the same grid position
  A.substituteFloor = (from = T.FLOOR, extra = []) => {
    for (const t of [...FLOOR_THROUGH, ...extra]) {
      const rows = RAISED_DOORS.includes(t) ? [11, 16] : [0, 16];
      A.mapTile(t, (k, x, y) => k.kind === 'floor' ? A.outRGB(from, x, y) : null, rows);
    }
  };
  // Redraw a raised wall face (rows y0..15) from a design function while keeping the
  // end-of-wall shading that the +1/+2/+3 variants have relative to variant +0.
  A.face = (base, design, y0 = 4, n = 4) => {
    for (let v = 0; v < n; v++) for (let y = y0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const t = base + v, c = design(x, y, v); if (!c) continue;
      const L0 = lum(...A.srcRGB(base, x, y)), L1 = lum(...A.srcRGB(t, x, y));
      const f = Math.abs(L1 - L0) < 3 ? 1 : Math.max(0.35, Math.min(1.6, (L1 + 8) / (L0 + 8)));
      A.put(t, x, y, shade(c, f));
    }
  };
  A.finish = (miniMapSpec = {}) => {
    if (miniMapSpec.stage !== undefined) syncFeatures(src, out, miniMapSpec.stage, argv);
    for (let i = 3; i < out.px.length; i += 4) if (out.px[i] !== src.px[i]) throw new Error('alpha changed at ' + (i >> 2));
    const oi = argv.indexOf('--out'), outPath = oi >= 0 ? argv[oi + 1] : target;
    fs.writeFileSync(outPath, encodePNG(out));
    console.log('wrote ' + path.relative(process.cwd(), outPath));
    const pi = argv.indexOf('--preview');
    if (pi >= 0) {
      const dir = argv[pi + 1], base = name.replace(/\.png$/, ''); fs.mkdirSync(dir, {recursive: true});
      const checker = (x, y) => ((x >> 2) + (y >> 2)) & 1 ? [120, 40, 120] : [80, 20, 80];
      fs.writeFileSync(path.join(dir, base + '-atlas-3x.png'), encodePNG(scale(out, 3, checker)));
      fs.writeFileSync(path.join(dir, base + '-original-atlas-3x.png'), encodePNG(scale(src, 3, checker)));
      fs.writeFileSync(path.join(dir, base + '-minimap-3x.png'), encodePNG(scale(miniMap(out, idx, miniMapSpec), 3, () => [0, 0, 0])));
      fs.writeFileSync(path.join(dir, base + '-original-minimap-3x.png'), encodePNG(scale(miniMap(src, idx, miniMapSpec), 3, () => [0, 0, 0])));
      console.log('previews in ' + dir);
    }
  };
  return A;
}

function scale(img, s, bgFn) {
  const W = img.w * s, H = img.h * s, px = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((y / s | 0) * img.w + (x / s | 0)) * 4, j = (y * W + x) * 4, a = img.px[i + 3] / 255, bg = bgFn(x / s | 0, y / s | 0);
    for (let k = 0; k < 3; k++) px[j + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a)); px[j + 3] = 255;
  }
  return {w: W, h: H, px};
}

// ---------------------------------------------------------------- preview mini map
// Legend: W wall, D wall deco, . floor, , floor deco, g grass, " high grass, ~ water,
// s special floor, e embers, < entrance, > exit, d door, o open door, L locked door,
// B region deco, b region deco alt, X barricade, S statue, K bookshelf, C chasm, A alchemy pot
const DEFAULT_MAP = [
  'WWWWWWWWWWWWWW',
  'WWWDWWDWWWDWDW',
  'W<...,.W..B.bW',
  'W..gg..d.....W',
  'W.gg~~~W.X.S.W',
  'W..~~~.WWWLWKW',
  'W...~.s.W....W',
  'WWoWW.ssD.".>W',
  'W....e..CC"".W',
  'WWWWWWWWWWWWWW',
];
function miniMap(atlas, idx, spec = {}) {
  const MAP = spec.map || DEFAULT_MAP, waterFile = spec.water;
  const w = MAP[0].length, h = MAP.length, cell = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : MAP[y][x];
  const isWall = c => c === null || c === 'W' || c === 'D' || c === 'K';
  const isDoor = c => c === 'd' || c === 'o' || c === 'L';
  const waterOK = c => c !== null && !isWall(c) && c !== '~' && c !== 'C';
  const hash = (x, y) => { let v = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
  const variance = MAP.map((r, y) => [...r].map((_, x) => hash(x, y)));
  const img = {w: w * 16, h: h * 16, px: Buffer.alloc(w * h * 256 * 4)};
  const waterTex = waterFile && fs.existsSync(waterFile) ? decodePNG(fs.readFileSync(waterFile)) : null;
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
  const floorOf = v => alt(T.FLOOR, v, [[52.5, T.FLOOR_ALT_1], [5, T.FLOOR_ALT_2]]);
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
    const c = cell(cx, cy), v = variance[cy][cx], below = cell(cx, cy + 1), above = cell(cx, cy - 1);
    let t = -1;
    if ('."XBbSA'.includes(c)) t = floorOf(v);
    if (c === ',') t = alt(T.FLOOR_DECO, v, [[50, T.FLOOR_DECO_ALT]]);
    if (c === 'g') t = alt(T.GRASS, v, [[50, T.GRASS_ALT]]);
    if (c === 'e') t = alt(T.EMBERS, v, [[50, T.EMBERS_ALT]]);
    if (c === 's') t = alt(T.FLOOR_SP, v, [[50, T.FLOOR_SP_ALT]]);
    if (c === '<') t = T.ENTRANCE; if (c === '>') t = T.EXIT;
    if (c === 'C') t = above === 'C' ? T.CHASM : isWall(above) ? T.CHASM_WALL : above === '~' ? T.CHASM_WATER : above === 's' ? T.CHASM_FLOOR_SP : T.CHASM_FLOOR;
    if (c === '~') t = T.WATER + (waterOK(above) ? 1 : 0) + (waterOK(cell(cx + 1, cy)) ? 2 : 0) + (waterOK(below) ? 4 : 0) + (waterOK(cell(cx - 1, cy)) ? 8 : 0);
    blit(t, cx, cy);
    t = -1;
    if (c === 'B') t = T.RAISED_REGION_DECO; else if (c === 'b') t = T.RAISED_REGION_DECO_ALT; else if (c === 'X') t = T.RAISED_BARRICADE;
    else if (c === 'S') t = T.RAISED_STATUE; else if (c === 'A') t = T.RAISED_ALCHEMY_POT;
    else if (c === '"') t = alt(T.RAISED_HIGH_GRASS, v, [[50, T.RAISED_HIGH_GRASS_ALT]]);
    else if (isDoor(c)) t = isWall(above) ? T.RAISED_DOOR_SIDEWAYS : ({d: T.RAISED_DOOR, o: T.RAISED_DOOR_OPEN, L: T.RAISED_DOOR_LOCKED})[c];
    else if (isWall(c) && below !== null && !isWall(below)) {
      t = isDoor(below) ? T.RAISED_WALL_DOOR : c === 'D' ? alt(T.RAISED_WALL_DECO, v, [[50, T.RAISED_WALL_DECO_ALT]])
        : c === 'K' ? alt(T.RAISED_WALL_BOOKSHELF, v, [[50, T.RAISED_WALL_BOOKSHELF_ALT]]) : alt(T.RAISED_WALL, v, [[50, T.RAISED_WALL_ALT]]);
      if (!isWall(cell(cx + 1, cy))) t += 1; if (!isWall(cell(cx - 1, cy))) t += 2;
    }
    blit(t, cx, cy);
  }
  for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) { // walls layer
    const c = cell(cx, cy), below = cell(cx, cy + 1); let t = -1;
    if (isWall(c)) {
      if (below !== null && !isWall(below)) t = below === 'd' ? T.DOOR_SIDEWAYS : below === 'L' ? T.DOOR_SIDEWAYS_LOCKED : -1;
      else {
        t = (c === 'K' || below === 'K') ? T.WALL_INTERNAL_WOODEN : T.WALLS_INTERNAL;
        if (!isWall(cell(cx + 1, cy))) t += 1; if (!isWall(cell(cx + 1, cy + 1))) t += 2;
        if (!isWall(cell(cx - 1, cy + 1))) t += 4; if (!isWall(cell(cx - 1, cy))) t += 8;
      }
    } else if (below !== null && isWall(below)) {
      t = c === 'o' ? T.DOOR_SIDEWAYS_OVERHANG : c === 'd' ? T.DOOR_SIDEWAYS_OVERHANG_CLOSED : c === 'L' ? T.DOOR_SIDEWAYS_OVERHANG_LOCKED
        : below === 'K' ? T.WALL_OVERHANG_WOODEN : T.WALL_OVERHANG;
      if (!isWall(cell(cx + 1, cy + 1))) t += 1; if (!isWall(cell(cx - 1, cy + 1))) t += 2;
    } else if (below === 'd' || below === 'L') t = T.DOOR_OVERHANG;
    else if (below === 'o') t = T.DOOR_OVERHANG_OPEN;
    else if (below === 'B') t = T.REGION_DECO_OVERHANG; else if (below === 'b') t = T.REGION_DECO_ALT_OVERHANG;
    else if (below === 'S') t = T.STATUE_OVERHANG; else if (below === 'A') t = T.ALCHEMY_POT_OVERHANG;
    else if (below === 'X') t = T.BARRICADE_OVERHANG; else if (below === '"') t = alt(T.HIGH_GRASS_OVERHANG, variance[cy + 1][cx], [[50, T.HIGH_GRASS_OVERHANG_ALT]]);
    blit(t, cx, cy);
  }
  return img;
}


// ---------------------------------------------------------------- terrain_features.png
// Since v4.0 the props and tall grass are drawn from environment/terrain_features.png
// (TerrainFeaturesTilemap, one row per region: 128 + 16*stage). Those cells are exact
// masked copies of the raised cells in the region atlas, so after recolouring the region
// atlas we copy the new pixels into that region's row. Other rows keep whatever the
// current file holds (other region scripts), this row always restarts from the original.
const FEATURES_BLOB = 'ba6c810a5a367a07f1b39e66f6080955bced1f5e';
const FEATURE_SOURCES = [T.RAISED_HIGH_GRASS, T.RAISED_HIGH_GRASS_ALT, T.RAISED_FURROWED_GRASS, T.RAISED_FURROWED_ALT,
  T.GRASS, T.GRASS_ALT, T.RAISED_BARRICADE, T.RAISED_ALCHEMY_POT, T.RAISED_STATUE, T.RAISED_REGION_DECO, T.RAISED_REGION_DECO_ALT];
function syncFeatures(srcTiles, outTiles, stage, argv = process.argv.slice(2)) {
  const file = path.join(ROOT, 'core/src/main/assets/environment/terrain_features.png');
  const orig = decodePNG(execFileSync('git', ['cat-file', 'blob', FEATURES_BLOB], {cwd: ROOT, maxBuffer: 1 << 24}));
  const cur = fs.existsSync(file) ? decodePNG(fs.readFileSync(file)) : orig;
  const px = Buffer.from(cur.px);
  const idx = (t, x, y) => ((((t >> 4) * 16 + y) * 256) + (t % 16) * 16 + x) * 4;
  let copied = 0, kept = 0;
  FEATURE_SOURCES.forEach((srcCell, n) => {
    const fc = 128 + 16 * stage + n;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = idx(fc, x, y), j = idx(srcCell, x, y);
      orig.px.copy(px, i, i, i + 4);
      if (!orig.px[i + 3]) continue;
      if (orig.px.readUInt32BE(i) === srcTiles.px.readUInt32BE(j)) { outTiles.px.copy(px, i, j, j + 3); copied++; } else kept++;
    }
  });
  // alpha must match the original, except in the trap cells (rows 0-6, cols 0-8), which
  // generate-kiez-traps.cjs redraws completely as dog-poop markers
  for (let i = 3; i < px.length; i += 4) {
    const p = i >> 2, cx = (p % 256) >> 4, cy = (p >> 8) >> 4;
    if (cy <= 6 && cx <= 8) continue;
    if (px[i] !== orig.px[i]) throw new Error('terrain_features alpha changed');
  }
  const oi = argv.indexOf('--features-out');
  const target = oi >= 0 ? argv[oi + 1] : (argv.includes('--out') ? null : file);
  if (target) fs.writeFileSync(target, encodePNG({w: 256, h: 256, px}));
  console.log(`terrain_features row ${stage}: ${copied} px copied, ${kept} px kept` + (target ? '' : ' (not written: --out given)'));
}


// ---------------------------------------------------------------- tiny 3x4 pixel font
// For short, deliberately crude poster/graffiti words (MÄRZ, RAUS, BÄRG). Returns five
// ascii rows (umlaut row + four letter rows) with 'x' for ink, one blank column between letters.
const FONT = {
  M: ['x...x', 'xx.xx', 'x.x.x', 'x...x'], A: ['.x.', 'x.x', 'xxx', 'x.x'], R: ['xx.', 'x.x', 'xx.', 'x.x'],
  Z: ['xxx', '..x', '.x.', 'xxx'], U: ['x.x', 'x.x', 'x.x', 'xxx'], S: ['.xx', 'x..', '..x', 'xx.'],
  B: ['xx.', 'xxx', 'x.x', 'xxx'], G: ['.xx', 'x..', 'x.x', '.xx'], E: ['xxx', 'xx.', 'x..', 'xxx'],
  T: ['xxx', '.x.', '.x.', '.x.'], N: ['x.x', 'xxx', 'xxx', 'x.x'],
};
function word(w, maxWidth = 16) {
  const letters = [...w.normalize('NFD')].reduce((acc, ch) => { if (ch === '̈') acc[acc.length - 1].uml = true; else acc.push({ch}); return acc; }, []);
  const rows = ['', '', '', '', ''];
  const widths = letters.map(l => FONT[l.ch][0].length);
  let gaps = letters.length - 1;
  const total = () => widths.reduce((a, b) => a + b, 0) + gaps;
  while (total() > maxWidth && gaps > 0) gaps--;           // drop gaps from the end to fit
  letters.forEach((l, i) => {
    const g = FONT[l.ch]; if (!g) throw new Error('no glyph ' + l.ch);
    if (i && i <= gaps) rows.forEach((_, r) => { rows[r] += '.'; });
    const w = g[0].length, pad = (w - 3) >> 1;
    rows[0] += l.uml ? '.'.repeat(pad) + 'x.x' + '.'.repeat(w - 3 - pad) : '.'.repeat(w);
    g.forEach((line, r) => { rows[r + 1] += line; });
  });
  return rows;
}

module.exports = {word, miniMap, syncFeatures, FEATURES_BLOB, decodePNG, encodePNG, rgb, hex, lum, mix, shade, ramp, range, T, FLOOR_THROUGH, open, ROOT};
