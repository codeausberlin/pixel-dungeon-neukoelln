// "Die ewige Baustelle" (floors 11-15, U-Bahn tunnel works): rebuilds
// environment/tiles_caves.png from the upstream caves atlas and writes feature row 2.
// Grid, cell functions and alpha stay identical (checked on write).
//   node tools/generate-baustelle-tiles.cjs [--preview DIR] [--source orig.png] [--out file.png]
'use strict';
const path = require('node:path');
const kit = require('./lib/tileset-kit.cjs');
const {T, rgb, ramp, range, shade, mix} = kit;

const A = kit.open({name: 'tiles_caves.png', blob: 'c55271e14ac9ab0cf68cae29df620d13dcfda6d8'});
for (const t of [T.FLOOR, T.FLOOR_ALT_1, T.FLOOR_ALT_2]) for (const c of A.tileColours(t)) A.floorSet.add(c);

const K = Object.fromEntries(Object.entries({
  crete: '33312e', creteLight: '3b3935', creteDark: '2c2a27', aggregate: '47443f',
  ballast: '5a5854', ballastLight: '77746e', ballastDark: '2a2826',
  sleeper: '4a3a2a', sleeperLight: '5e4a36', sleeperDark: '2c2219', rail: '8d9296', railDark: '4c5054',
  shadow: '2c2b29', seg: '6b6964', segLight: '7a7872', segDark: '5c5a56', joint: '3a3936', bolt: '262523',
  tray: '8c9195', trayDark: '5a5f63', cable: '1c1d20', cableOr: 'c8641e',
  yellow: 'e2b92c', black: '1d1c1a', spray: 'e0632a',
}).map(([k, v]) => [k, rgb(v)]));
const R = {
  shot: ramp([[0x00, '000000'], [0x30, '2f2e2c'], [0x50, '4f4d49'], [0x70, '6e6b66'], [0x90, '8b8882'], [0xb0, 'a9a59e'], [0xd0, 'c4c0b8']]),
  copper: ramp([[0x20, '3a1a0c'], [0x50, '7a3618'], [0x80, 'b4602c'], [0xb0, 'e09250'], [0xe0, 'f6c88a']]),
  osb: ramp([[0x00, '140f08'], [0x20, '3a2a16'], [0x40, '7a5c30'], [0x60, 'a8844c'], [0x80, 'c9a468']]),
  steel: ramp([[0x00, '121315'], [0x30, '34383c'], [0x50, '5a6065'], [0x70, '80878c'], [0x90, 'a7aeb3']]),
  galv: ramp([[0x00, '101214'], [0x18, '2a2f33'], [0x28, '454c52'], [0x40, '6a737a'], [0x60, '98a2a9']]),
  alu: ramp([[0x00, '1a1b1d'], [0x30, '4a4e52'], [0x50, '7c8287'], [0x70, 'a4aab0'], [0x90, 'c8ced2']]),
};
const hash = (x, y, s = 0) => { let v = Math.imul(x + 5 + s, 374761393) ^ Math.imul(y + 3, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const hue = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; let h;
  if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; return (h * 60 + 360) % 360; };
const isGold = (k, c) => k.kind === 'colour' && k.sat > 50 && hue(...c) > 30 && hue(...c) < 60;
const isWood = (k, c) => k.kind === 'colour' && k.sat >= 24 && !isGold(k, c) && k.r > k.b;
const isRock = (k, c) => k.kind === 'grey' || (k.kind === 'colour' && !isGold(k, c) && !isWood(k, c) && k.sat < 24);

// ---------------------------------------------------------------- floors: Spritzbeton, Schotter, Schwelle
function crete(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const h = hash(x >> 1, y >> 1, 1), p = hash(x, y, 2);
    A.put(t, x, y, p < 4 ? K.aggregate : h < 25 ? K.creteLight : h > 80 ? K.creteDark : K.crete);
  }
}
crete(T.FLOOR); crete(T.FLOOR_ALT_1); crete(T.FLOOR_ALT_2);
A.stamp(T.FLOOR_ALT_1, 2, 9, ['dd.....', '..ddd..', '.....dd'], {d: K.creteDark}); // hairline crack
A.stamp(T.FLOOR_ALT_1, 10, 3, ['bL', 'db'], {b: K.ballast, L: K.ballastLight, d: K.ballastDark}); // a stray ballast stone
A.stamp(T.FLOOR_ALT_2, 1, 5, [ // leftover sleeper with two rail stubs
  '..rr....rr....',
  'sSSrrSSSSrrSSs',
  'sLLLLLLLLLLLLs',
  'sSSSSSSSSSSSSs',
  'dddddddddddddd',
], {s: K.sleeperDark, S: K.sleeper, L: K.sleeperLight, r: K.rail, d: K.shadow});
A.substituteFloor();
// FLOOR_DECO pebbles read as spilled track ballast already; only cool them slightly
for (const t of [T.FLOOR_DECO, T.FLOOR_DECO_ALT]) A.mapTile(t, k => k.kind !== 'floor' && k.L > 0x40 ? R.shot(k.L - 6) : null);

// ---------------------------------------------------------------- walls: Tübbinge + Spritzbeton
const capTiles = [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 32),
  ...range(T.WALL_OVERHANG, 8), T.EXIT_UNDERHANG, T.UNLOCKED_EXIT, T.LOCKED_EXIT, T.CHASM_WALL];
for (const t of capTiles) A.mapTile(t, (k, x, y, c) => isRock(k, c) ? R.shot(k.L) : isGold(k, c) ? R.copper(k.L) : null);
for (const t of [...range(T.RAISED_WALL, 16), ...range(T.RAISED_WALL_ALT, 16)])
  A.mapTile(t, (k, x, y, c) => isRock(k, c) ? R.shot(k.L) : isGold(k, c) ? R.copper(k.L) : null, [0, 4]);
for (const t of range(T.RAISED_WALL_DOOR, 4)) A.mapTile(t, (k, x, y, c) => isRock(k, c) ? R.shot(k.L) : null);

// concrete tunnel segments, staggered joints, bolt pockets, and a cable tray on every face
function tuebbing(x, y) {
  if (y === 4) return K.shadow;
  if (y === 6) return x % 4 === 0 ? K.trayDark : K.tray;
  if (y === 7) return x % 5 === 2 ? K.cableOr : K.cable;
  if (y === 11) return K.joint;
  const jx = y < 11 ? 7 : 15;
  if (x === jx) return K.joint;
  if ((y === 9 || y === 13) && (x === jx - 2 || x === (jx + 3) % 16)) return K.bolt;
  if (y === 5 || y === 12) return K.segLight;
  if (y === 15) return K.segDark;
  return hash(x, y, 7) < 5 ? K.segDark : K.seg;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DECO, T.RAISED_WALL_ALT, T.RAISED_WALL_DECO_ALT]) A.face(base, tuebbing);
A.addNoticeCells(); // new cells 104-107 (RAISED_WALL_NOTICE), see tools/lib/tileset-kit.cjs

// alt faces: survey spray mark (+0), yellow/black edge protection at open wall ends
// +0: a wild-posted techno poster for the parody club "BÄRG" (no real club names/logos)
{ const t = T.RAISED_WALL_ALT, bg = rgb('141418'), acid = rgb('b8f040'), pink = rgb('ff4fa0');
  for (let y = 8; y <= 14; y++) for (let x = 0; x < 16; x++) if (!(y === 14 && x % 3 === 0) && !(y === 8 && x > 13)) A.solid(t, x, y, bg);
  kit.word('BÄRG').forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') A.solid(t, x, 8 + y, acid); }));
  for (let x = 1; x < 15; x += 2) A.solid(t, x, 13, pink);
  A.stamp(t, 12, 5, ['o.o', '.o.'], {o: K.spray}); // surveyor mark still peeks out above
}
function hazard(t, x0) { for (let y = 5; y < 16; y++) for (let x = x0; x < x0 + 2; x++) if (y !== 6 && y !== 7) A.solid(t, x, y, ((x + y) >> 1) % 2 ? K.yellow : K.black); }
hazard(T.RAISED_WALL_ALT + 1, 13); hazard(T.RAISED_WALL_ALT + 2, 1); hazard(T.RAISED_WALL_ALT + 3, 1); hazard(T.RAISED_WALL_ALT + 3, 13);
// Round 4 wall motifs (texts: levels.walldeco.*): a crossed-out tower-crane stencil on the
// +2 wall end, and a tear-off flat-hunt note (all tabs still there) on RAISED_WALL_NOTICE
kit.wallMotif(A.endPaint(T.RAISED_WALL_ALT + 2), T.RAISED_WALL_ALT + 2, 'graffiti_kran');
for (let v = 0; v < 4; v++) kit.wallMotif(A.endPaint(T.RAISED_WALL_NOTICE + v), T.RAISED_WALL_NOTICE + v, 'gesuch_3');

// WALL_DECO: the "gold vein" is a burst bundle of copper cable (CavesLevel's Vein sparkles
// now read as glinting copper, matching wall_deco_desc)
for (let v = 0; v < 4; v++) for (const base of [T.RAISED_WALL_DECO, T.RAISED_WALL_DECO_ALT])
  A.mapTile(base + v, (k, x, y, c) => isGold(k, c) && y >= 4 ? (hash(x, y, 9) < 18 ? K.cable : R.copper(k.L)) : null);
for (const t of [T.FLAT_WALL_DECO, T.FLAT_WALL_DECO_ALT, ...range(T.WALL_INTERNAL_DECO, 16), ...range(T.WALL_OVERHANG_DECO, 4)])
  A.mapTile(t, (k, x, y, c) => isGold(k, c) ? R.copper(k.L) : null);

// ---------------------------------------------------------------- doors: OSB site doors, steel locked door
const DOOR_OSB = [T.FLAT_DOOR, T.RAISED_DOOR, T.FLAT_DOOR_OPEN, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_SIDEWAYS, ...range(208, 8),
  T.DOOR_OVERHANG, T.DOOR_OVERHANG_OPEN, T.DOOR_SIDEWAYS];
const DOOR_STEEL = [T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, ...range(216, 4), T.DOOR_SIDEWAYS_LOCKED];
const DOOR_KEEP = [T.FLAT_DOOR_CRYSTAL, T.RAISED_DOOR_CRYSTAL, ...range(220, 4), T.DOOR_OVERHANG_CRYSTAL, T.DOOR_SIDEWAYS_CRYSTAL];
for (const t of [...DOOR_OSB, ...DOOR_STEEL, ...DOOR_KEEP]) A.mapTile(t, (k, x, y, c) => {
  if (k.kind === 'floor') return null;
  if (isWood(k, c)) return DOOR_KEEP.includes(t) ? null : DOOR_STEEL.includes(t) ? R.steel(k.L) : (hash(x, y, t) < 10 ? R.osb(k.L - 18) : R.osb(k.L));
  if (isRock(k, c) && !(k.b > k.r + 6)) return R.shot(k.L);
  return null;
});
// the padlock on the steel door becomes brass so it still reads as "locked"
for (const t of [T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED]) A.mapTile(t, (k, x, y, c) =>
  isRock(k, c) && k.kind !== 'floor' && x >= 4 && x <= 11 && y >= 2 && k.L > 0x40 ? mix(R.steel(k.L), rgb('d9aa3c'), 0.75) : null);
// a yellow/black kick strip on the closed site door
A.stamp(T.RAISED_DOOR, 4, 10, ['ykykykyk'], {y: K.yellow, k: K.black});
A.stamp(T.FLAT_DOOR, 4, 12, ['ykykykyk'], {y: K.yellow, k: K.black});

// ---------------------------------------------------------------- props
// barricade -> red/white construction barrier (still a flammable obstacle)
for (const t of [T.FLAT_BARRICADE, T.RAISED_BARRICADE, T.BARRICADE_OVERHANG]) A.mapTile(t, (k, x, y, c) => {
  if (k.kind === 'floor' || k.L < 0x1c) return null;
  const red = ((x + y) >> 2) % 2 === 0, f = 0.55 + k.L / 170;
  return shade(red ? rgb('c8322a') : rgb('e8e4dc'), Math.min(1.08, f));
});
// REGION_DECO (Tunnelgerüst): galvanised scaffold with orange toe boards on top
for (const t of [T.FLAT_REGION_DECO, T.FLAT_REGION_DECO_ALT, T.RAISED_REGION_DECO, T.RAISED_REGION_DECO_ALT, T.REGION_DECO_OVERHANG, T.REGION_DECO_ALT_OVERHANG])
  A.mapTile(t, (k, x, y, c) => (k.kind === 'floor' || k.kind === 'black') ? null : R.galv(k.L));
for (const t of [T.REGION_DECO_OVERHANG, T.REGION_DECO_ALT_OVERHANG]) A.mapTile(t, (k, x, y) => k.L > 0x2a && y >= 13 ? mix(R.galv(k.L), rgb('d9822b'), 0.7) : null);
// ladders ("Bauleiter"): aluminium instead of wood
for (const t of [T.ENTRANCE, T.EXIT, T.ENTRANCE_SP]) A.mapTile(t, (k, x, y, c) => isWood(k, c) ? R.alu(k.L) : null);

// Abgruende: nie fertig gebaute A100-Abschnitte (shared, tools/lib/tileset-kit.cjs)
kit.a100Chasm(A);
A.finish({stage: 2, water: path.join(kit.ROOT, 'core/src/main/assets/environment/water2.png')});
