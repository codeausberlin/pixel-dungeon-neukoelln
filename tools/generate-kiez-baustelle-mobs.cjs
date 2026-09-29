// Baustelle (Ebene 11-15): rebuilds the enemy sprite atlases and the special tile sheets of
// the "ewige Baustelle" region from the unmodified upstream Shattered Pixel Dungeon v4.0.0
// PNGs stored in git (commit 4256b22). Pure Node (zlib only, codec from tools/lib).
//
//   node tools/generate-kiez-baustelle-mobs.cjs                  write all sheets
//   node tools/generate-kiez-baustelle-mobs.cjs --only bat,dm300 write only these sheets
//   node tools/generate-kiez-baustelle-mobs.cjs --preview DIR    also write x6 before/after previews
//
// Contract (checked, the script aborts otherwise): every sheet keeps its size and frame grid
// (TextureFilm sizes and frame indices of the XxxSprite.java classes stay valid). Alpha stays
// identical, except for the few sheets listed in RESHAPED, which may add or remove pixels,
// but only inside frame cells that are already used, so no frame ever grows into its neighbour.
// The source is always the git original, never the own output: two runs are byte-identical.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'core/src/main/assets');
const UPSTREAM = '4256b22';

// file, TextureFilm frame size from the matching XxxSprite.java (tiles: 16x16 cells)
const SHEET = {
  bat:              {file: 'sprites/bat.png', fw: 15, fh: 15},              // BatSprite 0-6
  brute:            {file: 'sprites/brute.png', fw: 12, fh: 16},            // Brute 0-10, Armored 21-31
  shaman:           {file: 'sprites/shaman.png', fw: 12, fh: 15},           // red 0, blue 21, purple 42, (grey 63)
  spinner:          {file: 'sprites/spinner.png', fw: 16, fh: 16},          // 0-9
  dm200:            {file: 'sprites/dm200.png', fw: 21, fh: 18},            // DM200 0-11 (row 1 unused), DM201 24-35
  dm300:            {file: 'sprites/dm300.png', fw: 25, fh: 22},            // normal 0-7, supercharged 10-15
  pylon:            {file: 'sprites/pylon.png', fw: 10, fh: 20},            // inactive 0, active 1, destroyed 2
  gnoll_guard:      {file: 'sprites/gnoll_guard.png', fw: 12, fh: 16},      // 0-10
  gnoll_sapper:     {file: 'sprites/gnoll_sapper.png', fw: 12, fh: 15},     // 0-10
  gnoll_geomancer:  {file: 'sprites/gnoll_geomancer.png', fw: 12, fh: 16},  // 0-10, statue 21-31
  fungal_core:      {file: 'sprites/fungal_core.png', fw: 27, fh: 27},      // 0
  fungal_sentry:    {file: 'sprites/fungal_sentry.png', fw: 18, fh: 18},    // 0
  fungal_spinner:   {file: 'sprites/fungal_spinner.png', fw: 16, fh: 16},   // 0-9
  crystal_guardian: {file: 'sprites/crystal_guardian.png', fw: 12, fh: 15}, // blue 0, green 21, red 42 (0-15 each)
  crystal_wisp:     {file: 'sprites/crystal_wisp.png', fw: 12, fh: 14},     // blue 0, green 13, red 26 (0-12 each)
  caves_boss:       {file: 'environment/custom_tiles/caves_boss.png', fw: 16, fh: 16},
  caves_quest:      {file: 'environment/custom_tiles/caves_quest.png', fw: 16, fh: 16},
  tiles_caves_gnoll: {file: 'environment/tiles_caves_gnoll.png', fw: 16, fh: 16},
};
// sheets that may change alpha (inside used frame cells only)
const RESHAPED = new Set(['bat', 'shaman', 'gnoll_sapper', 'gnoll_geomancer']);

// ---------------------------------------------------------------- helpers
const argv = process.argv.slice(2);
const rgb = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const hex = c => c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = ([r, g, b]) => (r * 299 + g * 587 + b * 114) / 1000;
const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const mixHex = (a, b, t) => hex(rgb(a).map((v, k) => v + (rgb(b)[k] - v) * t));
// luminance ramp: maps source brightness to new colours so the original shading survives
function ramp(stops) {
  const s = stops.map(([l, c]) => [l, rgb(c)]);
  const f = c => {
    const L = typeof c === 'number' ? c : lum(rgb(c));
    if (L <= s[0][0]) return hex(s[0][1]);
    for (let i = 1; i < s.length; i++) if (L <= s[i][0]) {
      const t = (L - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return hex(s[i][1].map((v, k) => s[i - 1][1][k] + (v - s[i - 1][1][k]) * t));
    }
    return hex(s[s.length - 1][1]);
  };
  return f;
}

function loadSheet(name) {
  const def = SHEET[name];
  const buf = execFileSync('git', ['show', UPSTREAM + ':core/src/main/assets/' + def.file], {cwd: ROOT, maxBuffer: 1 << 24});
  const src = decodePNG(buf), out = {w: src.w, h: src.h, px: Buffer.from(src.px)};
  const per = Math.floor(src.w / def.fw);
  const A = {name, def, src, out, fw: def.fw, fh: def.fh, per};
  A.i = (f, x, y) => (((Math.floor(f / per) * def.fh + y) * src.w) + (f % per) * def.fw + x) * 4;
  A.inside = (x, y) => x >= 0 && y >= 0 && x < def.fw && y < def.fh;
  A.alpha = (f, x, y) => A.inside(x, y) ? src.px[A.i(f, x, y) + 3] : 0;
  A.outAlpha = (f, x, y) => A.inside(x, y) ? out.px[A.i(f, x, y) + 3] : 0;
  A.get = (f, x, y) => { if (!A.alpha(f, x, y)) return null; const i = A.i(f, x, y); return hex([src.px[i], src.px[i + 1], src.px[i + 2]]); };
  A.cur = (f, x, y) => { if (!A.outAlpha(f, x, y)) return null; const i = A.i(f, x, y); return hex([out.px[i], out.px[i + 1], out.px[i + 2]]); };
  // RGB only on pixels that are opaque in the output
  A.set = (f, x, y, h) => {
    if (!h || !A.outAlpha(f, x, y)) return false;
    const i = A.i(f, x, y), c = rgb(h); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; return true;
  };
  // add a new opaque pixel (RESHAPED sheets only) or clear one
  A.add = (f, x, y, h) => {
    if (!RESHAPED.has(name)) throw new Error(name + ': not allowed to change alpha');
    if (!A.inside(x, y)) return false;
    const i = A.i(f, x, y), c = rgb(h); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; out.px[i + 3] = 255; return true;
  };
  A.clear = (f, x, y) => { if (!RESHAPED.has(name)) throw new Error(name + ': not allowed to change alpha'); if (A.inside(x, y)) out.px.fill(0, A.i(f, x, y), A.i(f, x, y) + 4); };
  A.each = (frames, fn) => { for (const f of frames) for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) { const c = A.get(f, x, y); if (c) fn(f, x, y, c); } };
  A.remap = (frames, map) => A.each(frames, (f, x, y, c) => { if (map[c]) A.set(f, x, y, map[c]); });
  A.find = (f, colours) => { const r = []; const s = new Set([].concat(colours)); for (let y = 0; y < def.fh; y++) for (let x = 0; x < def.fw; x++) if (s.has(A.get(f, x, y))) r.push([x, y]); return r; };
  // ascii overlay on existing pixels; with add=true it may also create pixels (RESHAPED only)
  A.stamp = (f, ox, oy, rows, keys, add = false) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    if (!keys[ch]) throw new Error(name + ': no colour for ' + ch);
    if (add) A.add(f, ox + x, oy + y, keys[ch]); else A.set(f, ox + x, oy + y, keys[ch]);
  }));
  A.bbox = f => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; A.each([f], (ff, x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return {x0, y0, x1, y1}; };
  A.used = f => A.bbox(f).x1 >= 0;
  return A;
}

// ================================================================ palettes
const P = {
  outline:  '1c1712',
  yellow:   ramp([[20, '1c1508'], [45, '3a2a0c'], [70, '5e4410'], [95, '8a6414'], [120, 'b5851a'], [150, 'd9a324'], [180, 'eebc38'], [205, 'f8d765'], [230, 'fdeaa0']]),
  orange:   ramp([[20, '1e0c04'], [45, '42190a'], [75, '7a2e0c'], [105, 'b24a12'], [135, 'e0661a'], [165, 'f5832a'], [195, 'fca552'], [225, 'ffc98a']]),
  white:    ramp([[20, '1a1a1c'], [50, '3e4044'], [90, '8a8d92'], [130, 'c3c6ca'], [170, 'e6e8ea'], [210, 'fafafa']]),
  steel:    ramp([[0, '101114'], [40, '2a2d33'], [80, '50555d'], [120, '7c828a'], [160, 'a9aeb4'], [210, 'd4d8dc']]),
  skin:     ramp([[0, '1e1210'], [40, '4a2c22'], [75, '8a5a44'], [110, 'c48c6c'], [150, 'e8b898'], [200, 'f6d6bc']]),
  hair:     ramp([[0, '120c0a'], [40, '241a16'], [90, '3a2c26'], [140, '5a4a42'], [200, '7a6a60']]),
  denim:    ramp([[0, '0c0e14'], [30, '181c28'], [70, '28304a'], [110, '3c4a6e'], [160, '56698e'], [210, '7c8eb0']]),
  navy:     ramp([[0, '0b0d12'], [40, '171b26'], [80, '252c3e'], [120, '384360'], [170, '4f5d80']]),
  olive:    ramp([[0, '10120a'], [60, '2e3418'], [110, '4e5a2a'], [160, '6f7c3a'], [215, '98a656']]),
  khaki:    ramp([[0, '17130c'], [40, '342a1a'], [80, '5e4e30'], [120, '8a764c'], [160, 'b09c70'], [210, 'd4c49c']]),
  concrete: ramp([[0, '141413'], [40, '33322f'], [80, '5a5853'], [120, '85827b'], [160, 'aeaaa2'], [210, 'd2cec6']]),
  reflect:  'd8dde0', reflectDark: '9aa2a8',
  red: 'c8322a', redDark: '7e1c16', paper: 'f1eee2',
  hazardY: 'e6b422', hazardK: '221e18',
};
const isGrey = c => sat(rgb(c)) <= 12;

// ================================================================ the painters
const PAINT = {};

// ---------------------------------------------------------------- bat: Schachtvampir
// Black shaft bat with dark red wings; wears a tiny yellow construction helmet with a white
// headlamp (anchored on the red eye pair, so it follows every living frame; the death frames
// have no eyes and therefore no helmet: it has fallen off). Wing membranes pick up concrete dust.
PAINT.bat = A => {
  A.remap(range(0, 6), {'330008': '3a0d12', '1a1a1a': '24211e'});
  for (const f of range(0, 3)) {
    const eyes = A.find(f, 'ff3333'); if (eyes.length < 2) continue;
    const ey = Math.min(...eyes.map(e => e[1])), exs = eyes.filter(e => e[1] === ey).map(e => e[0]);
    const cx = Math.round((Math.min(...exs) + Math.max(...exs)) / 2);
    // clear the ears inside the helmet area, then draw the dome (outline o, yellow y/Y, lamp w)
    A.stamp(f, cx - 3, ey - 4, [
      '..ooo..',
      '.oYyyo.',
      'oyywyyo',
      'oooooo.',
    ].map(r => r), {o: '2a2008', y: 'e6b422', Y: 'fbe07a', w: 'fffbe8'}, true);
  }
};

// ---------------------------------------------------------------- spinner: Flatterbandspinne
// Greenish hairy body as upstream (desc: "grünlich, behaart"); every leg becomes red/white
// barrier tape: the light leg edge is white, the shaded edge red.
function tapeLegs(A, frames, light, shade) {
  A.remap(frames, {[light]: 'f0ece4', [shade]: 'd23a2e'});
}
PAINT.spinner = A => {
  const F = range(0, 9);
  tapeLegs(A, F, '8ddb9c', '7eb48d');
  // body a bit greyer, as if dusted with concrete
  A.remap(F, {'518f52': '4f8052', '6aa66b': '6b9a68', '598b61': '587e5c', '427249': '41664a', '476f54': '46644f', '33563e': '324c3a'});
};

// ---------------------------------------------------------------- dm200 / dm300: construction machines
// Grey tank bodies become construction-machine yellow (DM-200) / signal orange (DM-201);
// the drill stays steel, tracks stay dark, the skirt band above the tracks becomes
// yellow/black hazard striping and the eye lamps sit on a dark visor strip.
function machine(A, frames, o) {
  const BODY = new Set(o.body), BAND = new Set(o.band), EYE = new Set(o.eyes);
  for (const f of frames) {
    if (!A.used(f)) continue;
    const eyes = [];
    A.each([f], (ff, x, y, c) => { if (EYE.has(c)) eyes.push([x, y]); });
    const eyeRows = new Set(eyes.map(e => e[1]));
    const eyeX0 = eyes.length ? Math.min(...eyes.map(e => e[0])) - 1 : 99, eyeX1 = eyes.length ? Math.max(...eyes.map(e => e[0])) + 1 : -1;
    A.each([f], (ff, x, y, c) => {
      if (y >= o.baseY) { if (o.tracks && o.tracks[c]) A.set(f, x, y, o.tracks[c]); return; }
      if (BAND.has(c)) { A.set(f, x, y, ((x + y) >> 1) & 1 ? P.hazardK : P.hazardY); return; }
      if (eyeRows.has(y) && x >= eyeX0 && x <= eyeX1 && !EYE.has(c)) { A.set(f, x, y, '2a2622'); return; }
      if (BODY.has(c)) A.set(f, x, y, o.paint(c));
      else if (o.drill && o.drill[c]) A.set(f, x, y, o.drill[c]);
    });
  }
}
const DM_BODY = ['c0c0b3', 'd5d5cc', '999993', 'b8b8b3', 'b6a280', 'cebfa3', '999493', '988169', '7d7d80', '887866', '625241', '57575a'];
const DM_BAND = ['aaaaa3', 'a59982', '82745c'];
// the drill: cooler, cleaner steel so it separates from the yellow body
const DM_DRILL = {'9a9799': 'b4b9be', '7d7a80': '8a9096', '757274': '7c8288', '5f5d66': '5c6168', '504e59': '4b4f56',
  '57545a': '555a60', '3b3a41': '2e3035', '887666': 'a0a6ac', '7b6754': '6c6258', '625041': '4a4038', '705f52': '5e544a',
  '4a3b30': '3a332c', '2f2e36': '24252a'};
PAINT.dm300 = A => {
  machine(A, [...range(0, 7), ...range(10, 15)], {
    body: DM_BODY, band: DM_BAND, eyes: ['ffff66', 'ff6666'], baseY: 16, drill: DM_DRILL,
    paint: c => c === '3b3b41' ? '2a2214' : P.yellow(lum(rgb(c)) + 8),
  });
};
PAINT.dm200 = A => {
  const yellowBody = c => P.yellow(lum(rgb(c)) + 8);
  machine(A, range(0, 23), {body: DM_BODY, band: DM_BAND, eyes: ['ffff66'], baseY: 13, drill: DM_DRILL, paint: yellowBody});
  machine(A, range(24, 35), {body: DM_BODY, band: DM_BAND, eyes: ['00ffc9'], baseY: 13, drill: DM_DRILL, paint: c => P.orange(lum(rgb(c)) - 4)});
};

// ---------------------------------------------------------------- pylon: Baustromverteiler
// The cap becomes the orange distributor housing with dark socket flaps, the stem a
// galvanised post with a small yellow warning sign (inactive frame; the active frame keeps its
// glowing yellow core), the base a concrete foot with a hazard stripe.
PAINT.pylon = A => {
  const cap = ramp([[150, 'b24a12'], [185, 'e0661a'], [215, 'f58a34']]);
  A.each([0, 1, 2], (f, x, y, c) => {
    if (y <= 4) A.set(f, x, y, cap(c));
    else if (y >= 12) A.set(f, x, y, P.concrete(lum(rgb(c)) + 6));
    else if (isGrey(c)) A.set(f, x, y, P.steel(lum(rgb(c)) + 10));
  });
  for (const f of [0, 1]) A.stamp(f, 2, 2, ['kkk..kkk'], {k: '3a1a0c'}); // socket flaps
  A.stamp(0, 3, 6, ['.y..', 'yky.', 'yyy.'], {y: P.hazardY, k: P.hazardK});
  for (const f of [0, 1, 2]) A.stamp(f, 2, 14, ['yk', 'ky'].map(r => r + r + r), {y: P.hazardY, k: P.hazardK}, false);
};

// ---------------------------------------------------------------- Bauwichte (gnoll family)
// Zones relative to the eye row of every frame, like the Besichtigungswicht on floors 1-5:
// helmet/hair above the eyes, skin face, work jacket on the torso (with a reflective stripe
// on hi-vis jackets), work trousers below. Colours listed in keep stay upstream.
function worker(A, frames, o) {
  for (const f of frames) {
    if (!A.used(f)) continue;
    const eyes = A.find(f, o.eye);
    const {y0} = A.bbox(f);
    const eyeY = eyes.length ? Math.min(...eyes.map(e => e[1])) : y0 + (o.eyeFallback || 4);
    A.each([f], (ff, x, y, c) => {
      if (o.keep && o.keep.has(c)) return;
      const L = lum(rgb(c));
      if (o.special) { const r = o.special(f, x, y, c, eyeY); if (r) { A.set(f, x, y, r); return; } }
      if (o.helmet && y <= eyeY + (o.helmetDepth || 0) && (o.helmetAll ? y < eyeY : isGrey(c))) { A.set(f, x, y, o.helmet(L)); return; }
      let zone;
      if (y < eyeY - (o.hairGap === undefined ? 1 : o.hairGap)) zone = 'hair';
      else if (y <= eyeY + o.face) zone = 'skin';
      else if (y <= eyeY + o.torso) zone = 'jacket';
      else zone = 'legs';
      if (zone === 'jacket' && o.stripe !== undefined && y === eyeY + o.stripe && L > 45) { A.set(f, x, y, L > 150 ? P.reflect : P.reflectDark); return; }
      A.set(f, x, y, o[zone](L));
    });
  }
}
PAINT.brute = A => {
  // Bautrupp-Grobian: yellow helmet (the upstream bucket helmet, still worn askew), orange
  // hi-vis jacket with a reflective stripe, blue work trousers
  worker(A, range(0, 10), {eye: '000000', helmet: L => P.yellow(L + 30), helmetDepth: 2, face: 3, torso: 8, stripe: 6,
    hair: P.hair, skin: P.skin, jacket: L => P.orange(L + 8), legs: P.denim});
  // gepanzert: the white Polier helmet, steel plates stay steel, the red cloth becomes orange
  const RED = new Set(['ff1919', 'cc1414', 'ff0202', '6c0101', 'a30202']);
  worker(A, range(21, 31), {eye: '000000', helmet: L => P.white(L + 25), helmetDepth: 2, face: 3, torso: 8,
    special: (f, x, y, c, ey) => RED.has(c) ? P.orange(lum(rgb(c)) + 60) : (y > ey + 3 && isGrey(c) ? P.steel(lum(rgb(c)) + 5) : null),
    hair: P.hair, skin: P.skin, jacket: L => P.orange(L + 8), legs: P.denim});
};

// adds a helmet dome: fills the gap between the ear tips on the row above the head with the
// helmet outline, so the head top reads as one round shell instead of two ears
function dome(A, f, row, colour) {
  const xs = []; for (let x = 0; x < A.fw; x++) if (A.outAlpha(f, x, row)) xs.push(x);
  if (xs.length < 2) return;
  for (let x = Math.min(...xs) + 1; x < Math.max(...xs); x++) if (!A.outAlpha(f, x, row)) A.add(f, x, row, colour);
}
// clipboard in front of the chest, anchored on the leftmost eye pixel (upstream heads face right)
function clipboard(A, f, eyeColour, dy, keys) {
  const eyes = A.find(f, eyeColour); if (!eyes.length) return;
  const ex = Math.min(...eyes.map(e => e[0])), ey = Math.min(...eyes.map(e => e[1]));
  A.stamp(f, ex, ey + dy, ['bcb', 'wlw', 'www'], keys);
}
const maskKeep = (A, frames, eye, from, to, greyMask = false) => { // saturated mask/visor colours near the eyes stay upstream
  const keep = new Set();
  for (const f of frames) { const e = A.find(f, eye); if (!e.length) continue; const ey = Math.min(...e.map(q => q[1]));
    A.each([f], (ff, x, y, c) => { if (y >= ey + from && y <= ey + to && (sat(rgb(c)) > 40 || (greyMask && isGrey(c) && lum(rgb(c)) > 70))) keep.add(f + ':' + x + ',' + y); }); }
  return keep;
};

// ---------------------------------------------------------------- shaman: Bautrupp-Gutachter
// The coloured masks stay (red/blue/purple tell the three spell types apart) and now read as
// safety visors; white Gutachter helmet on top, olive parka, navy trousers and a clipboard.
PAINT.shaman = A => {
  for (const off of [0, 21, 42, 63]) {
    const F = range(off, off + 10), keep = maskKeep(A, F, '000000', -1, 4, off === 63);
    worker(A, F, {eye: '000000', helmet: L => P.white(L + 70), helmetAll: true, helmetDepth: -2, hairGap: 1, face: 4, torso: 8, eyeFallback: 3,
      special: (f, x, y, c) => keep.has(f + ':' + x + ',' + y) ? c : null,
      hair: P.hair, skin: P.skin, jacket: P.olive, legs: P.navy});
    for (const f of F) {
      const e = A.find(f, '000000'); if (!e.length) continue;
      const ey = Math.min(...e.map(q => q[1]));
      if (ey >= 3) dome(A, f, ey - 3, '4a4d52');
      if (f - off < 8) clipboard(A, f, '000000', 5, {b: '6b4a2a', c: 'c0c4c8', w: P.paper, l: '4a4e59'});
    }
  }
};

// ---------------------------------------------------------------- gnoll_guard: Bautrupp-Wachmann
// No helmet (desc), dark hair, black security jacket; the round shield becomes a red/white
// barrier board. Spear and the red face markings stay upstream.
PAINT.gnoll_guard = A => {
  worker(A, range(0, 10), {eye: '000000', face: 3, torso: 8, keep: new Set(['ff0000', '991f1f', 'ffffff', '634b1c']),
    special: (f, x, y, c, ey) => {
      if (y > ey + 3 && isGrey(c)) { const L = lum(rgb(c)); return L < 20 ? '1a0a08' : (((y - ey) >> 1) & 1 ? (L > 60 ? P.red : P.redDark) : (L > 60 ? P.paper : 'b8b2a6')); }
      return null;
    },
    hair: P.hair, skin: P.skin, jacket: L => P.navy(L - 10), legs: L => P.navy(L - 25)});
};

// ---------------------------------------------------------------- gnoll_sapper: Bautrupp-Sprengmeister
// Small pale Bauwicht: blue helmet, yellow hi-vis vest with reflective stripe, grey trousers.
PAINT.gnoll_sapper = A => {
  const F = range(0, 10);
  worker(A, F, {eye: '000000', helmet: L => mixHex(P.denim(L + 40), '2a6ad0', 0.45), helmetAll: true, helmetDepth: -2, face: 3, torso: 7, stripe: 5,
    hair: P.hair, skin: P.skin, jacket: L => P.yellow(L + 25), legs: L => P.steel(L - 20)});
  for (const f of F) { const e = A.find(f, '000000'); if (e.length) { const ey = Math.min(...e.map(q => q[1])); if (ey >= 4) dome(A, f, ey - 4, '14264a'); } }
};

// ---------------------------------------------------------------- gnoll_geomancer: Tiefbau-Geomant
// Boss of the crew: golden "erster Spatenstich" ceremonial helmet, dark suit (the golden mask
// stays); the sleeping statue version is poured concrete instead of stone.
PAINT.gnoll_geomancer = A => {
  const F = range(0, 10), keep = maskKeep(A, F, '000000', -1, 4);
  worker(A, F, {eye: '000000', helmet: L => P.yellow(L + 60), helmetAll: true, helmetDepth: -2, face: 4, torso: 9, eyeFallback: 3,
    special: (f, x, y, c) => keep.has(f + ':' + x + ',' + y) ? c : null,
    hair: P.hair, skin: P.skin, jacket: L => P.navy(L - 20), legs: L => P.navy(L - 30)});
  for (const f of F) { const e = A.find(f, '000000'); if (e.length) { const ey = Math.min(...e.map(q => q[1])); if (ey >= 3) dome(A, f, ey - 3, '3a2a0c'); } }
  const S = range(21, 31);
  A.each(S, (f, x, y, c) => { if (isGrey(c) || sat(rgb(c)) < 30) A.set(f, x, y, P.concrete(lum(rgb(c)))); });
};

// ---------------------------------------------------------------- Hausschwamm (fungal_*)
// Dry rot instead of the green upstream fungus: rust-brown fruiting body with a white mycel
// crust on top and white flecks, dark brown gills, a grey-brown stem.
const DRY_ROT = {
  'b9d661': 'e6dcc6', '5ebb44': 'f7f1e2', '8c9b52': 'b0602a', '4f833e': '7e3a16', '646e3e': '8a6a48', '5b6536': '6a4a2e',
  '5e5d36': '5a2e16', '344a2a': '32180c', '29181e': '2a1a14', '534f3e': '5a4c40', '7f8d5f': '8c8274',
};
PAINT.fungal_core = A => A.remap([0], DRY_ROT);
PAINT.fungal_sentry = A => A.remap([0], DRY_ROT);
// Hausschwamm-Spinne: the barrier-tape legs of the Flatterbandspinne, but the body is overgrown
// with rust-brown dry rot and white mycel
PAINT.fungal_spinner = A => {
  const F = range(0, 9);
  tapeLegs(A, F, '75bc0a', '629d08');
  A.remap(F, {'4a7706': '9a5224', '588e07': 'c07a3a', '3b6005': '6e3416', '3b5f05': '6a3214', '2d4904': '421e0c',
    '8ee50c': 'f2ead6', '7bc60a': 'e0d2b4', '70b409': 'c8b08a', '619d08': 'a8845a'});
  // a few white mycel flecks on the living body
  for (const f of range(0, 7)) A.each([f], (ff, x, y, c) => { if (c === '4a7706' && (x * 7 + y * 3 + f) % 11 === 0) A.set(f, x, y, 'efe6d2'); });
};

// ================================================================ tile sheets
// pixel helpers on absolute sheet coordinates (tiles: alpha is never touched)
const tile = A => ({
  get: (x, y) => { const i = (y * A.src.w + x) * 4; return A.src.px[i + 3] ? hex([A.src.px[i], A.src.px[i + 1], A.src.px[i + 2]]) : null; },
  set: (x, y, h) => { const i = (y * A.src.w + x) * 4; if (!A.out.px[i + 3] || !h) return; const c = rgb(h); A.out.px[i] = c[0]; A.out.px[i + 1] = c[1]; A.out.px[i + 2] = c[2]; },
  rect: (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * A.src.w + x) * 4; if (A.src.px[i + 3]) { const r = fn(hex([A.src.px[i], A.src.px[i + 1], A.src.px[i + 2]]), x, y); if (r) { const c = rgb(r); A.out.px[i] = c[0]; A.out.px[i + 1] = c[1]; A.out.px[i + 2] = c[2]; } } } },
  stamp: (ox, oy, rows, keys) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { const i = ((oy + y) * A.src.w + ox + x) * 4; if (A.out.px[i + 3] === 255) { const c = rgb(keys[ch]); A.out.px[i] = c[0]; A.out.px[i + 1] = c[1]; A.out.px[i + 2] = c[2]; } } })),
});

// ---------------------------------------------------------------- caves_boss: Bohrlindes Startschacht
// The red carpet stays: it is the carpet of Bohrlinde's christening (Taufe mit Sekt) and leads
// up to the Renditequartier. The two red wall banners become investor renderings (sky, white
// tower, trees), the iron arena fence gets red/white barrier tape on its rail and a round
// "Betreten verboten" sign on the gate plate.
PAINT.caves_boss = A => {
  const T = tile(A);
  const RENDER = ['sssss', 'ssWss', 'sWWWs', 'sWgWs', 'sWWWs', 'WWgWW', 'WWWWW', 'WgWgW', 'tTtTt', 'TtTtT', 'kkkkk'];
  const RK = {s: '8cc8ec', W: 'f4f2ec', g: '5f8fb8', t: '4a9a3a', T: '2e6e2a', k: '3a3434'};
  for (const [x0, x1] of [[0, 15], [64, 79]]) {
    const red = []; T.rect(x0, 18, x1, 33, (c, x, y) => { if (c === '6e0707' || c === '630e0e') red.push([x, y]); });
    if (!red.length) continue;
    const bx = Math.min(...red.map(p => p[0])), by = Math.min(...red.map(p => p[1])), bw = Math.max(...red.map(p => p[0])) - bx + 1;
    T.stamp(bx, by, RENDER.map(r => r.slice(0, bw)), RK);
  }
  // barrier tape on the fence rail (rows 80-83), in 3 px blocks
  T.rect(0, 80, 79, 83, (c, x, y) => { const L = lum(rgb(c)); const red = Math.floor(x / 3) % 2 === 0; return y <= 81 ? (red ? (L > 150 ? 'd8433a' : 'a02c24') : (L > 150 ? 'f4f0e8' : 'c8c2b8')) : null; });
  // gate plate: white sign, red ring and bar
  const plate = []; T.rect(32, 84, 47, 95, (c, x, y) => { if (lum(rgb(c)) > 110 && x >= 35 && x <= 44) plate.push([x, y]); });
  if (plate.length) {
    const px0 = Math.min(...plate.map(p => p[0])), py0 = Math.min(...plate.map(p => p[1]));
    T.stamp(px0, py0, ['.kkkkkk.', 'kwrrrrwk', 'krwwwrrk', 'krwwrwrk', 'krwrwwrk', 'krrwwwrk', 'kwrrrrwk', '.kkkkkk.'], {k: '3a3434', w: 'f4f2ec', r: 'c8322a'});
  }
};

// ---------------------------------------------------------------- caves_quest: Baucontainer
// The riveted steel room of the blacksmith quest becomes a blue site container (plates only,
// rust streaks, ladder and forge stay), the mine carts become yellow tipping lorries.
PAINT.caves_quest = A => {
  const T = tile(A);
  const blue = ramp([[20, '161b24'], [40, '222c3c'], [60, '31405a'], [80, '43587a'], [100, '587096']]);
  T.rect(0, 0, 47, 63, c => { const L = lum(rgb(c)); return sat(rgb(c)) <= 14 && L >= 22 && L <= 100 ? blue(L) : null; });
  T.rect(0, 64, 63, 75, (c, x) => { const L = lum(rgb(c)); return x >= 32 && x <= 35 ? null : sat(rgb(c)) <= 20 && L > 60 ? P.yellow(L + 20) : null; });
};

// ---------------------------------------------------------------- tiles_caves_gnoll: Tiefbau-Stollen
// The gnoll mine atlas is the caves atlas plus a few mining cells. The shared part is built by
// the Baustelle tileset script itself (tools/generate-baustelle-tiles.cjs, run on the gnoll
// original into a temp file, so both atlases always match); the gnoll-only cells (rubble on the
// floor, mineable boulders and their overhangs) become broken concrete with rusty rebar ends.
const GNOLL_ONLY = [5, 11, 76, 77, 78, 79, ...range(132, 143), ...range(240, 255)];
PAINT.tiles_caves_gnoll = A => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'baustelle-gnoll-'));
  try {
    const src = path.join(tmp, 'src.png'), out = path.join(tmp, 'out.png');
    fs.writeFileSync(src, encodePNG(A.src));
    execFileSync(process.execPath, [path.join(__dirname, 'generate-baustelle-tiles.cjs'), '--source', src, '--out', out], {cwd: ROOT, stdio: 'pipe'});
    A.out.px = Buffer.from(decodePNG(fs.readFileSync(out)).px);
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
  const T = tile(A), cx = t => (t % 16) * 16, cy = t => (t >> 4) * 16;
  const floorCols = new Set(); T.rect(0, 0, 15, 15, c => { floorCols.add(c); return null; });
  const shot = ramp([[0x00, '000000'], [0x30, '2f2e2c'], [0x50, '4f4d49'], [0x70, '6e6b66'], [0x90, '8b8882'], [0xb0, 'a9a59e'], [0xd0, 'c4c0b8']]);
  const newFloor = (x, y) => { const i = ((y % 16) * A.out.w + (x % 16)) * 4; return hex([A.out.px[i], A.out.px[i + 1], A.out.px[i + 2]]); };
  const h = (x, y) => { let v = Math.imul(x + 11, 374761393) ^ Math.imul(y + 7, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
  for (const t of GNOLL_ONLY) {
    T.rect(cx(t), cy(t), cx(t) + 15, cy(t) + 15, (c, x, y) => {
      if ((t === 5 || t === 11) && floorCols.has(c)) return newFloor(x, y);
      const L = lum(rgb(c));
      if (L > 0x60 && L < 0xa0 && h(x, y) < 4) return h(x, y + 1) < 50 ? '8a4a22' : '5e3018'; // rebar ends
      return shot(L - 4);
    });
  }
};

// ================================================================ run
function checkAndWrite(A) {
  if (A.out.w !== A.src.w || A.out.h !== A.src.h) throw new Error(A.name + ': size changed');
  let changed = 0, alphaChanged = 0;
  for (let p = 0; p < A.src.w * A.src.h; p++) {
    const i = p * 4;
    if (A.src.px[i + 3] !== A.out.px[i + 3]) {
      if (!RESHAPED.has(A.name)) throw new Error(A.name + ': alpha changed at pixel ' + p);
      // alpha changes only inside a frame cell the original already uses
      const x = p % A.src.w, y = Math.floor(p / A.src.w), f = Math.floor(y / A.fh) * A.per + Math.floor(x / A.fw);
      if (Math.floor(x / A.fw) >= A.per || !A.used(f)) throw new Error(A.name + ': alpha change outside a used frame at ' + x + ',' + y);
      alphaChanged++;
    }
    if (A.src.px[i] !== A.out.px[i] || A.src.px[i + 1] !== A.out.px[i + 1] || A.src.px[i + 2] !== A.out.px[i + 2]) changed++;
  }
  const png = encodePNG(A.out);
  if (Buffer.compare(decodePNG(png).px, A.out.px) !== 0) throw new Error(A.name + ': PNG round trip mismatch');
  fs.writeFileSync(path.join(ASSETS, A.def.file), png);
  console.log(A.def.file + '  ' + A.src.w + 'x' + A.src.h + '  frame ' + A.fw + 'x' + A.fh + '  ' + changed + ' px changed' + (alphaChanged ? ', ' + alphaChanged + ' px alpha' : ', alpha identical'));
}

const only = (() => { const i = argv.indexOf('--only'); return i >= 0 ? argv[i + 1].split(',') : Object.keys(PAINT); })();
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const results = [];
for (const name of only) {
  if (!PAINT[name]) throw new Error('unknown sheet ' + name);
  const A = loadSheet(name);
  PAINT[name](A);
  checkAndWrite(A);
  results.push(A);
}

// ---------------------------------------------------------------- previews (x6, original above result)
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const S = 6, gap = 4;
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
  for (const A of results) {
    const rows = Math.floor(A.src.h / A.fh), usedRows = range(0, rows - 1).filter(r => range(0, A.per - 1).some(k => A.used(r * A.per + k)));
    const cols = Math.max(...usedRows.map(r => Math.max(...range(0, A.per - 1).filter(k => A.used(r * A.per + k))) + 1));
    const c = canvas(cols * (A.fw * S + gap), usedRows.length * (2 * (A.fh * S + gap) + 8));
    usedRows.forEach((r, n) => { for (let k = 0; k < cols; k++) {
      const dx = k * (A.fw * S + gap), dy = n * (2 * (A.fh * S + gap) + 8);
      blit(c, A.src, k * A.fw, r * A.fh, A.fw, A.fh, dx, dy);
      blit(c, A.out, k * A.fw, r * A.fh, A.fw, A.fh, dx, dy + A.fh * S + gap);
    } });
    fs.writeFileSync(path.join(previewDir, A.name + '-x6.png'), encodePNG(c));
  }
  console.log('previews in ' + previewDir);
}
