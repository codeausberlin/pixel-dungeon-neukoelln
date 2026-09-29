// Kiez-Gegner (Ebene 1-5): rebuilds the enemy sprite atlases for the Neuköllner Hinterhöfe
// from the unmodified upstream Shattered Pixel Dungeon v4.0.0 PNGs stored in git.
// Pure Node (zlib only), no npm packages.
//
//   node tools/generate-kiez-mobs.cjs                   write all atlases
//   node tools/generate-kiez-mobs.cjs --only rat,snake  write only these atlases
//   node tools/generate-kiez-mobs.cjs --preview DIR     also write x6 before/after previews
//
// Contract (checked, the script aborts otherwise): every atlas keeps its size, frame grid,
// frame order and the alpha value of every single pixel. Only RGB changes: palette remaps
// plus small hand-placed details inside the existing silhouette. Animation indices in the
// XxxSprite.java classes therefore stay valid without any code change.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SPRITES = path.join(ROOT, 'core/src/main/assets/sprites');

// git blobs of the unmodified upstream v4.0.0 atlases (always the source, never the output)
// and the TextureFilm frame size from the matching XxxSprite.java.
const ATLAS = {
  rat:   {blob: '0783908faf6bf65d01e6a0b246d074898af7235a', fw: 16, fh: 15}, // Rat 0-14, Albino 16-30, FetidRat 32-46
  snake: {blob: 'f302039cba6865ec8bca9d4401b87e5f4b069392', fw: 12, fh: 11}, // Snake 0-13
  gnoll: {blob: '7c74c6a3bc3c0dec5295ac9d0dc8e803f7e67a1b', fw: 12, fh: 15}, // Gnoll 0-10, Exile 21-31, Trickster 42-52
  crab:  {blob: 'be4c25beacc81d64271673b1981389588100a60a', fw: 16, fh: 16}, // Crab 0-13, Hermit 16-29, Great 32-45
  swarm: {blob: 'b66dfbfbff8595a2f7c1b71cc6406dd0084642b9', fw: 16, fh: 16}, // Swarm 0-14
  slime: {blob: '38f2adf48a448e09905a85e6f0385edf951d8837', fw: 14, fh: 12}, // Slime 0-7, Caustic 9-16
  goo:   {blob: '92a1d2ebde567eb9c8138951d56c1754b212f488', fw: 20, fh: 14}, // Goo 0-10
  mimic: {blob: '7f13275b983591dcf80ad15af1c4543f46077a18', fw: 16, fh: 16}, // Mimic 0-12, Golden 16-28, Crystal 32-44, Ebony 48-60
};

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
  if (depth !== 8 && type !== 3) throw new Error('unsupported bit depth');
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

// ---------------------------------------------------------------- atlas helpers
const argv = process.argv.slice(2);
const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const hex = c => c.map(v => v.toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]) => (r * 299 + g * 587 + b * 114) / 1000;

function loadAtlas(name) {
  const def = ATLAS[name];
  let buf;
  try { buf = execFileSync('git', ['cat-file', 'blob', def.blob], {cwd: ROOT, maxBuffer: 1 << 24}); }
  catch (e) { throw new Error(name + ': upstream blob ' + def.blob + ' not found in git; fetch full history'); }
  const src = decodePNG(buf), out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const per = Math.floor(src.w / def.fw);
  const A = {name, src, out, fw: def.fw, fh: def.fh, per};
  A.i = (f, x, y) => (((Math.floor(f / per) * def.fh + y) * src.w) + (f % per) * def.fw + x) * 4;
  A.inside = (x, y) => x >= 0 && y >= 0 && x < def.fw && y < def.fh;
  A.alpha = (f, x, y) => A.inside(x, y) ? src.px[A.i(f, x, y) + 3] : 0;
  A.get = (f, x, y) => { if (!A.alpha(f, x, y)) return null; const i = A.i(f, x, y); return hex([src.px[i], src.px[i + 1], src.px[i + 2]]); };
  A.cur = (f, x, y) => { if (!A.alpha(f, x, y)) return null; const i = A.i(f, x, y); return hex([out.px[i], out.px[i + 1], out.px[i + 2]]); };
  // RGB only: transparent pixels are never painted and alpha is never written
  A.set = (f, x, y, h) => {
    if (!A.alpha(f, x, y)) return false;
    const i = A.i(f, x, y), c = rgb(h); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; return true;
  };
  A.each = (frames, fn) => { for (const f of frames) for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) { const c = A.get(f, x, y); if (c) fn(f, x, y, c); } };
  // exact palette remap on the source colours
  A.remap = (frames, map) => A.each(frames, (f, x, y, c) => { if (map[c]) A.set(f, x, y, map[c]); });
  A.find = (f, colours) => { const r = []; const s = new Set([].concat(colours)); for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) if (s.has(A.get(f, x, y))) r.push([x, y]); return r; };
  A.stamp = (f, ox, oy, rows, keys) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (!keys[ch]) throw new Error(name + ': no colour for ' + ch);
    A.set(f, ox + x, oy + y, keys[ch]);
  }));
  A.colours = frames => { const s = new Set(); A.each(frames, (f, x, y, c) => s.add(c)); return s; };
  return A;
}
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// luminance ramp: maps source brightness to new colours so the original shading survives
function ramp(stops) {
  const s = stops.map(([l, c]) => [l, rgb(c)]);
  return c => {
    const L = lum(rgb(c));
    if (L <= s[0][0]) return hex(s[0][1]);
    for (let i = 1; i < s.length; i++) if (L <= s[i][0]) {
      const t = (L - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return hex(s[i][1].map((v, k) => Math.round(s[i - 1][1][k] + (v - s[i - 1][1][k]) * t)));
    }
    return hex(s[s.length - 1][1]);
  };
}

// ================================================================ the mobs
const PAINT = {};

// ---------------------------------------------------------------- rat: Pfandratte
// Grey-brown fur, red eyes kept, a small green Pfandflasche held between the front paws
// (paws are the anchor: found per frame, so the bottle follows every animation frame).
PAINT.rat = A => {
  const RAT = range(0, 14), ALBINO = range(16, 30), FETID = range(32, 46);
  A.remap(RAT, {
    '523c26': '463f37', '917c62': '8e877b', '73634f': '6d665c', '554839': '504a42',
    '342618': '2f2a25', '6e5d4a': '686157', '56493a': '4f4941', '1d150d': '1a1714', '251a11': '221e1a',
    '1c140d': '191613', '884136': '8a4a44',
  });
  const bottle = (f, paw, glass, glassDark, cap) => {
    const paws = A.find(f, paw);
    for (const [x, y] of paws) {
      if (!paws.some(([x2, y2]) => y2 === y && x2 === x + 2)) continue;
      const bx = x + 1;
      A.set(f, bx, y - 1, cap);                       // Kronkorken
      A.set(f, bx, y, glass); A.set(f, bx, y + 1, glass); A.set(f, bx, y + 2, glass);
      A.set(f, bx + 1, y + 1, glassDark); A.set(f, bx + 1, y + 2, glassDark);
      return true;
    }
    return false;
  };
  for (const f of RAT) bottle(f, '884136', '5fae4a', '2f6b2a', 'd8c25a');
  // Albino = Scherbenratte: white fur with glass shard glints, bottle in clear glass
  for (const f of ALBINO) {
    bottle(f, '7c4c44', '7fd0b8', '3a8a76', 'd8c25a');
  }
  // Fetid = Tonnenhofratte: slightly more Biotonne brown-green, holds a brown bottle
  for (const f of FETID) bottle(f, '3f2b1f', '8a5a24', '4d3014', 'b0b0a8');
};

// breadth-first distance through the silhouette (8-connected) from a set of start pixels,
// used to follow long thin bodies (cable, stripes) regardless of the animation pose
function silhouetteDistance(A, f, starts) {
  const d = new Map(), q = [];
  for (const [x, y] of starts) { d.set(x + ',' + y, 0); q.push([x, y]); }
  while (q.length) {
    const [x, y] = q.shift(), k = d.get(x + ',' + y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy, key = X + ',' + Y;
      if ((dx || dy) && A.alpha(f, X, Y) && !d.has(key)) { d.set(key, k + 1); q.push([X, Y]); }
    }
  }
  return (x, y) => d.get(x + ',' + y);
}

// ---------------------------------------------------------------- snake: Kabelschlange
// A green-yellow Schutzleiter cable: stripes follow the body from the head, the head is a
// grey plug (the black eye stays), the red tongue becomes a small yellow spark.
PAINT.snake = A => {
  const SIDE = {'67b500': 'dark', '386800': 'dark', '7bd900': 'light', 'ccb751': 'belly', 'ffe565': 'bellyLight'};
  const GREEN = {dark: '2c7a30', light: '4fb152', belly: '9ccf7a', bellyLight: 'c4e6a2'};
  const YELLOW = {dark: 'b8961a', light: 'ecc933', belly: 'e8d680', bellyLight: 'fbf0b8'};
  const PLUG = {dark: '7d838b', light: 'e4e6e8', belly: 'b4b9bf', bellyLight: 'f2f3f4'};
  for (let f = 0; f <= 13; f++) {
    let starts = A.find(f, '000000');
    const isHead = starts.length > 0;
    if (!isHead) { // death frames: start at the top-left most pixel
      A.each([f], (ff, x, y) => { if (!starts.length || y < starts[0][1]) starts = [[x, y]]; });
    }
    const dist = silhouetteDistance(A, f, starts);
    A.each([f], (ff, x, y, c) => {
      if (c === 'ff0000') { A.set(f, x, y, 'fff27a'); return; }
      const side = SIDE[c]; if (!side) return;
      // smooth across the cable width so a stripe covers both pixels of the 2px body
      let d = dist(x, y) ?? 99;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = dist(x + dx, y + dy); if (n !== undefined && n < d) d = n + 0.5; }
      if (isHead && d <= 2 && y <= starts[0][1] + 1) { A.set(f, x, y, PLUG[side]); return; }
      A.set(f, x, y, ((Math.floor(d) % 5) >= 3 ? YELLOW : GREEN)[side]);
    });
  }
};

// ---------------------------------------------------------------- gnoll: Besichtigungswicht & Co.
// The hyena fur becomes a small, pale, over-friendly creature: gelled hair (the ears read as
// quiff tips), skin-toned face and long nose, white collar and shirt, a vest, dark trousers,
// and a clipboard held against the chest. Zones are found per frame from the black eyes.
function paintWicht(A, frames, P) {
  const R = {hair: ramp(P.hair), skin: ramp(P.skin), vest: ramp(P.vest), shirt: ramp(P.shirt), legs: ramp(P.legs)};
  for (const f of frames) {
    const eyes = A.find(f, '000000');
    let top = 99; A.each([f], (ff, x, y) => { top = Math.min(top, y); });
    const eyeY = eyes.length ? Math.min(...eyes.map(e => e[1])) : top + 3;
    A.each([f], (ff, x, y, c) => {
      if (P.keep.has(c)) return;
      const L = lum(rgb(c));
      let zone;
      if (y < eyeY - 1) zone = 'hair';
      else if (y <= eyeY + 3) zone = 'skin';
      else if (y <= eyeY + 7) zone = L > 175 ? 'shirt' : 'vest';
      else zone = 'legs';
      A.set(f, x, y, R[zone](c));
    });
    if (eyes.length && P.clipboard) {
      const ex = Math.min(...eyes.map(e => e[0]));
      A.stamp(f, ex + 1, eyeY + 5, P.clipboard, P.clipKeys);
    }
  }
}
PAINT.gnoll = A => {
  const skin = [[0, '1e1210'], [40, '4a2c22'], [75, '8a5a44'], [110, 'c48c6c'], [150, 'e8b898'], [200, 'f6d6bc']];
  const legs = [[0, '0e0f12'], [40, '1f2127'], [80, '33363f'], [130, '4a4e59'], [200, '6a6f7c']];
  const clipboard = ['bcb', 'wlw', 'www'];
  // Besichtigungswicht: navy vest over a white shirt, slicked dark hair
  paintWicht(A, range(0, 10), {
    hair: [[0, '120c0a'], [40, '241a16'], [90, '3a2c26'], [140, '5a4a42'], [200, '7a6a60']], skin, legs,
    vest: [[0, '101218'], [40, '1f2536'], [80, '2f3a55'], [120, '44527a'], [180, '5b6b96']],
    shirt: [[170, 'cfd8e0'], [215, 'f4f6f8']],
    keep: new Set(['000000']), clipboard, clipKeys: {b: '6b4a2a', c: 'c0c4c8', w: 'f1eee2', l: '4a4e59'},
  });
  // Entmieteter Wicht (Gnoll Exile): greyer, worn brown cardigan, keeps his red scar
  paintWicht(A, range(21, 31), {
    hair: [[0, '121212'], [60, '3a3a3a'], [140, '6e6e6e'], [255, 'a0a0a0']],
    skin: [[0, '1a1614'], [40, '3e3530'], [75, '6e5e54'], [110, 'a48c7c'], [150, 'c8b0a0'], [220, 'e6d4c6']], legs,
    vest: [[0, '120d0a'], [40, '2a1f18'], [80, '4a3726'], [120, '6b5236'], [180, '8a7050']],
    shirt: [[170, 'c9c3b6'], [230, 'e8e2d4']],
    keep: new Set(['000000', 'ff0000', '991f1f', 'ffffff']),
  });
  // Provisionswicht (Gnoll Trickster): flashy mustard suit, keeps the orange dart colour
  paintWicht(A, range(42, 52), {
    hair: [[0, '1a0e06'], [60, '3a2210'], [120, '5e3a1c'], [200, '8a5a2c']], skin, legs,
    vest: [[0, '1e1404'], [40, '4a3408'], [80, '7e5a10'], [120, 'b08420'], [180, 'd6aa3a']],
    shirt: [[170, 'd8dde4'], [215, 'f4f6f8']],
    keep: new Set(['000000', 'ff791f']), clipboard, clipKeys: {b: '3a2412', c: 'e0c050', w: 'f1eee2', l: '8a5a2c'},
  });
};

// ---------------------------------------------------------------- crab: Kanalpanzer
// Rusty cast-iron crab: shell and claws in rust, the pale underside becomes a small iron
// Gullydeckel grate, two light rivets flank the eyes. Hermit = Tonnenpanzer keeps its brown
// Biotonne lid; Great = Großer Kanalpanzer gets a darker iron body and a cream fridge-door claw.
PAINT.crab = A => {
  const rust = ramp([[60, '3a1d12'], [80, '552a17'], [120, '7e3f1f'], [135, '8f4a24'], [165, 'ad6230'], [180, 'bd7439'], [200, 'cf8c4a'], [230, 'e3ae70']]);
  const PINK = new Set(['ffb2a3', 'fab3ab', 'eb524a', 'f57e73', 'f59189', '97352f', 'c4746e', 'ffd5cc']);
  const BELLY = {'f5b689': '8b8e92', 'c4916d': '63666b', '97522f': '3f4145', 'a37958': '8b8e92', '7b6554': '63666b', '554037': '3f4145'};
  const RIVET = 'efe9da', SLOT = '26282b';
  const details = (f, eyeCol, bellyLight) => {
    const eyes = A.find(f, eyeCol).filter(([x, y]) => y >= 9);
    if (eyes.length !== 2 || eyes[0][1] !== eyes[1][1]) return;
    const [[x1, y], [x2]] = eyes;
    A.set(f, x1 - 2, y, RIVET); A.set(f, x2 + 2, y, RIVET);
    for (let x = 0; x < 16; x++) if (A.get(f, x, y + 1) === bellyLight && x % 2 === 0) A.set(f, x, y + 1, SLOT);
  };
  const body = frames => A.each(frames, (f, x, y, c) => {
    if (PINK.has(c)) A.set(f, x, y, rust(c));
    else if (BELLY[c]) A.set(f, x, y, BELLY[c]);
  });
  body(range(0, 13)); for (const f of range(0, 13)) details(f, '000000', 'f5b689');
  // Tonnenpanzer: crab parts as above, the shell becomes a brown Biotonne lid with a grey rim
  body(range(16, 29)); for (const f of range(16, 29)) details(f, '000000', 'f5b689');
  const lid = ramp([[15, '140e0b'], [30, '24170f'], [55, '3e2716'], [75, '553620'], [95, '6a452a']]);
  A.each(range(16, 29), (f, x, y, c) => {
    if (PINK.has(c) || BELLY[c] || c === '000000') return;
    const [r, g, b] = rgb(c);
    if (r >= g && g >= b && r - b > 8 && r < 0x90) A.set(f, x, y, lid(c)); // brown shell pixels only
  });
  // Großer Kanalpanzer
  const CLAW = new Set(['2f6c9b', '2470a6', '2871a0', '00497c', '005c8c', '0f6191', '002450', '001836', '001736', '002c52', '0079b8']);
  const fridge = ramp([[0, '4a4740'], [25, '7a766b'], [50, 'a8a397'], [75, 'd2cdbf'], [100, 'ebe7da'], [130, 'f8f5ec']]);
  const iron = ramp([[0, '141414'], [20, '2a2522'], [50, '4a3a30'], [80, '6a4a34'], [110, '8a5a36'], [150, 'a8703e']]);
  A.each(range(32, 45), (f, x, y, c) => {
    if (CLAW.has(c)) A.set(f, x, y, fridge(c));
    else if (BELLY[c]) A.set(f, x, y, BELLY[c]);
    else if (/^(2c6490|0a5a88|004474|358dcb|1e7cb2|00629a|00406c|000b3a|547792|699dc9|0d75ab)$/.test(c)) A.set(f, x, y, iron(c));
  });
  for (const f of range(32, 45)) details(f, '000000', 'a37958');
};

// ---------------------------------------------------------------- swarm: Biomüllschwarm
// Fruit flies from the Biotonne: the red fly eyes stay, the green bodies become banana-peel
// yellow with brown flecks and an apple-green highlight, and the translucent wings pick up a faint brown-green tint.
PAINT.swarm = A => {
  const frames = range(0, 14);
  const BODY = {'68ff98': 'b4d854', '43a362': 'e6bf3c', '629976': '7e5a26', '265c37': '3e2a14'};
  A.each(frames, (f, x, y, c) => {
    const i = A.i(f, x, y), a = A.src.px[i + 3];
    if (BODY[c]) {
      // banana peel: brown fleck on every third body pixel in a diagonal pattern
      A.set(f, x, y, (c === '629976' && (x + 2 * y) % 3 === 0) ? '5a3a18' : BODY[c]);
    } else if (a < 255) {
      const [r, g, b] = rgb(c); // wing: 35% towards a pale compost green-brown
      A.set(f, x, y, hex([r * 0.65 + 0xc8 * 0.35, g * 0.65 + 0xc4 * 0.35, b * 0.65 + 0x8a * 0.35].map(Math.round)));
    }
  });
};

// ---------------------------------------------------------------- slime: Feuchttuchzopf
// A clump of flushed wet wipes: dirty off-white, translucent like the original jelly, with
// diagonal fold lines that read as a twisted braid. Caustic = Reinigerzopf: the same braid
// soaked in violet drain cleaner.
PAINT.slime = A => {
  const braid = (frames, P) => A.each(frames, (f, x, y, c) => {
    const a = A.src.px[A.i(f, x, y) + 3];
    if (a === 255 && c === P.srcLine) A.set(f, x, y, P.line);
    else if (a === 255 && c === P.srcShine) A.set(f, x, y, P.shine);
    else if (a < 255) {
      const k = (x + y) % 4, j = (x - y + 40) % 5;
      A.set(f, x, y, k === 0 ? P.fold : (j === 0 ? P.fold2 : P.fill));
    }
  });
  braid(range(0, 7), {srcLine: '008000', srcShine: '80ff80', line: '3b362c', shine: 'ffffff', fill: 'efe9d6', fold: '9c9178', fold2: 'cbc2a6'});
  braid(range(9, 16), {srcLine: '000000', srcShine: '808080', line: '1c1230', shine: 'c8b8ff', fill: '5d4a9a', fold: '2f2560', fold2: '46397e'});
};

// ---------------------------------------------------------------- goo: Mietschimmel (boss)
// Stays a big, dark mass so the boss reads as threatening: black outline kept, the grey body
// becomes black-green mould with fuzzy spore clusters, and the pale shine is now a torn
// scrap of Raufaser/flower wallpaper stuck to it.
PAINT.goo = A => {
  const frames = range(0, 10);
  A.each(frames, (f, x, y, c) => {
    const n = (x * 7 + y * 13) % 17; // sparse, frame-independent spore pattern (no flicker)
    if (c === '262626') A.set(f, x, y, n === 0 ? '55803a' : (n === 5 || n === 9 ? '2f4a26' : '1a2619'));
    else if (c === '404040') A.set(f, x, y, n % 3 === 0 ? '4a6e32' : '2c3e26');
    else if (c === '060606') A.set(f, x, y, '0a120b');
    else if (c === '808080') {
      // wallpaper scrap: cream with thin rose stripes, darker where it tears into the mould
      const torn = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const o = A.get(f, x + dx, y + dy); return o && o !== '808080'; });
      A.set(f, x, y, x % 3 === 0 ? (torn ? '9a6e6a' : 'c48e88') : (torn ? 'b9aa88' : 'e8dcbc'));
    }
  });
};

// ghost.png moved to tools/generate-kiez-npcs.cjs (Schwabe an Weihnachten)

// ---------------------------------------------------------------- mimic: Sperrmüllmonster
// Replaces the whole mimic atlas (MimicSprite: 16x16 frames, variant rows 0/16/32/48 =
// normal/golden/crystal/ebony; 0 advanced hiding, 1-2 hiding, 3-4 idle, 3-6 run,
// 7-9 attack, 10-12 die; 13-15 stay empty). The pile is the chest icon from
// tools/generate-kiez-items.cjs (CONTAINER_ART, same rows and palette): hiding frames 0 and
// 1 are pixel-identical to the item icon shifted down by 2 px (item heap 16x14 vs. mimic
// 16x16, both with a 5 px perspective raise), checked below. Frame 2 is the upstream
// "twitch" of a non-stealthy mimic: the upper half lifts by 1 px and shows a dark gap.
// When awake the mattress splits into a maw: bedsprings as teeth, glowing eyes on the
// cardboard box (golden: same; crystal: on the glass), a cardboard tongue in the attack.
// This atlas changes silhouette and alpha, so it is exempt from the alpha contract
// (RESHAPED below); size and frame grid are still checked.
const KIEZ_ITEMS = require('./generate-kiez-items.cjs');
const MIMIC_VARIANTS = [['CHEST', 0], ['LOCKED_CHEST', 16], ['CRYSTAL_CHEST', 32], ['EBONY_CHEST', 48]];
const MAW = {1: '2a0610', 2: 'dcdce4', 3: 'ff4a3a', 4: 'e0b878', 5: '9a6e3a', 6: '4a0e18', 7: 'ffd0a0'};
const MIMIC_FRAMES = [
  {}, {}, {g: 1},
  {g: 1, eyes: 1, teeth: 1}, {g: 2, eyes: 1, teeth: 1},
  {g: 2, dy: -1, eyes: 1, teeth: 1}, {g: 3, dy: -1, eyes: 1, teeth: 1},
  {g: 3, eyes: 1, teeth: 1, tongue: 1}, {g: 4, eyes: 1, teeth: 1, tongue: 2}, {g: 4, dx: 1, eyes: 1, teeth: 1, tongue: 3},
  {g: 1, dead: 1}, {collapse: 2, dead: 1}, {collapse: 4, dead: 1, dim: 0.72},
];
function mimicFrame(art, {g = 0, dy = 0, dx = 0, eyes = 0, teeth = 0, tongue = 0, dead = 0, collapse = 0, dim = 0}) {
  const F = Array.from({length: 16}, () => Array(16).fill('.'));
  const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < 16 && y < 16 && ch !== '.') F[y][x] = ch; };
  const upper = art.rows.map((r, y) => [...r].map(ch => y < art.split ? ch : '.'));
  if (eyes || dead) for (const [x, y] of art.eyes) { upper[y][x] = dead ? '6' : '3'; if (!dead && y > 0) upper[y - 1][x] = '7'; }
  // upper jaw first (a collapsing pile sinks behind the lower jaw), then lower jaw on top
  upper.forEach((r, y) => r.forEach((ch, x) => put(x + dx, y + 2 - g + dy + collapse, ch)));
  art.rows.forEach((r, y) => { if (y >= art.split) [...r].forEach((ch, x) => put(x + dx, y + 2 + dy, ch)); });
  if (g) {
    const xs = [...art.rows[art.split]].map((ch, x) => ch !== '.' ? x : -1).filter(x => x >= 0);
    const top = art.split + 2 - g + dy, bottom = art.split + 1 + dy;
    for (let y = top; y <= bottom; y++) for (const x of xs) put(x + dx, y, '1');
    if (teeth) for (const x of xs) {
      if (x % 2 === 0) put(x + dx, top, '2');
      if (g >= 3 && x % 2 === 1) put(x + dx, bottom, '2');
    }
    // cardboard tongue: lies in the maw and hangs over the lower jaw, longer per attack frame
    if (tongue) {
      for (let x = 8; x <= 12; x++) put(x + dx, bottom, '4');
      for (let t = 1; t <= tongue; t++) { put(10 + dx, bottom + t, '4'); put(11 + dx, bottom + t, t === tongue ? '5' : '4'); put(12 + dx, bottom + t, t < tongue ? '5' : '.'); }
    }
  }
  let grid = KIEZ_ITEMS.render(F.map(r => r.join('')), {...art.pal, ...MAW});
  if (dim) grid = grid.map(r => r.map(c => c && c.length ? [Math.round(c[0] * dim), Math.round(c[1] * dim), Math.round(c[2] * dim), c[3] === undefined ? 255 : c[3]] : c));
  return grid;
}
const RESHAPED = new Set(['mimic']);
PAINT.mimic = A => {
  A.out.px.fill(0);
  A.mimicCheck = [];
  for (const [name, off] of MIMIC_VARIANTS) {
    const art = KIEZ_ITEMS.CONTAINER_ART[name];
    MIMIC_FRAMES.forEach((spec, k) => {
      const grid = mimicFrame(art, spec), f = off + k;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const c = grid[y][x]; if (!c) continue;
        const i = A.i(f, x, y); A.out.px[i] = c[0]; A.out.px[i + 1] = c[1]; A.out.px[i + 2] = c[2]; A.out.px[i + 3] = c.length > 3 ? c[3] : 255;
      }
    });
    // hiding frames 0 and 1 against the item icon, shifted down by 2 px
    const icon = KIEZ_ITEMS.drawnGrid(name);
    for (const k of [0, 1]) {
      let diff = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const c = y >= 2 ? icon[y - 2][x] : null, want = c ? [c[0], c[1], c[2], c.length > 3 ? c[3] : 255] : [0, 0, 0, 0];
        const i = A.i(off + k, x, y), got = [A.out.px[i], A.out.px[i + 1], A.out.px[i + 2], A.out.px[i + 3]];
        if (want[3] !== got[3] || (want[3] && want.some((v, j) => v !== got[j]))) diff++;
      }
      A.mimicCheck.push(`${name} frame ${off + k}: ${diff} px diff`);
      if (diff) throw new Error(`mimic: hiding frame ${off + k} differs from ${name} icon in ${diff} px`);
    }
  }
  console.log('mimic hiding frames vs. item icons (shift 2 px): ' + A.mimicCheck.join(', '));
};

// ================================================================ run
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(PAINT); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const results = [];
for (const name of only) {
  if (!PAINT[name]) throw new Error('unknown atlas ' + name);
  const A = loadAtlas(name);
  PAINT[name](A);
  // contract check: identical size and alpha everywhere
  if (A.out.w !== A.src.w || A.out.h !== A.src.h) throw new Error(name + ': size changed');
  let changed = 0;
  for (let i = 0; i < A.src.px.length; i += 4) {
    if (!RESHAPED.has(name) && A.src.px[i + 3] !== A.out.px[i + 3]) throw new Error(name + ': alpha changed at pixel ' + (i / 4));
    if (A.src.px[i] !== A.out.px[i] || A.src.px[i + 1] !== A.out.px[i + 1] || A.src.px[i + 2] !== A.out.px[i + 2]) changed++;
  }
  const png = encodePNG(A.out);
  const check = decodePNG(png); // round trip
  if (Buffer.compare(check.px, A.out.px) !== 0) throw new Error(name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(SPRITES, name + '.png'), png);
  console.log(name + '.png  ' + A.src.w + 'x' + A.src.h + '  frame ' + A.fw + 'x' + A.fh + '  ' + changed + ' px changed, ' + (RESHAPED.has(name) ? 'redrawn (alpha contract waived)' : 'alpha identical'));
  results.push(A);
}

// ---------------------------------------------------------------- previews (x6, original above result)
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const S = 6;
  const bgAt = (x, y) => (((x >> 3) + (y >> 3)) & 1) ? [62, 60, 56] : [74, 72, 67];
  const blit = (dst, img, sx, sy, w, h, dx, dy) => {
    for (let y = 0; y < h * S; y++) for (let x = 0; x < w * S; x++) {
      const X = dx + x, Y = dy + y; if (X >= dst.w || Y >= dst.h) continue;
      const i = ((sy + (y / S | 0)) * img.w + sx + (x / S | 0)) * 4, a = img.px[i + 3] / 255, q = (Y * dst.w + X) * 4, bg = bgAt(X, Y);
      for (let k = 0; k < 3; k++) dst.px[q + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      dst.px[q + 3] = 255;
    }
  };
  const canvas = (w, h) => { const c = {w, h, px: Buffer.alloc(w * h * 4)}; for (let i = 0; i < w * h; i++) c.px.writeUInt32BE(0x202028ff, i * 4); return c; };
  const used = A => { let mx = 0, my = 0; for (let y = 0; y < A.src.h; y++) for (let x = 0; x < A.src.w; x++) if (A.src.px[(y * A.src.w + x) * 4 + 3]) { mx = Math.max(mx, x); my = Math.max(my, y); } return [Math.ceil((mx + 1) / A.fw) * A.fw, Math.ceil((my + 1) / A.fh) * A.fh]; };
  for (const A of results) {
    const [W, H] = used(A), rows = H / A.fh, gap = 4;
    const c = canvas(W * S + (W / A.fw - 1) * gap, rows * 2 * (A.fh * S + gap) + rows * 8);
    for (let r = 0; r < rows; r++) for (let k = 0; k < W / A.fw; k++) {
      const dx = k * (A.fw * S + gap), dy = r * (2 * (A.fh * S + gap) + 8);
      blit(c, A.src, k * A.fw, r * A.fh, A.fw, A.fh, dx, dy);
      blit(c, A.out, k * A.fw, r * A.fh, A.fw, A.fh, dx, dy + A.fh * S + gap);
    }
    fs.writeFileSync(path.join(previewDir, A.name + '-x6.png'), encodePNG(c));
  }
  // collection sheet: per mob one row, original idle frame, then new idle / attack / run frames
  const SHEET = [['rat', 0, 3, 7], ['rat', 16, 19, 23], ['rat', 32, 35, 39], ['snake', 0, 9, 5], ['gnoll', 0, 2, 5],
    ['gnoll', 21, 23, 26], ['gnoll', 42, 44, 47], ['crab', 0, 8, 4], ['crab', 16, 24, 20], ['crab', 32, 40, 36],
    ['swarm', 0, 7, 3], ['slime', 0, 4, 3], ['slime', 9, 13, 12], ['goo', 0, 5, 8],
    ['mimic', 1, 4, 7], ['mimic', 17, 20, 23], ['mimic', 33, 36, 39], ['mimic', 49, 52, 55]].filter(r => results.some(A => A.name === r[0]));
  if (SHEET.length) {
    const cell = 20 * S + 8, sheet = canvas(4 * cell + 16, SHEET.length * (16 * S + 8));
    SHEET.forEach(([name, ...fr], r) => {
      const A = results.find(a => a.name === name);
      [[A.src, fr[0]], [A.out, fr[0]], [A.out, fr[1]], [A.out, fr[2]]].forEach(([img, f], k) =>
        blit(sheet, img, (f % A.per) * A.fw, Math.floor(f / A.per) * A.fh, A.fw, A.fh, k * cell + (k ? 16 : 0), r * (16 * S + 8)));
    });
    fs.writeFileSync(path.join(previewDir, 'kiez-mobs-sammelvorschau-x6.png'), encodePNG(sheet));
  }
  // Sperrmüll comparison: per variant the item icon (placed like an item heap, 2 px lower)
  // next to all 13 mimic frames; a green bar under a hiding frame = 0 px difference to the icon
  const M = results.find(a => a.name === 'mimic');
  if (M) {
    const gap = 6, cw = 16 * S + gap, c = canvas(14 * cw + gap * 3, 4 * (16 * S + 14));
    const iconImg = {w: 16 * 4, h: 16, px: Buffer.alloc(16 * 4 * 16 * 4)};
    MIMIC_VARIANTS.forEach(([name], v) => {
      const g = KIEZ_ITEMS.drawnGrid(name);
      for (let y = 0; y + 2 < 16; y++) for (let x = 0; x < 16; x++) { const q = g[y][x]; if (q) iconImg.px.set([q[0], q[1], q[2], q.length > 3 ? q[3] : 255], ((y + 2) * iconImg.w + v * 16 + x) * 4); }
    });
    MIMIC_VARIANTS.forEach(([name, off], v) => {
      const dy = v * (16 * S + 14);
      blit(c, iconImg, v * 16, 0, 16, 16, 0, dy);
      for (let k = 0; k < 13; k++) {
        const f = off + k, dx = cw + gap * 2 + k * cw;
        blit(c, M.out, (f % M.per) * 16, Math.floor(f / M.per) * 16, 16, 16, dx, dy);
        if (k < 2) for (let y = dy + 16 * S + 2; y < dy + 16 * S + 8; y++) for (let x = dx; x < dx + 16 * S; x++) c.px.set([70, 200, 90, 255], (y * c.w + x) * 4);
      }
    });
    fs.writeFileSync(path.join(previewDir, 'kiez-sperrmuell-icon-vs-mimic-x6.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}
