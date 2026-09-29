// Amt-Gegner und Amt-Sondertiles (Ebene 6-10, "Das Amt ohne Termin"): rebuilds the enemy
// atlases and the two custom tile sheets of the prison region from the unmodified upstream
// Shattered Pixel Dungeon v4.0.0 PNGs stored in git. Pure Node (zlib only), no npm packages.
//
//   node tools/generate-kiez-amt.cjs                        write all sheets
//   node tools/generate-kiez-amt.cjs --only guard,thief     write only these sheets
//   node tools/generate-kiez-amt.cjs --preview DIR          also write before/after previews
//
// Contract (checked, the script aborts otherwise): every sheet keeps its size, frame grid,
// frame order and the alpha value of every single pixel. Only RGB changes: palette and
// brightness remaps plus small hand-placed details inside the existing silhouette. Details
// are anchored per frame (eyes, hand, hood top), so they follow every animation frame and
// the XxxSprite.java / CustomTilemap classes keep working without any code change.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'core/src/main/assets');
const TILES_PRISON_BLOB = '92356756990e6c0bf187d6fc4c272016e9de2dd3'; // upstream tiles_prison.png

// git blobs of the unmodified upstream v4.0.0 sheets (always the source, never the output)
const SHEETS = {
  skeleton:     {blob: 'a7a183f3b8d599e830ac577d74a2a21e538f5c98', out: 'sprites/skeleton.png'},
  thief:        {blob: '2f1a0eabcbc108701fc6cd9df8114c9893438616', out: 'sprites/thief.png'},
  dm100:        {blob: 'c5f08c8a1e186e98a1cef235ea951da26ffa46ab', out: 'sprites/dm100.png'},
  guard:        {blob: '6ccabf25005541019a7c22a0fb8d9fd1b7412e96', out: 'sprites/guard.png'},
  necromancer:  {blob: 'f17b14abf23292d49527fabf2112aba29b0ebce5', out: 'sprites/necromancer.png'},
  prison_quest: {blob: '5b16a10a0d96ae1681a86a423bd83e2e38e9e172', out: 'environment/custom_tiles/prison_quest.png'},
  prison_exit:  {blob: '8f445ccc8a97c6176f48f62a7ef5103fa1cd08e1', out: 'environment/custom_tiles/prison_exit.png'},
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

// ---------------------------------------------------------------- colour helpers
const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const hex = c => c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]) => (r * 299 + g * 587 + b * 114) / 1000;
const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// luminance ramp: maps source brightness to new colours so the original shading survives
function ramp(stops) {
  const s = stops.map(([l, c]) => [l, rgb(c)]);
  return c => {
    const L = lum(rgb(c));
    if (L <= s[0][0]) return hex(s[0][1]);
    for (let i = 1; i < s.length; i++) if (L <= s[i][0]) {
      const t = (L - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return hex(s[i][1].map((v, k) => s[i - 1][1][k] + (v - s[i - 1][1][k]) * t));
    }
    return hex(s[s.length - 1][1]);
  };
}
// deterministic position hash 0..99
const hash = (x, y, s = 0) => { let v = Math.imul(x + 11 + s, 374761393) ^ Math.imul(y + 7, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };

// ---------------------------------------------------------------- sheet + frame views
function loadSheet(name) {
  const def = SHEETS[name];
  let buf;
  try { buf = execFileSync('git', ['cat-file', 'blob', def.blob], {cwd: ROOT, maxBuffer: 1 << 24}); }
  catch (e) { throw new Error(name + ': upstream blob ' + def.blob + ' not found in git; fetch full history'); }
  const src = decodePNG(buf);
  return {name, src, out: {w: src.w, h: src.h, px: Buffer.from(src.px)}};
}
// pixel access in sheet coordinates (RGB only: transparent pixels are never painted)
function pixels(S) {
  const P = {};
  P.i = (x, y) => (y * S.src.w + x) * 4;
  P.alpha = (x, y) => (x >= 0 && y >= 0 && x < S.src.w && y < S.src.h) ? S.src.px[P.i(x, y) + 3] : 0;
  P.get = (x, y) => { if (!P.alpha(x, y)) return null; const i = P.i(x, y); return hex([S.src.px[i], S.src.px[i + 1], S.src.px[i + 2]]); };
  P.set = (x, y, h) => { if (!P.alpha(x, y)) return false; const i = P.i(x, y), c = rgb(h); S.out.px[i] = c[0]; S.out.px[i + 1] = c[1]; S.out.px[i + 2] = c[2]; return true; };
  return P;
}
// frame view (TextureFilm): frame f sits at column f % per, row floor(f / per); rowH is the
// sheet row pitch (SkeletonSprite uses 15 px frames on a 16 px row pitch for its vault row)
function frames(S, fw, fh, rowH = fh) {
  const P = pixels(S), per = Math.floor(S.src.w / fw);
  const V = {fw, fh, per};
  const at = (f, x, y) => [(f % per) * fw + x, Math.floor(f / per) * rowH + y];
  const inside = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh;
  V.alpha = (f, x, y) => inside(x, y) ? P.alpha(...at(f, x, y)) : 0;
  V.get = (f, x, y) => inside(x, y) ? P.get(...at(f, x, y)) : null;
  V.set = (f, x, y, h) => inside(x, y) ? P.set(...at(f, x, y), h) : false;
  V.each = (fs_, fn) => { for (const f of fs_) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = V.get(f, x, y); if (c) fn(f, x, y, c); } };
  V.remap = (fs_, map) => V.each(fs_, (f, x, y, c) => { if (map[c]) V.set(f, x, y, map[c]); });
  V.find = (f, colours) => { const r = [], s = new Set([].concat(colours)); for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (s.has(V.get(f, x, y))) r.push([x, y]); return r; };
  V.top = f => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (V.alpha(f, x, y)) return y; return fh; };
  V.stamp = (f, ox, oy, rows, keys) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (!keys[ch]) throw new Error(S.name + ': no colour for ' + ch);
    V.set(f, ox + x, oy + y, keys[ch]);
  }));
  return V;
}

// shared Amt colours (same values as tools/generate-amt-tiles.cjs where they overlap)
const C = {
  paper: 'f2eee0', paperShade: 'cfcabb', ink: '1f1f22',
  red: 'd23a2c', redDark: '7a1f1c', redLed: 'ff4a3a', redLedDim: 'b8261c',
  tapeY: 'c9a93a', tapeD: '2a2620', stamp: '4a48a8', stampDark: '2c2a6a',
};

// ================================================================ the sprites
const PAINT = {};

// ---------------------------------------------------------------- skeleton: ewig Wartender
// Still a skeleton (the description says so), but the bones have yellowed like old files
// under neon light, and a small Wartemarke (white ticket, red number) is stuck to the ribs.
// Anchor: the two black eye pixels; the ticket sits four rows below, between the eyes.
// Vault row (frames 21+, 16 px tall, brown beard) gets the same treatment.
PAINT.skeleton = S => {
  const BONE = {e5e5e5: 'ebe4cb', cecece: 'd3c9a8', cccccc: 'd0c6a4', b3b3b3: 'b2a785', a3a3a3: '9d9272', '7e7e7e': '756b50'};
  // idle frames 1-3 only turn the head, the body stays: they reuse the anchor of frame 0
  const ticket = (V, f, anchorFrame = f) => {
    const eyes = V.find(anchorFrame, '000000');
    if (eyes.length !== 2 || eyes[0][1] !== eyes[1][1]) return; // death frames: no ticket
    const [[x1, y]] = eyes;
    // 3x2 ticket: white paper with a red number stroke down the middle
    V.stamp(f, x1, y + 4, ['wrw', 'wrw'], {w: 'ffffff', r: C.red});
  };
  const normal = frames(S, 12, 15, 15), vault = frames(S, 12, 16, 16);
  normal.remap(range(0, 16), BONE); vault.remap(range(21, 37), BONE);
  for (const f of range(0, 16)) ticket(normal, f, f <= 3 ? 0 : f);
  for (const f of range(21, 37)) ticket(vault, f, f <= 24 ? 21 : f);
};

// ---------------------------------------------------------------- thief: Nummernklauer
// The green hooded cloak becomes a washed-out petrol hoodie; the knife in the hand becomes
// a stolen Wartenummer (white slip with a red number). Bandit = Nummernhehler wears a dark
// anthracite Maßanzug (no tracksuit: the writers' room removed that cliché on purpose):
// fine light pinstripes on the torso, a lilac Einstecktuch as the one hint of colour.
PAINT.thief = S => {
  const V = frames(S, 12, 13);
  const THIEF = range(0, 12), BANDIT = range(21, 33);
  const petrol = ramp([[15, '07161a'], [30, '0d262d'], [45, '163a44'], [65, '215462'], [92, '2f7280'], [115, '4a959e']]);
  const anthracite = ramp([[10, '0e0f12'], [25, '1a1c21'], [42, '272a31'], [62, '363a43'], [85, '474c57'], [110, '5c626e']]);
  const isGreen = c => { const [r, g, b] = rgb(c); return g > r + 12 && g > b + 8; };
  const isPurple = c => { const [r, g, b] = rgb(c); return r > g + 12 && b > g + 8; };
  V.each(THIEF, (f, x, y, c) => { if (isGreen(c)) V.set(f, x, y, petrol(c)); });
  V.each(BANDIT, (f, x, y, c) => { if (isPurple(c)) V.set(f, x, y, anthracite(c)); });
  // knife -> number slip: white pixels below the eyes (row >= 7), first one paper, rest red
  for (const f of [...THIEF, ...BANDIT]) for (let y = 7; y < 13; y++) {
    let n = 0;
    for (let x = 0; x < 12; x++) if (V.get(f, x, y) === 'ffffff') V.set(f, x, y, n++ % 2 ? C.red : C.paper);
  }
  // suit details on the standing frames (not on the collapsing death frames 26-30)
  for (const f of BANDIT.filter(f => f < 26 || f > 30)) {
    const top = V.top(f);
    // pinstripes: every second column of the torso, only on the mid-tone suit pixels
    for (let y = top + 7; y <= top + 12 && y < 13; y++) for (let x = 0; x < 12; x++) {
      const c = V.get(f, x, y);
      if (c && isPurple(c) && x % 2 === 1 && lum(rgb(c)) > 30) V.set(f, x, y, '6a707c');
    }
    // Einstecktuch: breast pocket, second body column from the left, first torso row
    const y = top + 8;
    let first = -1; for (let x = 0; x < 12; x++) if (V.alpha(f, x, y)) { first = x; break; }
    if (first >= 0 && isPurple(V.get(f, first + 1, y) || '000000')) V.set(f, first + 1, y, 'b86cc0');
  }
};

// ---------------------------------------------------------------- dm100: DM-100 Aufrufautomat
// A Wartenummern-Aufrufanzeige on stilts: the head housing is cream-coloured sheet metal,
// the yellow eye is now a red LED number display in a black bezel, and a white ticket
// peeks out of the slot at the bottom. Legs stay grey steel. Death frames dim the LEDs.
// Vault variant (frames 16+) keeps its cyan display as the distinguishing mark.
PAINT.dm100 = S => {
  const V = frames(S, 16, 14);
  const HOUSING = {b8b8b3: 'e6dfc6', '7d7d80': 'b8ad8c', '3b3b41': '6e6450', '25252d': '141416'};
  const LED = {ffff66: C.redLed, bfbf4d: 'd83a2c', '8f8f39': 'a22c22', '6b6b2b': '7a2218', '525221': '5c1a14', '3d3d18': '44140f'};
  const all = [...range(0, 15), ...range(16, 31)];
  V.remap(all, HOUSING);
  V.remap(range(0, 15), LED);
  for (const f of all) {
    // display: the two LED rows get a lit top row and a slightly darker lower row
    const led = V.find(f, f < 16 ? 'ffff66' : '00ffc9');
    if (led.length === 4) {
      const y0 = Math.min(...led.map(p => p[1]));
      if (f < 16) for (const [x, y] of led) V.set(f, x, y, y === y0 ? 'ff7a5c' : C.redLed);
    }
    // ticket slot: the dark housing bottom row ('3b3b41' in the source), middle two pixels
    const bottom = V.find(f, '3b3b41').filter(([x, y]) => V.get(f, x, y - 1) && V.get(f, x, y - 1) !== '3b3b41');
    const rowY = bottom.length ? Math.max(...bottom.map(p => p[1])) : -1;
    const slot = bottom.filter(p => p[1] === rowY).map(p => p[0]).sort((a, b) => a - b);
    if (slot.length >= 4) { const m = slot[(slot.length >> 1) - 1]; V.set(f, m - 1, rowY, '141416'); V.set(f, m, rowY, 'ffffff'); V.set(f, m + 1, rowY, 'd8d2c0'); V.set(f, m + 2, rowY, '141416'); }
  }
};

// ---------------------------------------------------------------- guard: Amtssecurity
// The knight becomes a security guard: navy peaked cap (visor dark), face kept, a dark
// collar, navy uniform jacket with a small yellow badge, dark trousers. The pale-yellow
// chain at the hip stays exactly as it is, because the chain pull is his mechanic.
PAINT.guard = S => {
  const V = frames(S, 12, 16);
  const CHAIN = new Set(['babb69', 'd8daa6', 'e3eeae', '82793a']);
  const FACE = new Set(['b1987f', '000000', 'd5b69f', 'b1b1b1', '3f3f3f', 'cbcbcb']);
  const cap = ramp([[20, '0c1020'], [45, '161d36'], [80, '24305a'], [120, '34457a'], [160, '4a5f9a']]);
  const suit = ramp([[20, '0b0e18'], [40, '141a2c'], [70, '1f2842'], [110, '2e3a5c'], [150, '41507a'], [175, '56678f']]);
  const legs = ramp([[20, '0c0d10'], [60, '1c1e26'], [110, '2c2f3a'], [160, '3e4250']]);
  for (let f = 0; f <= 14; f++) {
    const top = V.top(f);
    const eyes = V.find(f, ['000000', '3f3f3f']).filter(([x, y]) => y > top + 2 && y < top + 7);
    const eyeY = eyes.length ? Math.min(...eyes.map(p => p[1])) : top + 4;
    V.each([f], (ff, x, y, c) => {
      if (CHAIN.has(c)) return;
      if (y < eyeY - 1) V.set(f, x, y, cap(c));                       // cap crown
      else if (y === eyeY - 1) V.set(f, x, y, lum(rgb(c)) > 60 ? '2a2f3c' : '10131c'); // visor
      else if (y <= eyeY + 2) { if (!FACE.has(c)) V.set(f, x, y, suit(c)); }  // head sides: collar
      else if (y <= eyeY + 7) V.set(f, x, y, suit(c));                  // jacket
      else V.set(f, x, y, legs(c));
    });
    // mouth and chin: the helmet chin guard becomes skin with a flat mouth line
    const face = V.find(f, ['b1987f', 'd5b69f']).filter(([x, y]) => y === eyeY || y === eyeY + 1);
    if (face.length >= 3) {
      const xs = face.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      for (let x = x0; x <= x1; x++) {
        if (V.alpha(f, x, eyeY + 2)) V.set(f, x, eyeY + 2, x === x0 + 2 || x === x0 + 3 ? '8a6a58' : 'b1987f');
      }
      // peaked cap badge above the face
      V.set(f, x0 + 2, eyeY - 2, 'e0c050');
      // yellow badge on the chest, left side of the jacket
      if (V.alpha(f, x0, eyeY + 5)) V.set(f, x0, eyeY + 5, 'e0c050');
    }
  }
};

// ---------------------------------------------------------------- necromancer: Wiedervorlagebeamter
// The hooded necromancer becomes a grey-haired official in a brown cardigan: the hood is
// grey hair around a shadowed face, the grey eye pixels become glasses that catch the light,
// and he holds a red Wiedervorlage folder with a white label against his chest (anchored to
// the robe clasp pixel). Spectral row (Geister-Sachbearbeiter): translucent, cold blue-grey.
PAINT.necromancer = S => {
  const V = frames(S, 16, 16);
  const MAIN = range(0, 12), SPECTRAL = range(16, 28);
  const HAIR = {'353535': '6e6a64', '686868': 'a8a39a', '515151': '8a857c', '202020': '3e3b37', '171717': '2c2a27'};
  const BODY = {'353535': '5a4432', '686868': '9a7a52', '515151': '7a5c3a', '202020': '38281c', '171717': '24190f', '000000': '1a120c', '474747': 'c8a04a'};
  for (const f of MAIN) {
    const top = V.top(f);
    const eyes = V.find(f, '777777');
    const headEnd = top + 7; // hood and face occupy the first 7-8 rows in every frame
    V.each([f], (ff, x, y, c) => {
      if (c === '777777') { V.set(f, x, y, 'cfe4ea'); return; }        // glasses glint
      if (c === 'ffffff') return;                                       // zap sparks
      if (y < headEnd) { if (HAIR[c]) V.set(f, x, y, HAIR[c]); else if (c === '000000') V.set(f, x, y, '1a1614'); }
      else if (BODY[c]) V.set(f, x, y, BODY[c]);
    });
    // glasses frame: a dark bridge pixel between the two lenses
    if (eyes.length === 2 && eyes[1][0] - eyes[0][0] === 2) V.set(f, eyes[0][0] + 1, eyes[0][1], '4a4a4a');
    // red folder held on the chest, left of the clasp
    const clasp = V.find(f, '474747');
    if (clasp.length) {
      const [cx, cy] = clasp[0];
      for (let y = cy + 1; y <= cy + 4; y++) for (let x = cx - 3; x <= cx - 1; x++) {
        const c = V.get(f, x, y);
        if (c !== '515151') continue;
        const label = y === cy + 2 && x === cx - 2;
        V.set(f, x, y, label ? C.paper : (x === cx - 3 ? C.redDark : C.red));
      }
    }
  }
  // spectral: black at half alpha -> cold blue-grey; the opaque black face stays dark blue
  V.each(SPECTRAL, (f, x, y, c) => {
    if (c !== '000000') return;
    V.set(f, x, y, V.alpha(f, x, y) < 255 ? '2c4a5c' : '0e1a24');
  });
};

// tengu.png (boss Ebene 10) is no longer painted here: the SUV is drawn from scratch by
// tools/generate-kiez-suv.cjs.

// ================================================================ the custom tiles
// Amt wall face and linoleum floor, copied from the converted tiles_prison.png (floor tile
// 0 and wall face tile 80 as written by tools/generate-amt-tiles.cjs), so the quest rooms
// and the boss exit sit seamlessly in the region.
const WALL_FACE = { // rows 4..15 of a 16 px wall tile (rows 0..3 are the beige cap, kept)
  4: () => '3f4a3d', 5: () => '869f82',
  6: x => x % 16 === 1 ? '6f876c' : '7b9477', 7: () => '7b9477', 8: x => x % 16 === 13 ? '6f876c' : '7b9477', 9: () => '7b9477',
  10: () => '4f6a4c',
  11: x => ['b9b49c', 'a7a28b', 'a7a28b', '847f6b'][x % 4], 12: x => x % 4 === 3 ? '847f6b' : 'a7a28b',
  13: x => x % 4 === 3 ? '847f6b' : 'a7a28b', 14: () => '847f6b', 15: x => ['b9b49c', '948f79', '948f79', '847f6b'][x % 4],
};
const LINO = [
  '5f61575f61575f61575f61575f61575f61575f615742443c5f61575f61575f61575f61575f61575f61575f615742443c',
  '5f6157505248505248505248505248505248505248' + '42443c5f615757594f57594f57594f57594f57594f64665b42443c',
  '5f6157505248505248505248505248505248505248' + '42443c5f615757594f57594f57594f57594f57594f64665b42443c',
  '5f6157484a4164665b505248505248505248505248' + '42443c5f615757594f57594f57594f57594f484a4157594f42443c',
  '5f6157505248505248505248505248505248505248' + '42443c5f615757594f57594f57594f57594f57594f57594f42443c',
  '5f6157505248505248484a4164665b505248505248' + '42443c5f615757594f57594f57594f57594f57594f57594f42443c',
  '5f615750524850524850524864665b505248505248' + '42443c5f615757594f57594f57594f57594f57594f57594f42443c',
  '42443c'.repeat(16),
  '5f6157'.repeat(7) + '42443c' + '5f6157'.repeat(7) + '42443c',
  '5f615757594f57594f57594f57594f57594f57594f' + '42443c5f6157505248505248505248505248505248505248' + '42443c',
  '5f615757594f57594f57594f57594f57594f57594f' + '42443c5f6157505248505248505248505248484a41505248' + '42443c',
  '5f615757594f57594f57594f57594f57594f484a41' + '42443c5f6157505248505248505248505248505248505248' + '42443c',
  '5f615757594f484a4157594f57594f57594f57594f' + '42443c5f6157505248505248505248505248505248505248' + '42443c',
  '5f615757594f57594f57594f57594f57594f57594f' + '42443c5f6157505248505248505248505248505248505248' + '42443c',
  '5f615757594f57594f57594f57594f57594f57594f' + '42443c5f6157505248505248505248505248505248505248' + '42443c',
  '42443c'.repeat(16),
].map(r => r.match(/.{6}/g));
if (LINO.some(r => r.length !== 16)) throw new Error('LINO template row length');
const LINO_LUM = (() => { let s = 0; for (const r of LINO) for (const c of r) s += lum(rgb(c)); return s / 256; })();
const scale = (h, f) => hex(rgb(h).map(v => v * f));

// papers, folders and a few bones for the Aktenberg; each source bone dash becomes one object
const FILES = [
  [58, ['eeeadb', 'c9c5b4', '8e8b7e']],  // loose paper
  [76, ['dccb90', 'bba86c', '7c6c42']],  // manila folder
  [90, ['e2dac0', 'b8ae90', '857c64']],  // bone (it is still a mass grave)
  [96, ['c8705e', 'a45244', '62302a']],  // red Wiedervorlage folder
  [100, ['9aaac4', '74849e', '44506a']], // blue file
];
const isBone = c => { const k = rgb(c); return sat(k) < 16 && lum(k) >= 95; };
const isBeige = c => { const k = rgb(c); return sat(k) > 25 && lum(k) > 95 && k[0] > k[2]; };
function paintFiles(P, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    let x = x0;
    while (x < x0 + w) {
      if (!P.get(x, y) || !isBone(P.get(x, y))) { x++; continue; }
      let e = x; while (e < x0 + w && P.get(e, y) && isBone(P.get(e, y))) e++;
      // objects on consecutive rows share the kind of the pixel above, so stacks read as one
      const above = P.kind && P.kind.get((y - 1) * 4096 + x);
      const hv = hash(x, y, 3);
      const kind = above !== undefined && hv < 55 ? above : FILES.findIndex(([p]) => hv < p);
      for (let k = x; k < e; k++) {
        const L = lum(rgb(P.get(k, y)));
        P.set(k, y, FILES[kind][1][L >= 160 ? 0 : (L >= 125 ? 1 : 2)]);
        (P.kind = P.kind || new Map()).set(y * 4096 + k, kind);
      }
      x = e;
    }
  }
}
// linoleum floor, darkened like the source: brightness factor per 8x8 block (the linoleum
// squares) from the average of its non-bone source pixels
function paintLino(P, x0, y0, w, h, isFloor) {
  for (let by = y0; by < y0 + h; by += 8) for (let bx = x0; bx < x0 + w; bx += 8) {
    let s = 0, n = 0;
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) { const c = P.get(x, y); if (c && isFloor(x, y, c)) { s += lum(rgb(c)); n++; } }
    if (!n) continue;
    const f = Math.min(1.05, (s / n) / 80);
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) { const c = P.get(x, y); if (c && isFloor(x, y, c)) P.set(x, y, scale(LINO[y & 15][x & 15], f)); }
  }
}

// ---------------------------------------------------------------- prison_quest.png
// Table (RitualSiteRoom, tile 0 + 16): the wooden rack with bones becomes a grey steel
// Aktenregal board with beige laminate, red stamp ink instead of blood, papers instead of
// bones. Ritual marker (tiles 32..): red circle painted on Amt linoleum. Mass grave
// (MassGraveRoom, 9x9 tiles from tile 5): the barricaded archive, walls in Amt green paint
// with beige tiles, the bone heaps an Aktenberg of papers, folders and a few bones.
PAINT.prison_quest = S => {
  const P = pixels(S);
  // table, x 0-15, y 0-31
  const wood = ramp([[20, '2e2a22'], [40, '4e4a3e'], [60, '7a7462'], [80, '9a937e'], [100, 'b0a992']]);
  const floorRamp = ramp([[30, '2e2f2a'], [58, '42443c'], [72, '505248'], [80, '57594f'], [90, '5f6157']]);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    const c = P.get(x, y); if (!c) continue;
    const k = rgb(c), s = sat(k), L = lum(k);
    if (y >= 28 && s < 16) P.set(x, y, floorRamp(c));                   // floor under the table
    else if (k[0] > k[1] + 20 && k[0] < 0x70 && k[2] < k[1] + 20 && s >= 25 && k[1] < 0x45) P.set(x, y, L > 60 ? C.stamp : C.stampDark); // blood -> stamp ink
    else if (s >= 18) P.set(x, y, wood(c));                            // wood -> laminate
    else if (L > 120) P.set(x, y, L > 145 ? C.paper : C.paperShade);   // bones -> papers
  }
  // ritual marker: x 0-79, y 32-111; red stays red (Amt stamp red), floor becomes linoleum
  const isRed = c => { const [r, g, b] = rgb(c); return r > g + 30 && r > b + 20; };
  paintLino(P, 16, 48, 48, 48, (x, y, c) => !isRed(c) && c !== '000000');
  for (let y = 32; y < 112; y++) for (let x = 0; x < 80; x++) {
    const c = P.get(x, y); if (!c || !isRed(c)) continue;
    P.set(x, y, lum(rgb(c)) > 35 ? 'c0302a' : '5a1414');
  }
  // bone pile patch (legacy "Bones" room floor), x 48-63, y 16-31
  paintLino(P, 48, 16, 16, 16, (x, y, c) => !isBone(c) && c !== '000000');
  paintFiles(P, 48, 16, 16, 16);
  // mass grave, x 80-223, y 0-143. A wall is a run of >= 12 columns whose row 0 of a 16 px
  // tile row is beige cap; its face (rows 4-15) gets the Amt wall. Beige objects
  // (arched niche, the two statues) are found as clusters of <= 12 px and kept untouched.
  const GX = 80, GY = 0, GW = 144, GH = 144, wall = new Set(), keep = new Set();
  const strongBeige = c => { const k = rgb(c); return sat(k) > 30 && lum(k) > 90 && k[0] > k[2]; };
  const isCap = (x, y) => { const c = P.get(x, y); return c && strongBeige(c); };
  for (let r = 0; r < 3; r++) {
    let x = GX;
    while (x < GX + GW) {
      if (!isCap(x, r * 16)) { x++; continue; }
      // a cap row is beige with a darker mortar pixel every few columns: allow 1 px gaps
      let e = x; while (e < GX + GW && (isCap(e, r * 16) || (isCap(e - 1, r * 16) && isCap(e + 1, r * 16)))) e++;
      if (e - x >= 12) for (let k = x; k < e; k++) for (let y = r * 16 + 4; y < r * 16 + 16; y++) wall.add(y * 4096 + k);
      x = e;
    }
  }
  const seen = new Set();
  for (let y = GY; y < GY + GH; y++) for (let x = GX; x < GX + GW; x++) {
    const k0 = y * 4096 + x;
    if (seen.has(k0) || !P.get(x, y) || !strongBeige(P.get(x, y))) continue;
    if (y % 16 < 4 && isCap(x, y - (y % 16)) && wall.has((y - (y % 16) + 4) * 4096 + x)) continue; // wall cap
    const q = [[x, y]], pts = []; seen.add(k0);
    while (q.length) {
      const [a, b] = q.pop(); pts.push([a, b]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = a + dx, Y = b + dy, k = Y * 4096 + X;
        if (X < GX || Y < GY || X >= GX + GW || Y >= GY + GH || seen.has(k)) continue;
        const c = P.get(X, Y);
        if (c && strongBeige(c) && !(Y % 16 < 4 && wall.has((Y - (Y % 16) + 4) * 4096 + X))) { seen.add(k); q.push([X, Y]); }
      }
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (x1 - x0 < 12 && y1 - y0 < 16) for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) keep.add(yy * 4096 + xx);
  }
  // the arched niche in the back wall (upstream art, fixed position) stays as it is
  // (its beige frame and dark opening; grey brick pixels around the arch still get painted)
  for (let y = 4; y < 16; y++) for (let x = 147; x <= 156; x++) {
    const c = P.get(x, y), k = c && rgb(c);
    if (c && !(sat(k) < 16 && lum(k) >= 62)) keep.add(y * 4096 + x);
  }
  for (const k of wall) {
    const x = k % 4096, y = Math.floor(k / 4096), c = P.get(x, y);
    if (!c || keep.has(k) || isBone(c)) continue;
    P.set(x, y, WALL_FACE[y % 16](x));
  }
  const capPx = (x, y) => y % 16 < 4 && wall.has((y - (y % 16) + 4) * 4096 + x);
  paintLino(P, GX, GY, GW, GH, (x, y, c) => !wall.has(y * 4096 + x) && !keep.has(y * 4096 + x) && !capPx(x, y) && !isBone(c) && c !== '000000');
  paintFiles(P, GX, GY, GW, GH);
};

// ---------------------------------------------------------------- prison_exit.png
// After the boss the arena wall breaks open towards the Baustelle (floors 11-15): the torn
// floor bricks take the olive-grey of the Amt linoleum, raw rock and the dark tunnel stay,
// and every step lip of the metal stairs down gets a yellow-black hazard stripe.
PAINT.prison_exit = S => {
  const P = pixels(S);
  const olive = ramp([[20, '1c1d19'], [40, '2e2f2a'], [58, '42443c'], [72, '505248'], [80, '57594f'], [88, '5f6157'], [98, '64665b']]);
  for (let y = 0; y < S.src.h; y++) for (let x = 0; x < S.src.w; x++) {
    if (P.alpha(x, y) < 255) continue;                                 // shadows keep their black
    const c = P.get(x, y), k = rgb(c), L = lum(k);
    if (sat(k) < 30 && L >= 25 && L < 98 && k[1] - k[2] >= 4) P.set(x, y, olive(c)); // brick
  }
  // two side-wall tiles are pixel-identical to upstream tiles_prison.png tiles 91 and 116:
  // they take the converted Amt tile from the region tileset (checked, not assumed)
  const upstream = decodePNG(execFileSync('git', ['cat-file', 'blob', TILES_PRISON_BLOB], {cwd: ROOT, maxBuffer: 1 << 24}));
  const amt = decodePNG(fs.readFileSync(path.join(ASSETS, 'environment/tiles_prison.png')));
  for (const [tx, ty, t] of [[0, 1, 91], [0, 2, 116]]) {
    const sx = (t % 16) * 16, sy = (t >> 4) * 16;
    let same = true;
    for (let y = 0; y < 16 && same; y++) for (let x = 0; x < 16; x++) {
      const a = P.i(tx * 16 + x, ty * 16 + y), b = ((sy + y) * 256 + sx + x) * 4;
      if (S.src.px.readUInt32BE(a) !== upstream.px.readUInt32BE(b)) { same = false; break; }
    }
    if (!same) throw new Error('prison_exit: tile ' + tx + ',' + ty + ' no longer matches tiles_prison tile ' + t);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const b = ((sy + y) * 256 + sx + x) * 4;
      if (amt.px[b + 3] === S.src.px[P.i(tx * 16 + x, ty * 16 + y) + 3]) P.set(tx * 16 + x, ty * 16 + y, hex([amt.px[b], amt.px[b + 1], amt.px[b + 2]]));
    }
  }
  // stairs: two 16 px columns at x 176-207, steps every 8 px from y 69 to 125
  for (let y = 69; y <= 125; y += 8) for (let x = 176; x < 208; x++) {
    if (P.alpha(x, y) === 255) P.set(x, y, ((x + (y >> 3)) >> 1) & 1 ? C.tapeD : C.tapeY);
  }
};

// ================================================================ run
const argv = process.argv.slice(2);
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(PAINT); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const results = [];
for (const name of only) {
  if (!PAINT[name]) throw new Error('unknown sheet ' + name);
  const S = loadSheet(name);
  PAINT[name](S);
  if (S.out.w !== S.src.w || S.out.h !== S.src.h) throw new Error(name + ': size changed');
  let changed = 0;
  for (let i = 0; i < S.src.px.length; i += 4) {
    if (S.src.px[i + 3] !== S.out.px[i + 3]) throw new Error(name + ': alpha changed at pixel ' + (i / 4));
    if (S.src.px[i] !== S.out.px[i] || S.src.px[i + 1] !== S.out.px[i + 1] || S.src.px[i + 2] !== S.out.px[i + 2]) changed++;
  }
  const png = encodePNG(S.out);
  if (Buffer.compare(decodePNG(png).px, S.out.px) !== 0) throw new Error(name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(ASSETS, SHEETS[name].out), png);
  console.log(SHEETS[name].out + '  ' + S.src.w + 'x' + S.src.h + '  ' + changed + ' px changed, alpha identical');
  results.push(S);
}

// ---------------------------------------------------------------- previews
// per sheet: the used area, original on top, result below, each frame cell separated
const FRAMES = {skeleton: [12, 16], thief: [12, 13], dm100: [16, 14], guard: [12, 16], necromancer: [16, 16], prison_quest: [16, 16], prison_exit: [16, 16]};
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  for (const S of results) {
    const tiles = S.name.startsWith('prison_');
    const Z = tiles ? 3 : 6, [fw, fh] = FRAMES[S.name], gap = tiles ? 0 : 2;
    let mx = 0, my = 0;
    for (let y = 0; y < S.src.h; y++) for (let x = 0; x < S.src.w; x++) { const i = (y * S.src.w + x) * 4; if (S.src.px[i + 3] && (S.src.px[i] | S.src.px[i + 1] | S.src.px[i + 2] | (S.src.px[i + 3] ^ 255))) { mx = Math.max(mx, x); my = Math.max(my, y); } }
    const W = Math.ceil((mx + 1) / fw) * fw, H = Math.ceil((my + 1) / fh) * fh;
    const cols = W / fw, rows = H / fh, cw = fw * Z + gap, ch = fh * Z + gap;
    const side = tiles; // tiles: before | after side by side; sprites: before above after per row
    const cw2 = side ? cols * cw * 2 + 12 : cols * cw, ch2 = side ? rows * ch : rows * (2 * ch + 6);
    const c = {w: cw2, h: ch2, px: Buffer.alloc(cw2 * ch2 * 4)};
    for (let i = 0; i < cw2 * ch2; i++) c.px.writeUInt32BE(0x202028ff, i * 4);
    const blit = (img, fx, fy, dx, dy) => {
      for (let y = 0; y < fh * Z; y++) for (let x = 0; x < fw * Z; x++) {
        const sx = fx * fw + (x / Z | 0), sy = fy * fh + (y / Z | 0), i = (sy * img.w + sx) * 4, a = img.px[i + 3] / 255;
        const bg = (((sx >> 1) + (sy >> 1)) & 1) ? [58, 58, 64] : [74, 74, 80], q = ((dy + y) * cw2 + dx + x) * 4;
        for (let k = 0; k < 3; k++) c.px[q + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      }
    };
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      if (side) { blit(S.src, k, r, k * cw, r * ch); blit(S.out, k, r, cols * cw + 12 + k * cw, r * ch); }
      else { blit(S.src, k, r, k * cw, r * (2 * ch + 6)); blit(S.out, k, r, k * cw, r * (2 * ch + 6) + ch); }
    }
    fs.writeFileSync(path.join(previewDir, S.name + '-vorher-nachher.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}
