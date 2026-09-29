// Kiez traps: every trap frame in environment/terrain_features.png becomes a dog-poop
// marker. Frame index (TerrainFeaturesTilemap / PrisonBossLevel.FadingTraps):
//   (trap.active ? trap.color : Trap.BLACK) + trap.shape * 16
// so rows 0-6 are the shapes and columns 0-8 the colours (column 8 = BLACK = triggered).
// The frames do not depend on the region. Colour = the poop's colour family; shape =
// the glyph on a little paper flag stuck in it. Triggered traps are a trampled, grey
// pancake with a shoe print, still carrying the (greyed) flag so the shape stays known.
// Only these 63 cells change; every other cell of terrain_features.png is left as is.
//   node tools/generate-kiez-traps.cjs [--preview DIR] [--out file.png]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const kit = require('./lib/tileset-kit.cjs');
const {rgb, mix, shade} = kit;

const argv = process.argv.slice(2);
const FILE = path.join(kit.ROOT, 'core/src/main/assets/environment/terrain_features.png');
const orig = kit.decodePNG(execFileSync('git', ['cat-file', 'blob', kit.FEATURES_BLOB], {cwd: kit.ROOT, maxBuffer: 1 << 24}));
const cur = fs.existsSync(FILE) ? kit.decodePNG(fs.readFileSync(FILE)) : orig;
const img = {w: 256, h: 256, px: Buffer.from(cur.px)};
const idx = (t, x, y) => ((((t >> 4) * 16 + y) * 256) + (t % 16) * 16 + x) * 4;
function set(t, x, y, c, a = 255) { if (x < 0 || y < 0 || x > 15 || y > 15) return; const i = idx(t, x, y); img.px[i] = c[0]; img.px[i + 1] = c[1]; img.px[i + 2] = c[2]; img.px[i + 3] = a; }

// Trap.java colour constants -> poop colour family (base tone)
const COLOURS = [
  ['RED', 'c8352e'], ['ORANGE', 'e07a22'], ['YELLOW', 'd9c23c'], ['GREEN', '3fae46'], ['TEAL', '46bcd6'],
  ['VIOLET', 'a25fd8'], ['WHITE', 'e4eef0'], ['GREY', '8d8984'],
];
const SHAPES = ['DOTS', 'WAVES', 'GRILL', 'STARS', 'DIAMOND', 'CROSSHAIR', 'LARGE_DOT'];
// 5x5 glyphs printed on the flag, modelled on the original trap patterns
const GLYPHS = [
  ['xx.xx', 'xx.xx', '.....', 'xx.xx', 'xx.xx'], // DOTS (four spots)
  ['.....', '.x...', 'x.x.x', '...x.', '.....'], // WAVES
  ['x..x.', '.x..x', '..x..', 'x..x.', '.x..x'], // GRILL (diagonal bars)
  ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'], // STARS (sparkle)
  ['..x..', '.x.x.', 'x...x', '.x.x.', '..x..'], // DIAMOND
  ['..x..', '..x..', 'xx.xx', '..x..', '..x..'], // CROSSHAIR (hollow centre)
  ['.....', '.xxx.', '.xxx.', '.xxx.', '.....'], // LARGE_DOT
];
// three-tier swirl, tip at the top; H = glint, d = crease, o = outline, s = soft shadow
const POOP = [
  '......oo........',
  '.....oCHo.......',
  '....ooCCCo......',
  '...oCHCCCdo.....',
  '...oCCCCCCo.....',
  '..oodddddCCoo...',
  '.oCCHCCCCCCCCo..',
  'oCCCCCCCCCCCCCo.',
  'oCCCCCCCCCCCCCo.',
  '.oooooooooooooss',
];
const PANCAKE = [ // trampled: flat, with a shoe-sole print
  '..oooooooooo....',
  '.oPPPPPPPPPPo...',
  'oPpPPpPPpPPPPo..',
  'oPPpPPpPPpPPPo..',
  '.oPPPPPPPPPPo...',
  '..oooooooooss...',
];
const FLAG = {paper: rgb('f3efe2'), paperShade: rgb('cfc8b4'), ink: rgb('2a2426'), stick: rgb('c9a46a'), stickDark: rgb('8a6a3a')};

function drawCell(t, base, trampled, shapeIdx) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) set(t, x, y, [0, 0, 0], 0);
  const b = rgb(base), light = mix(b, [255, 255, 255], 0.45), dark = shade(b, 0.62), line = mix(shade(b, 0.28), rgb('1c1210'), 0.5);
  const rust = rgb('b06a3a');
  if (!trampled) {
    const oy = 6, ox = 0;
    POOP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      let c = ch === 'C' ? b : ch === 'H' ? light : ch === 'd' ? dark : ch === 'o' ? line : null;
      if (ch === 'C' && base === '8d8984' && (x * 7 + y * 3) % 11 === 0) c = rust; // grey = rusty, as in the original
      if (ch === 's') return set(t, ox + x, oy + y, [0, 0, 0], 70);
      set(t, ox + x, oy + y, c);
    }));
    set(t, ox + 6, oy + 1, [255, 255, 255]); // glint
  } else {
    const g = rgb('4a4744'), gp = rgb('5c5854'), gd = rgb('34312f'), go = rgb('1e1c1b');
    PANCAKE.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (ch === 's') return set(t, 1 + x, 10 + y, [0, 0, 0], 70);
      set(t, 1 + x, 10 + y, ch === 'P' ? (x < 6 ? gp : g) : ch === 'p' ? gd : go);
    }));
  }
  // paper flag on a toothpick, top right; greyed and tilted-looking when trampled
  const fx = 10, fy = trampled ? 4 : 0;
  const paper = trampled ? rgb('9a968c') : FLAG.paper, pshade = trampled ? rgb('7c786f') : FLAG.paperShade;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) set(t, fx + x, fy + y, (y === 5 || x === 5) ? pshade : paper);
  GLYPHS[shapeIdx].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') set(t, fx + x, fy + y, trampled ? rgb('3a3634') : FLAG.ink); }));
  for (let y = fy + 6; y < (trampled ? 12 : 9); y++) set(t, fx, y, y % 2 ? FLAG.stick : FLAG.stickDark);
}

for (let s = 0; s < 7; s++) {
  COLOURS.forEach(([, base], c) => drawCell(s * 16 + c, base, false, s));
  drawCell(s * 16 + 8, '4a4744', true, s);
}

const oi = argv.indexOf('--out'), target = oi >= 0 ? argv[oi + 1] : FILE;
fs.writeFileSync(target, kit.encodePNG(img));
console.log('wrote ' + path.relative(process.cwd(), target));

const pi = argv.indexOf('--preview');
if (pi >= 0) {
  const dir = argv[pi + 1]; fs.mkdirSync(dir, {recursive: true});
  // 1) all colour x shape frames at 6x on a floor-grey background
  const s = 6, W = 9 * 16 * s, H = 7 * 16 * s, o = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((y / s | 0) * 256 + (x / s | 0)) * 4, j = (y * W + x) * 4, a = img.px[i + 3] / 255, bg = [86, 85, 79];
    for (let k = 0; k < 3; k++) o[j + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a)); o[j + 3] = 255;
  }
  fs.writeFileSync(path.join(dir, 'kiez-traps-6x.png'), kit.encodePNG({w: W, h: H, px: o}));
  // 2) level-1 mini map (current sewer atlas) with a few piles on it
  const sew = kit.decodePNG(fs.readFileSync(path.join(kit.ROOT, 'core/src/main/assets/environment/tiles_sewers.png')));
  const map = kit.miniMap(sew, idx, {water: path.join(kit.ROOT, 'core/src/main/assets/environment/water0.png')});
  const piles = [[3, 3, 0, 0], [5, 2, 3, 3], [9, 3, 4, 6], [11, 6, 5, 1], [2, 6, 1, 2], [6, 8, 8, 0], [12, 6, 6, 5]]; // x,y,colour,shape
  for (const [cx, cy, c, sh] of piles) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = idx(sh * 16 + c, x, y), a = img.px[i + 3] / 255; if (!a) continue;
    const j = ((cy * 16 + y) * map.w + cx * 16 + x) * 4;
    for (let k = 0; k < 3; k++) map.px[j + k] = Math.round(img.px[i + k] * a + map.px[j + k] * (1 - a));
  }
  const big = {w: map.w * 3, h: map.h * 3, px: Buffer.alloc(map.w * map.h * 36)};
  for (let y = 0; y < big.h; y++) for (let x = 0; x < big.w; x++) map.px.copy(big.px, (y * big.w + x) * 4, ((y / 3 | 0) * map.w + (x / 3 | 0)) * 4, ((y / 3 | 0) * map.w + (x / 3 | 0)) * 4 + 4);
  fs.writeFileSync(path.join(dir, 'kiez-traps-minimap-3x.png'), kit.encodePNG(big));
  console.log('previews in ' + dir);
}
