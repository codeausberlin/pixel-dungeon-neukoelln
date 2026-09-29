// "Tempelhofer Feld" (boss arena, floor 10, PrisonBossLevel): writes environment/tiles_tempelhof.png.
// Same 256x256 grid, cell functions and alpha as tiles_prison.png (DungeonTileSheet.java).
// Base: the Amt atlas from tools/generate-amt-tiles.cjs (run into a temp file, not changed),
// then floors, walls and wall decorations are repainted as airfield, meadow, limestone and fence.
// Props (cages, chair barricade, statue, grass) stay the Amt versions on purpose: since v4 the
// raised props come from terrain_features.png row 1, so the overhang cells here must match it.
//   node tools/generate-kiez-tempelhof.cjs [--preview DIR] [--out file.png]
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const kit = require('./lib/tileset-kit.cjs');
const {T, rgb, ramp, range, mix} = kit;

const A = kit.open({name: 'tiles_tempelhof.png', blob: '92356756990e6c0bf187d6fc4c272016e9de2dd3'});
for (const t of [T.FLOOR, T.FLOOR_ALT_1, T.FLOOR_ALT_2]) for (const c of A.tileColours(t)) A.floorSet.add(c);

// ---------------------------------------------------------------- base: the Amt atlas (building interior)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiez-tempelhof-'));
  const file = path.join(tmp, 'amt.png');
  execFileSync(process.execPath, [path.join(__dirname, 'generate-amt-tiles.cjs'), '--out', file], {cwd: kit.ROOT, stdio: 'ignore'});
  const amt = kit.decodePNG(fs.readFileSync(file));
  fs.rmSync(tmp, {recursive: true, force: true});
  amt.px.copy(A.out.px);
}

const P = {
  // Rollfeld
  asA: '4b4d52', asB: '47494e', asL: '55575c', asD: '3f4145', asSpeck: '5f6166', crack: '34363a', tar: '2c2d31',
  mark: 'e6e2d2', markD: 'b9b5a6', yel: 'd9b23c', yelD: '9c7e22',
  // Wiese
  g1: '6b9a3f', g2: '5e8a36', g3: '7fae4c', g4: '4d7430', gL: '9cc860', daisy: 'f4f1e4', dand: 'f2cc3a',
  // Kalkstein (Flughafengebaeude)
  kShadow: '6f644e', kCorn: 'e4dbc1', kStone: 'cbbd9b', kStoneL: 'd8cbab', kJoint: 'a39574', kPlinth: 'a99a78', kPlinthD: '8c7f62',
  win: '2f3a46', winL: '6d8a9e', winF: '8a7d60',
  // Zaun
  sky: 'a8d3ea', skyL: 'c7e4f3', far: '8cb85c', hedge: '4f7a34', hedgeD: '3f6429', wire: 'c3c9cc', wireD: '8e979b',
  post: '5c6368', postL: '8a9297', rail: '9aa2a7',
  // Deko
  red: 'd2412f', redD: '8f2a1f', ora: 'ee7d2a', white: 'f1efe6', blue: '3f6fc4', blueD: '2b4d8c', yellow: 'f0c93a',
  wood: 'a8743f', woodD: '744c26', woodL: 'c8955a', soil: '4a3222', leaf: '5aa33f', leafL: '86cf55', tom: 'e0503a',
  grill: '26272b', grillL: '4c4e55', grillH: '7c7f87', coal: '1b1b1d', ember: 'ff7a2e', ash: '8b8b86',
  sign: '2f8f55', signD: '1f6a3d',
};
const K = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, rgb(v)]));
const R = {
  cap: ramp([[0x00, '000000'], [0x30, '37312a'], [0x60, '7b705a'], [0x90, 'b6a988'], [0xb0, 'd1c5a4'], [0xc8, 'e0d6b9'], [0xe0, 'eee7cf']]),
  face: ramp([[0x00, '000000'], [0x30, '4a4232'], [0x60, '8f8266'], [0x90, 'bfb08e'], [0xb0, 'd6c9a8']]),
  lawn: ramp([[0x00, '1e2c12'], [0x30, '3d5a24'], [0x50, '5e8a36'], [0x70, '7fae4c'], [0x90, '9cc860']]),
};
const hash = (x, y, s = 0) => { let v = Math.imul(x + 11 + s, 374761393) ^ Math.imul(y + 7, 668265263); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) % 100; };
const isStone = k => k.kind === 'grey' || (k.kind === 'colour' && k.sat < 36);

// ---------------------------------------------------------------- floors: Rollfeld-Asphalt
// Seamless noise asphalt; ALT_1 (about half the cells) adds a faint repair seam, ALT_2 (rare)
// a painted runway marking. The marking is short, so random placement never forms fake lines.
function asphalt(t, seed) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const h = hash(x, y, seed), h2 = hash(x >> 1, y >> 1, seed + 5);
    let c = h2 < 50 ? K.asA : K.asB;
    if (h < 6) c = K.asSpeck; else if (h > 93) c = K.asD; else if (h > 88 && h2 > 60) c = K.asL;
    A.put(t, x, y, c);
  }
}
asphalt(T.FLOOR, 0); asphalt(T.FLOOR_ALT_1, 0); asphalt(T.FLOOR_ALT_2, 0);
A.stamp(T.FLOOR_ALT_1, 4, 9, ['tt.....', '.ttt...', '...tttt'], {t: K.asD});            // bitumen crack seal
A.stamp(T.FLOOR_ALT_1, 11, 3, ['c.', '.c'], {c: K.crack});
A.stamp(T.FLOOR_ALT_2, 3, 6, [                                                                              // runway dash + stub
  'DMMMMMMMMD',
  'MMMMMMMMMM',
  'DMMMMMMMMD',
], {M: K.mark, D: K.markD});
A.stamp(T.FLOOR_ALT_2, 12, 13, ['yyy', 'YYY'], {y: K.yel, Y: K.yelD});
A.substituteFloor();

// FLOOR_DECO: grass and dandelions pushing through the cracks. FLOOR_DECO_ALT: burnt square
// left by a disposable grill, charcoal crumbs and a bottle cap.
for (const t of [T.FLOOR_DECO, T.FLOOR_DECO_ALT]) A.copyTile(T.FLOOR, t);
A.stamp(T.FLOOR_DECO, 1, 2, [
  '.......c.......',
  '..g....c.......',
  '.gGg...cc......',
  '..g.....c...g..',
  '........c..gdg.',
  '....G...cc..g..',
  '...gGg...c.....',
  '....g....c..G..',
  '.........cc.g..',
  '..d.......c....',
  '.gGg...G..c....',
  '..g...gLg.cc...',
  '.......G...c...',
], {c: K.crack, g: K.g2, G: K.g1, L: K.gL, d: K.dand});
A.stamp(T.FLOOR_DECO_ALT, 3, 4, [
  '.aa.aa.a..',
  'aKKKKKKKa.',
  '.KkKKkKKa.',
  'aKKKkKKKK.',
  '.KKkKKKkKa',
  'aKKKKKkKK.',
  '.aKKKKKKa.',
  '..a.aa.a..',
], {K: K.tar, k: K.coal, a: K.ash});
A.stamp(T.FLOOR_DECO_ALT, 5, 6, ['e...', '..e.', '.e..'], {e: K.ember});
A.stamp(T.FLOOR_DECO_ALT, 12, 12, ['.y.', 'yYy', '.y.'], {y: K.yellow, Y: K.yelD});

// FLOOR_SP (EMPTY_SP): Wiese, with a few daisies
const spColours = A.tileColours(T.FLOOR_SP);
for (const t of [T.FLOOR_SP, T.FLOOR_SP_ALT]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const h = hash(x, y, t + 3), h2 = hash(x >> 1, y, t);
  let c = h2 < 45 ? K.g1 : K.g2;
  if (h < 12) c = K.g3; else if (h > 90) c = K.g4;
  if ((x + 3 * y) % 7 === 0 && h < 40) c = K.gL; // blades
  A.put(t, x, y, c);
}
A.stamp(T.FLOOR_SP, 4, 5, ['.w.', 'wdw', '.w.'], {w: K.daisy, d: K.dand});
A.stamp(T.FLOOR_SP_ALT, 10, 9, ['.w.', 'wdw', '.w.'], {w: K.daisy, d: K.dand});
A.stamp(T.FLOOR_SP_ALT, 2, 2, ['d'], {d: K.dand});
for (const t of [T.CHASM_FLOOR_SP, T.ENTRANCE_SP, T.FLAT_STATUE_SP, T.RAISED_STATUE_SP])
  A.mapTile(t, (k, x, y, c) => spColours.has(kit.hex(c)) ? A.outRGB(T.FLOOR_SP, x, y) : null);

// water edges: the rim becomes wet, darker asphalt (the puddle itself is water1.png)
for (const t of range(T.WATER, 16)) A.mapTile(t, k => k.kind !== 'floor' && isStone(k) ? mix(R.cap(k.L), K.tar, 0.72) : null);

// ---------------------------------------------------------------- walls: Kalkstein caps
const capTiles = [T.FLAT_WALL, T.FLAT_WALL_DECO, T.FLAT_WALL_ALT, T.FLAT_WALL_DECO_ALT, ...range(T.WALLS_INTERNAL, 32),
  ...range(T.WALL_OVERHANG, 8), T.EXIT_UNDERHANG, T.UNLOCKED_EXIT, T.LOCKED_EXIT];
for (const t of capTiles) A.mapTile(t, k => isStone(k) ? R.cap(k.L) : null);
for (const t of [...range(T.RAISED_WALL, 16), ...range(T.RAISED_WALL_ALT, 16)]) A.mapTile(t, k => isStone(k) ? R.cap(k.L) : null, [0, 4]);
for (const t of [...range(T.RAISED_WALL_DOOR, 4), T.CHASM_WALL]) A.mapTile(t, (k, x, y) => isStone(k) ? (y < 4 && t !== T.CHASM_WALL ? R.cap(k.L) : R.face(k.L)) : null);

// wall face A: limestone ashlar of the airport building, cornice line, darker plinth
function limestone(x, y) {
  if (y === 4) return K.kShadow;
  if (y === 5) return K.kCorn;
  if (y >= 14) return y === 14 ? K.kPlinth : K.kPlinthD;
  if (y === 9 || y === 13) return K.kJoint;
  const row = y < 9 ? 0 : 1, jx = row ? 11 : 4;
  if (x === jx) return K.kJoint;
  if (y === 6 || y === 10) return K.kStoneL;
  return hash(x, y, 9) < 5 ? K.kJoint : K.kStone;
}
// wall face B: chain-link fence of the field, sky and meadow behind, low limestone curb
function fence(x, y) {
  if (y === 4) return K.post;
  if (y === 5) return K.rail;
  if (y >= 14) return y === 14 ? K.kPlinth : K.kPlinthD;
  if (y === 13) return K.post;
  if (x === 0) return K.post;
  if (x === 1) return K.postL;
  const bg = y <= 8 ? (y === 6 && hash(x, 0, 2) < 40 ? K.skyL : K.sky) : y <= 10 ? K.far : (hash(x, y, 4) < 20 ? K.hedgeD : K.hedge);
  if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) return y <= 8 ? K.wireD : K.wire;
  return bg;
}
for (const base of [T.RAISED_WALL, T.RAISED_WALL_DECO]) A.face(base, limestone);
for (const base of [T.RAISED_WALL_ALT, T.RAISED_WALL_DECO_ALT]) A.face(base, fence);

// details that only show at wall ends (+1 right end, +2 left end, +3 both), as in the Amt set
// limestone: a tall window on the building
A.stamp(T.RAISED_WALL + 1, 6, 6, ['fffff', 'fwWwf', 'fwWwf', 'fwwwf', 'fwWwf', 'fwwwf', 'fffff'], {f: K.winF, w: K.win, W: K.winL});
A.stamp(T.RAISED_WALL + 2, 5, 6, ['fffff', 'fwWwf', 'fwWwf', 'fwwwf', 'fwWwf', 'fwwwf', 'fffff'], {f: K.winF, w: K.win, W: K.winL});
// fence +1: windsock on its mast behind the fence
A.stamp(T.RAISED_WALL_ALT + 1, 6, 5, [
  '.mRRWWRRo..',
  '.mRRWWRRWo.',
  '.m.RWWRR...',
  '.m.........',
  '.m.........',
  '.m.........',
  '.m.........',
  '.m.........',
], {m: K.post, R: K.ora, W: K.white, o: K.redD});
// fence +2: kite surfer's kite in the sky, lines going down behind the hedge
A.stamp(T.RAISED_WALL_ALT + 2, 3, 6, [
  '.bBBBBBb..',
  'bBYYYYYBb.',
  'l.......l.',
  '.l.....l..',
  '..l...l...',
  '...l.l....',
  '....l.....',
], {b: K.blueD, B: K.blue, Y: K.yellow, l: K.white});
// fence +3: urban-gardening crate standing in front of the fence
A.stamp(T.RAISED_WALL_ALT + 3, 3, 7, [
  '...L.lL..L..',
  '..LlL.l.LtL.',
  '.lL.lLtLl.l.',
  'ssssssssssss',
  'WWWWWWWWWWWW',
  'wwwwwwwwwwww',
  'WWWWWWWWWWWW',
  'dddddddddddd',
], {L: K.leafL, l: K.leaf, t: K.tom, s: K.soil, W: K.woodL, w: K.wood, d: K.woodD});

// WALL_DECO keeps the Torch emitter (flame at tile centre + 2px): a kettle grill on the Grillplatz.
// Limestone variant with a green pictogram sign (no text), fence variant with the grill alone.
const GRILL = [
  '...hhhhhh...',
  '..eEeEEeEe..',
  '.kgggggggggk',
  '..gGGGGGGg..',
  '...gGGGGg...',
  '....gggg....',
  '....h..h....',
  '...h....h...',
  '..h......h..',
];
for (let v = 0; v < 4; v++) {
  for (const base of [T.RAISED_WALL_DECO, T.RAISED_WALL_DECO_ALT])
    A.stamp(base + v, 2, 7, GRILL, {h: K.grillH, e: K.ember, E: K.yellow, k: K.coal, g: K.grill, G: K.grillL});
  A.stamp(T.RAISED_WALL_DECO + v, 11, 5, ['SSSS', 'SwwS', 'SwwS', 'SSSS', '.p..'], {S: K.sign, w: K.white, p: K.post});
}
for (const t of [T.FLAT_WALL_DECO, T.FLAT_WALL_DECO_ALT]) A.stamp(t, 5, 6, ['eEEe', 'gggg', '.gg.'], {e: K.ember, E: K.yellow, g: K.grill});

// ---------------------------------------------------------------- preview mini map: arena on the field
const ARENA = [
  'WWWWWWWWWWWWWWWW',
  'WWWWWDWWWWDWWWWW',
  'WWW...,....ssWWW',
  'WW..ss..~~..,.WW',
  'W<..sss.~~~....W',
  'W...ss.....e...W',
  'W..,.......ss..W',
  'WW....ss..>...WW',
  'WWW..ssss....WWW',
  'WWWWWdWWWWWWWWWW',
  'W....WW..,..WW.W',
  'WWWWWWWWWWWWWWWW',
];
A.finish({map: ARENA, water: path.join(kit.ROOT, 'core/src/main/assets/environment/water1.png')});
