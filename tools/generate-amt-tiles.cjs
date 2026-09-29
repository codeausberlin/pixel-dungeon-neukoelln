// "Das Amt ohne Termin" (floors 6-10): rebuilds environment/tiles_prison.png from the
// upstream prison atlas. Grid, cell functions and alpha stay identical (checked on write).
//   node tools/generate-amt-tiles.cjs [--preview DIR] [--source orig.png] [--out file.png]
'use strict';
const path = require('node:path');
const kit = require('./lib/tileset-kit.cjs');
const {T, rgb, lum, ramp, range, shade, mix} = kit;

const A = kit.open({name: 'tiles_prison.png', blob: '92356756990e6c0bf187d6fc4c272016e9de2dd3'});
for (const t of [T.FLOOR, T.FLOOR_ALT_1, T.FLOOR_ALT_2]) for (const c of A.tileColours(t)) A.floorSet.add(c);

const P = {
  // PVC/linoleum
  linoA: '57594f', linoB: '505248', linoJoint: '42443c', linoLight: '5f6157', linoSpeck: '64665b', linoDark: '484a41',
  scuff: '393a34', tapeY: 'c9a93a', tapeD: '6e5a1c',
  // walls
  shadow: '3f4a3d', paint: '7b9477', paintLight: '869f82', paintScuff: '6f876c', trim: '4f6a4c',
  tile: 'a7a28b', tileLight: 'b9b49c', grout: '847f6b', tileLow: '948f79',
  // details
  red: 'b8322c', redDark: '7a1f1c', redLight: 'e0604f', black: '1f1f22', steel: '9aa0a4', steelDark: '5c6266',
  exitG: '2f9a55', exitGD: '1f6b3a', white: 'e9ecdf', switchW: 'd8d5c4', switchD: '8d8a7c',
  brass: 'b89448', brassD: '7d6128', shade: 'efe8c6', shadeD: 'c9bf96',
  led: '1a1a1c', ledOn: 'ff5a3c', ledOff: '4a2420',
};
const K = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, rgb(v)]));
const R = {
  cap: ramp([[0x00, '000000'], [0x30, '2f302b'], [0x60, '6a6a60'], [0x90, 'a5a494'], [0xb0, 'c6c4b1'], [0xc8, 'd8d6c3'], [0xe0, 'eae8d8']]),
  paint: ramp([[0x00, '000000'], [0x30, '2a3629'], [0x50, '4d6149'], [0x70, '6c8468'], [0x90, '849c80'], [0xb0, 'a3b99e']]),
  glass: ramp([[0x00, '1c1f22'], [0x30, '3b4146'], [0x50, '8d989e'], [0x60, 'b0bcc1'], [0x80, 'd2dcdf']]),
  metal: ramp([[0x00, '17181a'], [0x30, '363a3e'], [0x50, '5b6166'], [0x70, '7e858b'], [0x90, 'a1a8ad']]),
  brass: ramp([[0x30, '4a3a14'], [0x60, '8a6a26'], [0x90, 'c49a3e'], [0xb8, 'e8cc6a']]),
  carpet: ramp([[0x00, '14171d'], [0x20, '252b36'], [0x40, '38414f'], [0x58, '46506a'], [0x70, '56627c']]),
  chair: ramp([[0x00, '140a05'], [0x20, '3a1d0c'], [0x40, '7a3a14'], [0x60, 'b0591f'], [0x80, 'd27d31'], [0xa0, 'e8a050']]),
  coffee: ramp([[0x00, '1e140c'], [0x30, '3f2a18'], [0x50, '5e4126'], [0x70, '7d5a38']]),
  ink: ramp([[0x00, '10142a'], [0x40, '2c3a78'], [0x70, '4a5aa8']]),
  terrazzo: ramp([[0x00, '000000'], [0x30, '34332f'], [0x60, '6a6862'], [0x90, '9c9990'], [0xc0, 'c8c5ba'], [0xff, 'efece2']]),
};
const hash = (x, y, s = 0) => { let v = Math.imul(x + 11 + s, 374761393) ^ Math.imul(y + 7, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const isWood = k => k.kind === 'colour' && k.sat >= 36 && k.r > k.b;   // doors, shelves, barricade
const isStone = k => k.kind === 'grey' || (k.kind === 'colour' && k.sat < 36); // beige-grey masonry

// ---------------------------------------------------------------- floors: PVC-Belag
function lino(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const tileA = ((x >> 3) + (y >> 3)) & 1, lx = x & 7, ly = y & 7;
    let c = tileA ? K.linoA : K.linoB;
    if (lx === 7 || ly === 7) c = K.linoJoint;
    else if (lx === 0 || ly === 0) c = K.linoLight;
    else { const h = hash(x, y); if (h < 3) c = K.linoSpeck; else if (h > 97) c = K.linoDark; }
    A.put(t, x, y, c);
  }
}
lino(T.FLOOR); lino(T.FLOOR_ALT_1); lino(T.FLOOR_ALT_2);
A.stamp(T.FLOOR_ALT_1, 3, 10, ['ss.', '..s'], {s: K.linoDark});                 // faint shoe scuff
A.stamp(T.FLOOR_ALT_2, 4, 11, ['dyyyyyyd'], {y: K.tapeY, d: K.tapeD});          // "Abstand halten" tape
A.substituteFloor();

// stains: coffee rings and stamp ink instead of blood
for (const t of [T.FLOOR_DECO, T.FLOOR_DECO_ALT])
  A.mapTile(t, (k, x, y) => k.kind === 'colour' && k.r > k.g + 20 ? (hash(x >> 1, y >> 1, t) < 22 ? R.ink(k.L) : R.coffee(k.L)) : null);

// FLOOR_SP: blue-grey office carpet (was a metal grate)
for (const t of [T.FLOOR_SP, T.FLOOR_SP_ALT]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const h = hash(x, y, t), base = (x + y) % 4 === 0 ? 0x4c : 0x54;
  A.put(t, x, y, R.carpet(base + (h < 12 ? 10 : h > 90 ? -10 : 0)));
}
const spColours = A.tileColours(T.FLOOR_SP);
for (const t of [T.CHASM_FLOOR_SP, T.ENTRANCE_SP, T.FLAT_STATUE_SP, T.RAISED_STATUE_SP])
  A.mapTile(t, (k, x, y, c) => spColours.has(kit.hex(c)) ? R.carpet(k.L) : null);

// ---------------------------------------------------------------- walls: Behördengrün + Wandfliesen
const capTiles = [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 32),
  ...range(T.WALL_OVERHANG, 8), T.EXIT_UNDERHANG, T.UNLOCKED_EXIT, T.LOCKED_EXIT];
for (const t of capTiles) A.mapTile(t, k => isStone(k) ? R.cap(k.L) : null);
for (const t of [...range(T.RAISED_WALL, 16), ...range(T.RAISED_WALL_ALT, 16)]) A.mapTile(t, k => isStone(k) ? R.cap(k.L) : null, [0, 4]);
for (const t of [...range(T.RAISED_WALL_DOOR, 4), T.CHASM_WALL]) A.mapTile(t, (k, x, y) => isStone(k) ? (y < 4 && t !== T.CHASM_WALL ? R.cap(k.L) : R.paint(k.L)) : null);

function wallFace(x, y) {
  if (y === 4) return K.shadow;
  if (y <= 9) { // painted upper half, a few scuffs
    if (y === 5) return K.paintLight;
    return hash(x, y, 3) < 4 ? K.paintScuff : K.paint;
  }
  if (y === 10) return K.trim;
  // lower half: 4px wall tiles
  const tx = x % 4, ty = (y - 11) % 4;
  if (tx === 3 || ty === 3) return K.grout;
  if (tx === 0 && ty === 0) return K.tileLight;
  return y === 15 ? K.tileLow : K.tile;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DECO, T.RAISED_WALL_ALT, T.RAISED_WALL_DECO_ALT]) A.face(base, wallFace);
// the bookshelf walls keep their shelves; only their stone rim above was recoloured

// details on the alt faces: light switch (+0), fire extinguisher (+1), exit pictogram (+2)
A.stamp(T.RAISED_WALL_ALT, 11, 7, ['ww', 'wd'], {w: K.switchW, d: K.switchD});
A.stamp(T.RAISED_WALL_ALT + 1, 5, 5, [
  '.ss..',
  '.bs..',
  'rRRr.',
  'rRRrb',
  'rrRrb',
  'rrrr.',
  'rrrr.',
  'rrrr.',
  'dddd.',
], {s: K.steel, b: K.black, r: K.red, R: K.redLight, d: K.redDark});
A.stamp(T.RAISED_WALL_ALT + 3, 4, 5, [
  'gggggggg',
  'ggwgggwg',
  'gwwwwwwg',
  'ggwgggwg',
  'GGGGGGGG',
], {g: K.exitG, G: K.exitGD, w: K.white}); // double arrow pictogram, no text
// Satire (fictional chancellor "März", no real names/logos/faces):
// +2 an official-looking election poster "MÄRZ" pinned to the notice wall, corner torn,
// moustache drawn on. A crossed-out "M" sticker sits next to the LED display (WALL_DECO_ALT).
{ const t = T.RAISED_WALL_ALT + 2, bg = rgb('6f7f95'), ink = rgb('e8ecf0'), bar = rgb('9fb8d8');
  for (let y = 5; y <= 11; y++) for (let x = 0; x < 16; x++) if (!(y === 11 && x > 11) && !(y === 5 && x < 2)) A.solid(t, x, y, y === 10 ? bar : bg);
  kit.word('MÄRZ').forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') A.solid(t, x, 5 + y, ink); }));
  A.stamp(t, 4, 10, ['mm.mm', '.m.m.'], {m: rgb('141214')});
  A.stamp(t, 7, 4, ['p'], {p: rgb('c8322a')}); // red pin
}
for (let v = 0; v < 4; v++) { // crossed-out "M" sticker next to the waiting-number display (WALL_DECO_ALT)
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 11, 4, ['r...r', 'rr.rr', 'r.r.r', 'r...r'], {r: K.red});
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 11, 4, ['k....', '.k...', '..k..', '...kk'], {k: rgb('1f1f22')});
}

// WALL_DECO keeps PrisonLevel's Torch emitter (flame at tile centre +2px, halo): a brass
// wall lamp with a milk-glass bowl; the alt variant adds a waiting-number display (LED blocks).
const LAMP = [
  '..bb..',
  '..BB..',
  'sSSSSs',
  '.sSSs.',
];
for (let v = 0; v < 4; v++) {
  A.stamp(T.RAISED_WALL_DECO + v, 5, 7, LAMP, {b: K.brassD, B: K.brass, S: K.shade, s: K.shadeD});
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 5, 7, LAMP, {b: K.brassD, B: K.brass, S: K.shade, s: K.shadeD});
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 1, 5, ['kkkkkk', 'kOoOOk', 'kkkkkk'], {k: K.led, O: K.ledOn, o: K.ledOff});
}
A.stamp(T.FLAT_WALL_DECO, 6, 6, ['BB', 'SS'], {B: K.brass, S: K.shade});
A.stamp(T.FLAT_WALL_DECO_ALT, 6, 6, ['BB', 'SS'], {B: K.brass, S: K.shade});

// ---------------------------------------------------------------- doors
// Closed door = aluminium frame + milk glass; locked = grey metal door with brass lock.
function door(t, style) {
  const cells = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!A.alphaAt(t, x, y)) continue;
    const c = A.srcRGB(t, x, y), k = A.classify(c);
    if (isWood(k)) cells.push({x, y, k});
    else if (isStone(k)) A.put(t, x, y, R.cap(k.L));
  }
  if (!cells.length) return;
  const m = new Set(cells.map(p => p.x + ',' + p.y));
  const x0 = Math.min(...cells.map(p => p.x)), x1 = Math.max(...cells.map(p => p.x));
  const y0 = Math.min(...cells.map(p => p.y)), y1 = Math.max(...cells.map(p => p.y));
  for (const p of cells) {
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !m.has((p.x + dx) + ',' + (p.y + dy)));
    let c;
    if (style === 'glass') c = edge ? R.metal(0x62) : (p.x - x0 + p.y - y0) % 7 === 3 ? R.glass(0x80) : R.glass(0x5c + (p.k.L - 0x50) / 4);
    else c = edge ? R.metal(0x40) : (p.y % 2 ? R.metal(0x50) : R.metal(0x62)); // roller-shutter ribs
    A.put(t, p.x, p.y, c);
  }
  if (style === 'glass' && y1 - y0 > 6) { const hy = (y0 + y1 + 1) >> 1; A.solid(t, x1 - 2, hy, R.metal(0x30)); A.solid(t, x1 - 2, hy + 1, R.metal(0x30)); }
  // the original lock (low-saturation pixels inside the door) becomes brass
  if (style === 'metal') for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = A.classify(A.srcRGB(t, x, y));
    if (!m.has(x + ',' + y) && isStone(k) && k.L > 0x50) A.solid(t, x, y, R.brass(k.L));
  }
}
for (const t of [T.FLAT_DOOR, T.RAISED_DOOR, T.FLAT_DOOR_OPEN, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_SIDEWAYS, ...range(208, 8),
  T.DOOR_OVERHANG, T.DOOR_OVERHANG_OPEN, T.DOOR_SIDEWAYS]) door(t, 'glass');
for (const t of [T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, ...range(216, 4), T.DOOR_SIDEWAYS_LOCKED]) door(t, 'metal');
for (const t of [T.FLAT_DOOR_CRYSTAL, T.RAISED_DOOR_CRYSTAL, ...range(220, 4), T.DOOR_OVERHANG_CRYSTAL, T.DOOR_SIDEWAYS_CRYSTAL, 196, 197, 198, 199])
  A.mapTile(t, k => k.kind === 'grey' || (k.kind === 'colour' && k.sat < 36 && !(k.b > k.r)) ? R.cap(k.L) : null);

// ---------------------------------------------------------------- Aktenregal (bookshelf)
// shelf wood -> grey steel shelving; book spines -> a few folder colours
const FOLDERS = ['3b5b8c', '9a3b3b', '3f7a4a', 'c9a23a', '6b6f78'].map(rgb);
function hue(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; let h;
  if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; return (h * 60 + 360) % 360; }
const shelfTiles = [T.FLAT_BOOKSHELF, T.FLAT_BOOKSHELF_ALT, ...range(T.RAISED_WALL_BOOKSHELF, 4), ...range(T.RAISED_WALL_BOOKSHELF_ALT, 4),
  ...range(T.WALL_INTERNAL_WOODEN, 16), ...range(T.WALL_OVERHANG_WOODEN, 4)];
for (const t of shelfTiles) A.mapTile(t, (k, x, y, c) => {
  if (k.kind === 'black') return null;
  if (isStone(k) && k.kind === 'grey') return R.metal(k.L);
  const h = hue(...c);
  if (k.kind === 'colour' && h >= 18 && h <= 48 && k.sat < 90 && k.r > k.b) return R.metal(k.L + 6); // wood
  if (k.kind !== 'colour') return R.metal(k.L);
  const f = FOLDERS[Math.floor(h / 72) % 5];
  return shade(f, 0.55 + k.L / 200);
});

// ---------------------------------------------------------------- props
// barricade: a row of orange waiting-room chairs on a chrome beam (still flammable).
// Base cell (raised + flat) holds seats and legs, the overhang the backrest tops; pixels
// between the chairs show the floor (base) or the shadow they already had (overhang).
const CHAIR = {O: rgb('c0621f'), o: rgb('8f4416'), H: rgb('df8a3c'), s: K.steel, S: K.steelDark, k: rgb('2a2522')};
const CHAIRS_BASE = [
  '.oOOo.oOOo.oOOo.',
  '.oOOo.oOOo.oOOo.',
  '.oOOo.oOOo.oOOo.',
  '.oooo.oooo.oooo.',
  'HHHHHHHHHHHHHHHH',
  'OOOOOOOOOOOOOOOO',
  'oooooooooooooooo',
  'ssssssssssssssss',
  'SSSSSSSSSSSSSSSS',
  '..s....ss....s..',
  '..s....ss....s..',
  '..s....ss....s..',
  '.sSs..sSSs..sSs.',
  '.kkk..kkkk..kkk.',
  '................',
  '................',
];
for (const t of [T.FLAT_BARRICADE, T.RAISED_BARRICADE]) CHAIRS_BASE.forEach((row, y) => [...row].forEach((ch, x) => {
  A.put(t, x, y, ch === '.' ? A.outRGB(T.FLOOR, x, y) : CHAIR[ch]);
}));
for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (A.alphaAt(T.BARRICADE_OVERHANG, x, y) === 255) {
  const inChair = (x % 5 >= 1 && x % 5 <= 4) && x < 15 && y >= 11;
  const edge = y === 11 || x % 5 === 1 || x % 5 === 4;
  A.put(T.BARRICADE_OVERHANG, x, y, inChair ? (y === 11 && (x % 5 === 1 || x % 5 === 4) ? null : edge ? CHAIR.o : x % 5 === 2 ? CHAIR.H : CHAIR.O) : A.outRGB(T.FLOOR, x, y));
}

// Wartekabine (region deco cage): bars become cool chrome, a number ticket inside the flat one
for (const t of [T.FLAT_REGION_DECO, T.FLAT_REGION_DECO_ALT, T.RAISED_REGION_DECO, T.RAISED_REGION_DECO_ALT, T.REGION_DECO_OVERHANG, T.REGION_DECO_ALT_OVERHANG])
  A.mapTile(t, k => (k.kind === 'grey' || (k.kind === 'colour' && k.sat < 36)) && k.L > 0x40 && !A.floorSet.has(k.h) ? mix(R.metal(k.L), rgb('9fb4c8'), 0.25) : null);
A.stamp(T.RAISED_REGION_DECO, 7, 4, ['ww', 'rw'], {w: K.white, r: K.red});
// stairs: grey terrazzo steps
for (const t of [T.ENTRANCE, T.EXIT, T.ENTRANCE_SP]) A.mapTile(t, (k, x, y, c) => (isStone(k) && !A.floorSet.has(k.h) && !spColours.has(kit.hex(c))) ? R.terrazzo(k.L) : null);

A.finish({stage: 1, water: path.join(kit.ROOT, 'core/src/main/assets/environment/water1.png')});
