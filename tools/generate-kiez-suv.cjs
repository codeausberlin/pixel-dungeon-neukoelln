// Boss Ebene 10 (Tempelhofer Feld): der SUV. Replaces sprites/tengu.png with an original,
// fully redrawn pixel SUV (no real make, no logo, no grille replica). Pure Node (zlib via
// tools/lib/tileset-kit.cjs), no npm packages, no randomness: two runs write byte-identical files.
//
//   node tools/generate-kiez-suv.cjs                 write sprites/tengu.png
//   node tools/generate-kiez-suv.cjs --preview DIR   also write x8 before/after previews
//
// Frame contract (TenguSprite.java, unchanged): TextureFilm 14x16 on the upstream 256x16 sheet.
//   idle   0,0,0,1        1 = hazard lights on (Warnblinker)
//   run    2,3,4,5,0      played after every move and every teleport ("umparken"): exhaust cloud
//                         hides the arrival (2,3), then the wheels turn and the body settles (4,5)
//   attack 6,7,7,0 / zap  Lichthupe: headlights flare, light spills over the front edge
//   die    8,9,10...      tyres go flat, bonnet pops open, engine smoke; 10 is held
// The car faces right like the upstream Tengu, wheels stand on row 15 (upstream foot line).
// The thrown missile (TenguShuriken = ItemSpriteSheet.SHURIKEN in items.png) is not in this sheet.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'core/src/main/assets/sprites/tengu.png');
const UPSTREAM = '4256b22:core/src/main/assets/sprites/tengu.png';
const FW = 14, FH = 16, W = 256, H = 16, FRAMES = 11;
const argv = process.argv.slice(2);

const PAL = {
  o: '15161e',                                  // outline
  B: '5a6886', b: '3a4460', h: '8e9cb8',       // body: dark steel-blue metallic, shade, shine
  W: '161a26', w: '7890b8',                     // tinted glass, sheen
  R: 'a4acb8', r: '767e8c',                     // roof box
  t: '2c2c34', T: '62626e', s: 'c4ccd4',       // tyre, tread mark (spins), hub
  L: 'e8e0a8', l: 'fffbe6', y: 'fff0a0',       // headlight, flashing headlight, light spill
  Q: 'b82c2c',                                  // rear light
  a: '8a5a1e', A: 'ffb030',                     // hazard light off / on
  C: 'aab2bc',                                  // bumper trim
  g: '8a867c', G: 'b6b2a6', H: 'dedad0',       // exhaust / engine smoke
};

// ---------------------------------------------------------------- the car (rows 2..11)
const BODY = [
  '...ooooooooo..', // 2  roof box
  '...oRRRRRRRo..', // 3
  '...orrrrrrro..', // 4
  '.ooooooooooo..', // 5  roof rails
  '.ohhhhhhhhho..', // 6  roof
  '.oBWwWbWWwWo..', // 7  tinted windows, windscreen slopes to the front
  '.oBWWwbWWWwWo.', // 8
  'obBBBBBBBBBBBo', // 9  bonnet line
  'oQBBBBbBBBBBLo', // 10 rear light, door seam, headlight
  'oabbbbbbbbbbao', // 11 hazard lights both ends
];
// wheel: 5 wide, tread mark position cycles through the tyre ring (spin phase 0..3)
const RING = [[2, 0], [3, 1], [2, 2], [1, 1]]; // top, front, bottom, rear (inside 'ottto' box)
function wheel(g, x, y, phase, flat = 0) {
  if (flat === 0) {
    stamp(g, x, y, ['ottto', 'otsto', 'ottto', '.ooo.']);
    const [dx, dy] = RING[phase & 3]; put(g, x + dx, y + dy, 'T');
  } else if (flat === 1) stamp(g, x, y + 1, ['ottto', 'otsto', 'ooooo']);
  else stamp(g, x - 1, y + 2, ['.otsto.', 'ottttto']);
}

// ---------------------------------------------------------------- tiny painter
const grid = () => Array.from({length: FH}, () => Array(FW).fill(null));
function put(g, x, y, k) { if (x >= 0 && y >= 0 && x < FW && y < FH) g[y][x] = k; }
function stamp(g, ox, oy, rows) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (ch === '_') { put(g, ox + x, oy + y, null); return; }
    if (!PAL[ch]) throw new Error('no colour for ' + ch);
    if (ox + x < 0 || oy + y < 0 || ox + x >= FW || oy + y >= FH) throw new Error('frame overflow at ' + (ox + x) + ',' + (oy + y));
    put(g, ox + x, oy + y, ch);
  }));
}
function car(g, {dy = 0, phase = 0, flat = 0, hazard = false} = {}) {
  stamp(g, 0, 2 + dy, BODY.map(r => hazard ? r.replace(/a/g, 'A') : r));
  wheel(g, 1, 12, phase, flat); wheel(g, 8, 12, phase + 1, flat);
}
// smoke: union of discs, lit from the upper left (H), rim at the lower right (g)
function cloud(g, discs) {
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const px = x + 0.5, py = y + 0.5;
    const d = discs.filter(([cx, cy, r]) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r);
    if (!d.length) continue;
    const [cx, cy, r] = d[d.length - 1];              // the disc drawn last lies on top
    const t = ((px - cx) + (py - cy)) / r;            // -1.4 upper left .. +1.4 lower right
    put(g, x, y, t > 0.55 ? 'g' : t < -0.35 ? 'H' : 'G');
  }
}
const F = [];
// 0 idle, 1 hazard lights blink
F[0] = g => car(g);
F[1] = g => car(g, {hazard: true});
// 2-5 run / umparken: exhaust cloud hides the arrival, then wheels spin and the body settles
F[2] = g => { car(g, {phase: 0}); cloud(g, [[2, 7, 2.4], [6, 5, 3], [10, 6.5, 2.6], [3.5, 11.5, 3.4], [8.5, 11, 3.6], [11.5, 13, 2.4]]); };
F[3] = g => { car(g, {phase: 1}); cloud(g, [[2, 12, 2.8], [4.5, 14, 2], [1, 8.5, 1.8]]); };
F[4] = g => { car(g, {dy: 1, phase: 2}); cloud(g, [[1, 12.5, 1.6]]); };
F[5] = g => { car(g, {phase: 3}); put(g, 0, 10, 'G'); };
// 6-7 attack: Lichthupe
F[6] = g => { car(g, {hazard: true}); put(g, 12, 10, 'l'); put(g, 13, 10, 'y'); };
F[7] = g => {
  car(g, {hazard: true}); put(g, 12, 10, 'l'); put(g, 11, 10, 'y');
  put(g, 13, 9, 'y'); put(g, 13, 10, 'l'); put(g, 13, 11, 'y'); put(g, 13, 7, 'y'); put(g, 13, 13, 'y');
  put(g, 10, 7, 'l'); put(g, 11, 8, 'y');                                  // glare on the windscreen
};
// 8-10 die: tyres go flat, bonnet pops open, engine smoke
F[8] = g => { car(g, {dy: 1, flat: 1, hazard: true}); cloud(g, [[12.5, 8.5, 1.4]]); };
const BONNET = ['.oo', 'oho', 'oBo', 'oBo', '.o.']; // bonnet lid standing open, hinged at the windscreen
F[9] = g => {
  car(g, {dy: 2, flat: 2});
  stamp(g, 11, 6, BONNET); stamp(g, 12, 11, ['t']);
  cloud(g, [[12, 5.5, 2.2], [10, 2.5, 2], [12.5, 1.5, 1.4]]);
};
F[10] = g => {
  car(g, {dy: 2, flat: 2, hazard: true});
  stamp(g, 11, 6, BONNET); stamp(g, 12, 11, ['t']);
  cloud(g, [[12.5, 5.5, 1.6], [11, 2.5, 1.5], [12.5, 0.8, 1]]);
};

// ---------------------------------------------------------------- render
const out = {w: W, h: H, px: Buffer.alloc(W * H * 4)};
for (let f = 0; f < FRAMES; f++) {
  const g = grid(); F[f](g);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const k = g[y][x]; if (!k) continue;
    const c = rgb(PAL[k]), i = (y * W + f * FW + x) * 4;
    out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; out.px[i + 3] = 255;
  }
}
const src = decodePNG(execFileSync('git', ['show', UPSTREAM], {cwd: ROOT, maxBuffer: 1 << 24}));
if (src.w !== W || src.h !== H) throw new Error('upstream tengu.png is ' + src.w + 'x' + src.h);
const png = encodePNG(out);
if (Buffer.compare(decodePNG(png).px, out.px) !== 0) throw new Error('PNG round trip mismatch');
fs.writeFileSync(OUT, png);
console.log('sprites/tengu.png  ' + W + 'x' + H + '  frame ' + FW + 'x' + FH + '  ' + FRAMES + ' frames (SUV)');

const pi = argv.indexOf('--preview');
if (pi >= 0) {
  const dir = path.resolve(argv[pi + 1]); fs.mkdirSync(dir, {recursive: true});
  const Z = 8, gap = 4, cw = FW * Z + gap, rh = FH * Z + gap;
  const c = {w: FRAMES * cw, h: 2 * rh, px: Buffer.alloc(FRAMES * cw * 2 * rh * 4)};
  for (let i = 0; i < c.w * c.h; i++) c.px.writeUInt32BE(0x202028ff, i * 4);
  [src, out].forEach((img, row) => {
    for (let f = 0; f < FRAMES; f++) for (let y = 0; y < FH * Z; y++) for (let x = 0; x < FW * Z; x++) {
      const sx = f * FW + (x / Z | 0), sy = y / Z | 0, i = (sy * W + sx) * 4, a = img.px[i + 3] / 255;
      const bg = (((x / Z | 0) + sy) & 1) ? [96, 110, 70] : [106, 120, 78]; // Tempelhofer Wiese
      const q = ((row * rh + y) * c.w + f * cw + x) * 4;
      for (let k = 0; k < 3; k++) c.px[q + k] = Math.round(img.px[i + k] * a + bg[k] * (1 - a));
      c.px[q + 3] = 255;
    }
  });
  fs.writeFileSync(path.join(dir, 'tengu-suv-x8.png'), encodePNG(c));
  console.log('preview in ' + dir);
}
