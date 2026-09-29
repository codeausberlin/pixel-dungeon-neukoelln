// "Das Renditequartier" (floors 16-20): rebuilds environment/tiles_city.png from the
// upstream city atlas and writes feature row 3. Grid, cell functions and alpha stay
// identical (checked on write).
//   node tools/generate-rendite-tiles.cjs [--preview DIR] [--source orig.png] [--out file.png]
'use strict';
const path = require('node:path');
const kit = require('./lib/tileset-kit.cjs');
const {T, rgb, ramp, range, shade, mix} = kit;

const A = kit.open({name: 'tiles_city.png', blob: '9a0216d91f9951cd6196fadbc33d0b516742bc7b'});
for (const t of [T.FLOOR, T.FLOOR_ALT_1, T.FLOOR_ALT_2]) for (const c of A.tileColours(t)) A.floorSet.add(c);

const K = Object.fromEntries(Object.entries({
  slab: '41454d', slabSheen: '4c515a', slabHi: '484c55', slabJoint: '2f323a', vein: '555a63', brassIn: 'b08d45',
  oakA: '8a5a32', oakB: '7a4e2b', oakC: '9a6a3c', oakJ: '4e3019',
  shadow: '2c2f33', mull: '8a9399', mullD: '5d666c', glass: '2b4550', glassB: '314f5b', glassHi: '5a8595',
  slabEdge: 'b4b2ac', cornice: 'b8a283', corniceD: '8f7b60', brick: '7e4a38', brickL: '925a44', mortar: '5a4034',
  crete: 'a09e98', creteD: '86847e', tie: '4a4946',
  cam: 'e4e6e8', camD: '9aa0a4', lens: '15181b', plaque: 'c9a45a', plaqueD: '7d6330',
  vent: 'aeb4b8', ventD: '5f666b', ventK: '2a2e31',
}).map(([k, v]) => [k, rgb(v)]));
const R = {
  concrete: ramp([[0x00, '000000'], [0x30, '34353a'], [0x60, '6b6c6e'], [0x90, '9d9d9b'], [0xb8, 'bdbcb7'], [0xd8, 'd6d5cf']]),
  smoked: ramp([[0x00, '0c1114'], [0x30, '1c282e'], [0x50, '2c404a'], [0x70, '3f5a66']]),
  brass: ramp([[0x30, '4a3a14'], [0x70, '9a7a30'], [0xa0, 'd2ac4c'], [0xc0, 'f0d27a']]),
  corten: ramp([[0x00, '120806'], [0x30, '3e1d10'], [0x50, '6a3419'], [0x70, '8e4a22'], [0x90, 'ad6430'], [0xc0, 'cf8c52'], [0xf0, 'f0d6b0']]),
  anthra: ramp([[0x00, '0c0d0f'], [0x30, '25272b'], [0x50, '3c3f44'], [0x70, '55595f'], [0x90, '70757b'], [0xc0, '9ca1a6'], [0xf0, 'e4e6e2']]),
  lacquer: ramp([[0x00, '1a1a1a'], [0x30, '6a6a66'], [0x50, 'b0afa8'], [0x70, 'd6d5ce'], [0x90, 'eeede6']]),
  pine: ramp([[0x00, '1a1208'], [0x30, '5a4428'], [0x50, '9a7d52'], [0x70, 'c4a676'], [0x90, 'dcc49a']]),
  oak: ramp([[0x00, '1e1209'], [0x30, '4e3019'], [0x40, '6a4225'], [0x50, '7a4e2b'], [0x60, '8a5a32'], [0x70, '9a6a3c']]),
};
const hash = (x, y, s = 0) => { let v = Math.imul(x + 13 + s, 374761393) ^ Math.imul(y + 17, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const isGold = k => k.kind === 'colour' && k.sat > 90 && k.r > k.b + 80;
const isStone = k => k.kind === 'grey' || (k.kind === 'colour' && !isGold(k));

// ---------------------------------------------------------------- floors: polished stone, parquet
function slab(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const jx = y < 8 ? 0 : 8; let c = K.slab;
    if (y % 8 === 0 || x === jx) c = K.slabJoint;
    else if (y % 8 === 1 || x === (jx + 1) % 16) c = K.slabHi;
    else if ((x - y + 32) % 11 === 0 && hash(x, y, 1) < 60) c = K.slabSheen; // polish reflection
    A.put(t, x, y, c);
  }
}
slab(T.FLOOR); slab(T.FLOOR_ALT_1); slab(T.FLOOR_ALT_2);
A.stamp(T.FLOOR_ALT_1, 2, 3, ['v....', '.vv..', '...vv'], {v: K.vein});       // natural stone vein
A.stamp(T.FLOOR_ALT_2, 3, 12, ['bbbbbbbbbb'], {b: K.brassIn});                 // brass inlay strip
A.substituteFloor();

// FLOOR_SP: herringbone oak parquet (was a brown carpet with medallions)
for (const t of [T.FLOOR_SP, T.FLOOR_SP_ALT]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const u = (x + y) & 7, v = (x - y + 16) & 7, left = ((x >> 2) + (y >> 2)) & 1;
  const joint = left ? u === 0 : v === 0;
  A.put(t, x, y, joint ? K.oakJ : [K.oakA, K.oakB, K.oakC][(left ? (x - y + 64) >> 3 : (x + y) >> 3) % 3]);
}
const spColours = A.tileColours(T.FLOOR_SP);
for (const t of [T.CHASM_FLOOR_SP, T.ENTRANCE_SP, T.FLAT_STATUE_SP, T.RAISED_STATUE_SP, T.FLAT_REGION_DECO_ALT, T.RAISED_REGION_DECO_ALT])
  A.mapTile(t, (k, x, y, c) => spColours.has(kit.hex(c)) ? R.oak(k.L) : null);

// ---------------------------------------------------------------- walls: glass facade over Altbau remains
const capTiles = [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 32),
  ...range(T.WALL_OVERHANG, 8), T.EXIT_UNDERHANG, T.UNLOCKED_EXIT, T.LOCKED_EXIT, T.CHASM_WALL];
for (const t of capTiles) A.mapTile(t, k => isStone(k) && k.kind !== 'floor' ? R.concrete(k.L) : null);
for (const t of [...range(T.RAISED_WALL, 16), ...range(T.RAISED_WALL_ALT, 16)]) A.mapTile(t, k => isStone(k) ? R.concrete(k.L) : null, [0, 4]);
for (const t of range(T.RAISED_WALL_DOOR, 4)) A.mapTile(t, k => isStone(k) ? R.concrete(k.L) : null);

function facade(x, y) {
  if (y === 4) return K.shadow;
  if (y === 5) return K.mull;
  if (y <= 9) {
    if (x % 4 === 0) return y === 9 ? K.mullD : K.mull;
    const d = (x - y + 32) % 8;
    return d === 0 || d === 1 ? K.glassHi : (x >> 2) % 2 ? K.glassB : K.glass;
  }
  if (y === 10) return K.slabEdge;
  if (y === 11) return x % 3 === 1 ? K.corniceD : K.cornice;     // old stucco cornice
  if (y === 12 || y === 14) return K.mortar;
  const off = y === 13 ? 0 : 2;
  if ((x + off) % 4 === 0) return K.mortar;
  return hash(x, y, 4) < 20 ? K.brickL : K.brick;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DECO, T.RAISED_WALL_ALT, T.RAISED_WALL_DECO_ALT]) A.face(base, facade);
A.addNoticeCells(); // new cells 104-107 (RAISED_WALL_NOTICE), see tools/lib/tileset-kit.cjs

// alt +0: fair-faced concrete panel with tie holes; +1: CCTV camera; +2: brass plaque (no text)
for (let y = 5; y <= 9; y++) for (let x = 0; x < 16; x++)
  A.solid(T.RAISED_WALL_ALT, x, y, x === 7 ? K.creteD : ((x === 3 || x === 11) && y === 7) ? K.tie : y === 5 ? K.slabEdge : K.crete);
A.stamp(T.RAISED_WALL_ALT + 1, 8, 5, ['.bcccc', '.bcccL', 'bb....'], {b: K.camD, c: K.cam, L: K.lens});
A.stamp(T.RAISED_WALL_ALT + 2, 5, 12, ['dddddd', 'dppppd', 'dddddd'], {d: K.plaqueD, p: K.plaque});
// Round 4 wall motifs (texts: levels.walldeco.*): a realtor board "zu vermieten" with a
// sprayed black X on the single pillar (+3), a pink "KIEZ" tag on RAISED_WALL_NOTICE
kit.wallMotif(A.endPaint(T.RAISED_WALL_ALT + 3), T.RAISED_WALL_ALT + 3, 'graffiti_vermieten');
for (let v = 0; v < 4; v++) kit.wallMotif(A.endPaint(T.RAISED_WALL_NOTICE + v), T.RAISED_WALL_NOTICE + v, 'graffiti_kiez');

// WALL_DECO keeps CityLevel's Smoke emitter: a louvred stainless exhaust vent
const VENT = ['kkkkkkkk', 'kvvvvvvk', 'kddddddk', 'kvvvvvvk', 'kddddddk', 'kvvvvvvk', 'kkkkkkkk'];
for (let v = 0; v < 4; v++) {
  A.stamp(T.RAISED_WALL_DECO + v, 4, 5, VENT, {k: K.ventK, v: K.vent, d: K.ventD});
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 4, 5, VENT, {k: K.ventK, v: K.vent, d: K.ventD});
}
for (const t of [T.FLAT_WALL_DECO, T.FLAT_WALL_DECO_ALT]) A.stamp(t, 4, 5, VENT, {k: K.ventK, v: K.vent, d: K.ventD});

// ---------------------------------------------------------------- doors: smoked glass + brass
const DOORS = [T.FLAT_DOOR, T.RAISED_DOOR, T.FLAT_DOOR_OPEN, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_SIDEWAYS, ...range(208, 12),
  T.DOOR_OVERHANG, T.DOOR_OVERHANG_OPEN, T.DOOR_SIDEWAYS, T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED];
for (const t of DOORS) A.mapTile(t, (k, x, y, c) => {
  if (k.kind === 'floor' || k.kind === 'black') return null;
  if (isGold(k)) return R.brass(k.L);
  if (k.L < 0x48) return R.smoked(k.L);
  return R.concrete(k.L);
});
for (const t of [T.FLAT_DOOR_CRYSTAL, T.RAISED_DOOR_CRYSTAL, ...range(220, 4), T.DOOR_OVERHANG_CRYSTAL, T.DOOR_SIDEWAYS_CRYSTAL])
  A.mapTile(t, k => k.kind === 'colour' && k.r >= k.b && !isGold(k) && k.kind !== 'floor' ? R.concrete(k.L) : null);
// padlocks stay readable: warm them to brass
for (const t of [T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED]) A.mapTile(t, (k, x, y) =>
  k.kind !== 'floor' && k.L >= 0x70 && x >= 4 && x <= 11 && y >= 3 ? R.brass(k.L) : null);

// ---------------------------------------------------------------- props
// REGION_DECO (Designerfeuerschale): corten steel bowl on a plinth; the alt one in anthracite
const decoMap = r => (k, x, y, c) => (k.kind === 'floor' || spColours.has(kit.hex(c))) ? null : r(k.L);
for (const t of [T.FLAT_REGION_DECO, T.RAISED_REGION_DECO, T.REGION_DECO_OVERHANG]) A.mapTile(t, decoMap(R.corten));
for (const t of [T.FLAT_REGION_DECO_ALT, T.RAISED_REGION_DECO_ALT, T.REGION_DECO_ALT_OVERHANG]) A.mapTile(t, decoMap(R.anthra));
// bookshelf: white lacquer shelving, the coffee-table books keep their colours
const woodish = (k, c) => k.kind === 'colour' && k.r > k.g && k.g > k.b && k.sat < 80 && k.sat > 18;
for (const t of [T.FLAT_BOOKSHELF, T.FLAT_BOOKSHELF_ALT, ...range(T.RAISED_WALL_BOOKSHELF, 4), ...range(T.RAISED_WALL_BOOKSHELF_ALT, 4),
  ...range(T.WALL_INTERNAL_WOODEN, 16), ...range(T.WALL_OVERHANG_WOODEN, 4)])
  A.mapTile(t, (k, x, y, c) => woodish(k, c) ? R.lacquer(k.L + 10) : (k.kind === 'grey' ? R.concrete(k.L) : null));
// barricade: stacked pallet lounge furniture in pale pine (still dry wood)
for (const t of [T.FLAT_BARRICADE, T.RAISED_BARRICADE, T.BARRICADE_OVERHANG]) A.mapTile(t, k => k.kind === 'colour' && k.kind !== 'floor' ? R.pine(k.L) : null);
// ramps / stairs: fair-faced concrete
for (const t of [T.ENTRANCE, T.EXIT, T.ENTRANCE_SP]) A.mapTile(t, (k, x, y, c) => isStone(k) && k.kind !== 'floor' && !spColours.has(kit.hex(c)) ? R.concrete(k.L) : null);

// Abgruende: nie fertig gebaute A100-Abschnitte (shared, tools/lib/tileset-kit.cjs)
kit.a100Chasm(A);
A.finish({stage: 3, water: path.join(kit.ROOT, 'core/src/main/assets/environment/water3.png')});
