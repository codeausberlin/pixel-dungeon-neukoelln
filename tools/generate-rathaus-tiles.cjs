// "Unter dem Rathaus" (floors 21-25): rebuilds environment/tiles_halls.png from the
// upstream halls atlas and writes feature row 4. Grid, cell functions and alpha stay
// identical (checked on write).
//   node tools/generate-rathaus-tiles.cjs [--preview DIR] [--source orig.png] [--out file.png]
'use strict';
const path = require('node:path');
const kit = require('./lib/tileset-kit.cjs');
const {T, rgb, ramp, range, shade, mix} = kit;

const A = kit.open({name: 'tiles_halls.png', blob: 'dd53fe5fecd0c500bac5b6118e5f8acf44b39623'});
for (const t of [T.FLOOR, T.FLOOR_ALT_1, T.FLOOR_ALT_2]) for (const c of A.tileColours(t)) A.floorSet.add(c);

const K = Object.fromEntries(Object.entries({
  shadow: '1c1414', sims: 'b39a72', simsLight: 'c9b288', simsDark: '7a6548', simsShadow: '3a2c24',
  brick: '5e2a22', brickL: '6e3328', brickD: '4c211b', mortar: '2e1a17',
  shaft: '120c0b', cabin: '6b4526', cabinL: '8a5c33', cabinD: '43291a', lamp: 'ffd27a', lampD: 'c9953f', chain: '8a8378',
  paper: 'e6ddc4', paperD: 'bfb498', paperE: '8d846c', fRed: '9a3030', fBlue: '34507c', fGreen: '3f6a42', fGrey: '6b6862',
}).map(([k, v]) => [k, rgb(v)]));
const R = {
  sand: ramp([[0x00, '000000'], [0x30, '2c231d'], [0x50, '4d3f32'], [0x70, '75634d'], [0x90, '9c8666'], [0xb0, 'bba27c'], [0xd0, 'd6c29c']]),
  oak: ramp([[0x00, '0e0805'], [0x20, '2a180d'], [0x40, '4a2c16'], [0x60, '6e4322'], [0x80, '8f5b30'], [0xa0, 'ad7443']]),
  brass: ramp([[0x30, '4a3a14'], [0x60, '8a6a26'], [0x90, 'c49a3e'], [0xb8, 'e8cc6a']]),
};
const hash = (x, y, s = 0) => { let v = Math.imul(x + 19 + s, 374761393) ^ Math.imul(y + 23, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const isStone = k => k.kind === 'grey' || (k.kind === 'colour' && k.sat < 40);

// floors: the dark hex slabs with glowing red cracks already read as "Glut aus dem Boden";
// they stay, only the ember deco is pushed a little brighter so the glow reads at zoom 1.
for (const t of [T.FLOOR_DECO, T.FLOOR_DECO_ALT]) A.mapTile(t, (k, x, y, c) => k.kind === 'colour' && c[0] > c[1] + 60 ? mix(c, rgb('ff5a2a'), 0.35) : null);

// ---------------------------------------------------------------- walls: Rathaus clinker + sandstone
const capTiles = [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 32),
  ...range(T.WALL_OVERHANG, 8), T.EXIT_UNDERHANG, T.UNLOCKED_EXIT, T.LOCKED_EXIT, T.CHASM_WALL];
for (const t of capTiles) A.mapTile(t, k => isStone(k) ? R.sand(k.L) : null);
for (const t of [...range(T.RAISED_WALL, 16), ...range(T.RAISED_WALL_ALT, 16)]) A.mapTile(t, k => isStone(k) ? R.sand(k.L) : null, [0, 4]);
for (const t of range(T.RAISED_WALL_DOOR, 4)) A.mapTile(t, k => isStone(k) ? R.sand(k.L) : null);

function rathaus(x, y) {
  if (y === 4) return K.shadow;
  if (y === 5) return K.simsLight;              // sandstone cornice
  if (y === 6) return x % 4 === 3 ? K.simsDark : K.sims;
  if (y === 7) return K.simsShadow;
  if (y === 10 || y === 13) return K.mortar;     // dark red clinker, two-row courses
  const off = (y < 10 || y > 13) ? 0 : 2;
  if ((x + off) % 4 === 3) return K.mortar;
  if (y === 8 || y === 11 || y === 14) return hash((x + off) >> 2, y, 1) < 30 ? K.brickL : K.brick;
  return hash((x + off) >> 2, y, 2) < 25 ? K.brickD : K.brick;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DECO, T.RAISED_WALL_ALT, T.RAISED_WALL_DECO_ALT]) A.face(base, rathaus);
// alt faces: a sandstone keystone medallion (+0), iron wall anchors at the wall ends
A.stamp(T.RAISED_WALL_ALT, 6, 9, ['.ss.', 'sSSs', '.ss.'], {s: K.simsDark, S: K.sims});
A.stamp(T.RAISED_WALL_ALT + 1, 11, 10, ['kkk', '.k.'], {k: K.shaft});
A.stamp(T.RAISED_WALL_ALT + 2, 2, 10, ['kkk', '.k.'], {k: K.shaft});

// WALL_DECO (was a stained-glass window): Paternoster shafts. Main: a lit cabin passing;
// alt: the gap between two cabins, only the chain and a cabin floor showing.
const PATER = [
  'dddddddddd',
  'dSSSSSSSSd',
  'dSccLLccSd',
  'dSccccccSd',
  'dScCCCCcSd',
  'dSCCCCCCSd',
  'dSddddddSd',
  'dSSSSSSSSd',
];
const PATER_GAP = [
  'dddddddddd',
  'dSccccccSd',
  'dSddddddSd',
  'dSSShhSSSd',
  'dSSShhSSSd',
  'dSSShhSSSd',
  'dSccLLccSd',
  'dSccccccSd',
];
const PK = {d: K.simsDark, S: K.shaft, c: K.cabin, C: K.cabinL, L: K.lamp, h: K.chain};
for (let v = 0; v < 4; v++) {
  A.stamp(T.RAISED_WALL_DECO + v, 3, 7, PATER, PK);
  A.stamp(T.RAISED_WALL_DECO_ALT + v, 3, 7, PATER_GAP, PK);
}
A.stamp(T.FLAT_WALL_DECO, 3, 4, PATER, PK); A.stamp(T.FLAT_WALL_DECO_ALT, 3, 4, PATER_GAP, PK);
for (const t of [...range(T.WALL_INTERNAL_DECO, 16), ...range(T.WALL_OVERHANG_DECO, 4)]) A.mapTile(t, k => k.kind === 'colour' && k.sat >= 40 ? R.sand(k.L) : null);

// ---------------------------------------------------------------- doors: heavy oak Rathaus doors
const DOORS = [T.FLAT_DOOR, T.RAISED_DOOR, T.FLAT_DOOR_OPEN, T.RAISED_DOOR_OPEN, T.RAISED_DOOR_SIDEWAYS, ...range(208, 12),
  T.DOOR_OVERHANG, T.DOOR_OVERHANG_OPEN, T.DOOR_SIDEWAYS, T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED];
const LOCKS = [T.FLAT_DOOR_LOCKED, T.RAISED_DOOR_LOCKED, T.DOOR_SIDEWAYS_LOCKED];
for (const t of DOORS) A.mapTile(t, (k, x, y, c) => {
  if (k.kind === 'floor' || k.kind === 'black') return null;
  const green = c[1] > c[0] + 10;                       // vine-covered door leaf
  if (green) return hash(x, y, t) < 12 ? R.brass(k.L + 40) : R.oak(k.L + 10);
  if (k.kind === 'colour' && k.sat >= 40) return R.oak(k.L);
  if (LOCKS.includes(t) && x >= 4 && x <= 11 && y >= 3 && k.L > 0x60) return R.brass(k.L);
  return isStone(k) ? R.sand(k.L) : null;
});
for (const t of [T.FLAT_DOOR_CRYSTAL, T.RAISED_DOOR_CRYSTAL, ...range(220, 4), T.DOOR_OVERHANG_CRYSTAL, T.DOOR_SIDEWAYS_CRYSTAL])
  A.mapTile(t, k => k.kind === 'grey' || (k.kind === 'colour' && k.sat < 25) ? R.sand(k.L) : null);

// ---------------------------------------------------------------- props
// barricade -> Aktenberg: stacked files, bone dry, still burns
const STACK = ['paper', 'paperD', 'paper', 'paperE'];
const FOLD = [K.fRed, K.fBlue, K.fGreen, K.fGrey];
function akten(t, fromY) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (A.alphaAt(t, x, y) !== 255) continue;
    if (y < fromY) continue;
    const pile = x < 7 ? 0 : 1, top = pile ? fromY + 2 : fromY;
    if (y < top || x === 7 || x === 0 || x === 15) { if (t !== T.BARRICADE_OVERHANG) A.put(t, x, y, A.outRGB(T.FLOOR, x, y)); continue; }
    const layer = (y - top) % 5;
    const c = layer === 4 ? FOLD[(x >> 2) % 4 + pile & 3] : K[STACK[layer % 4]];
    A.put(t, x, y, x === 1 || x === 8 ? shade(c, 0.8) : c);
  }
}
akten(T.FLAT_BARRICADE, 1); akten(T.RAISED_BARRICADE, 0);
for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (A.alphaAt(T.BARRICADE_OVERHANG, x, y) === 255) {
  const pile = x < 7 ? 0 : 1, top = pile ? 12 : 10;
  A.put(T.BARRICADE_OVERHANG, x, y, (y >= top && x !== 7 && x !== 0 && x !== 15) ? K[STACK[(y - top) % 4]] : A.outRGB(T.FLOOR, x, y));
}
// REGION_DECO (Rathausbrocken): a broken sandstone foundation block
for (const t of [T.FLAT_REGION_DECO, T.FLAT_REGION_DECO_ALT, T.RAISED_REGION_DECO, T.RAISED_REGION_DECO_ALT, T.REGION_DECO_OVERHANG, T.REGION_DECO_ALT_OVERHANG])
  A.mapTile(t, k => k.kind !== 'floor' && k.kind !== 'black' && isStone(k) && k.L > 0x2a ? R.sand(k.L) : null);
// stairs: sandstone steps
for (const t of [T.ENTRANCE, T.EXIT, T.ENTRANCE_SP]) A.mapTile(t, k => k.kind !== 'floor' && isStone(k) ? R.sand(k.L) : null);

A.finish({stage: 4, water: path.join(kit.ROOT, 'core/src/main/assets/environment/water4.png')});
