// Herr Fuß (actors.mobs.gasalchemist, sprites/gas-alchemist.png): original fictional pixel art,
// redrawn from scratch in round 3. No wheelchair, no apparatus, no bottles or hoses: Herr Fuß is
// the eccentric neighbour from the ground floor who simply smells. Bald top with a grey fringe,
// grey moustache, a content look, a white ribbed undershirt with one mustard stain, grey jogging
// trousers, white tennis socks with a red ring in open brown sandals. Yellow-green stink lines
// rise from him, above all from his feet. Only the smell is the joke (a pun on his name), not
// poverty: the clothes are clean-ish house clothes, he is a neighbour, not someone in need.
//
// Pure Node (zlib via tools/lib/tileset-kit.cjs), no randomness: two runs write identical files.
//   node tools/generate-gas-alchemist.cjs                 write sprites/gas-alchemist.png
//   node tools/generate-gas-alchemist.cjs --preview DIR   also write an x8 preview of all frames
//
// Frame contract: GasAlchemistSprite extends GnollSprite (TextureFilm 12x15, sheet 256x64):
//   idle 0,0,0,1,0,0,1,1   1 = the stink lines drift and he wiggles his toes
//   attack 2,3,0           2 = lifts the front foot, 3 = puts it down, a stink burst to the front
//   run 4,5,6,7            walk cycle, stink trail behind him
//   die 8,9,10             he sits down on the floor, the smell stays
// Faces right like the upstream gnoll, feet on row 14.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {decodePNG, encodePNG, rgb} = require('./lib/tileset-kit.cjs');

const OUT = path.join(__dirname, '../core/src/main/assets/sprites/gas-alchemist.png');
const W = 256, H = 64, FW = 12, FH = 15, FRAMES = 11;
const PAL = {
  o: '2a2830',                                   // outline
  S: 'eab892', s: 'c28a68', E: '2a2230',         // skin, skin shade, eye
  h: 'c9c5bd', M: '9a948e',                      // grey fringe, moustache
  W: 'eeede4', w: 'c8c6ba', Y: 'c9a23c',         // ribbed undershirt, rib shade, mustard stain
  J: '727686', j: '50546a',                      // jogging trousers
  T: 'f6f4ec', R: 'd04a3a',                      // tennis socks, red ring
  B: 'a26e38', b: '6c4622',                      // sandals
  g: 'd2ea5c', G: '9cbc36',                      // stink: light, dark
};

// ---------------------------------------------------------------- parts
const HEAD = [ // drawn at x 2, rows 0..5: bald top, grey fringe at the back, bushy brow
  '..oooo...',
  '.oSSSSo..',
  'ohSShSSo.',
  'ohSSESSo.',
  'ohsSSSSSo',
  '.ooSSMMo.',
];
const TORSO = { // rows 6..9, x 1..10
  down: [
    '.oSWSSWSo.',
    'oSSwWwWWSo',
    'oSWWYWwWSo',
    '.oSwWWWSo.',
  ],
  up: [ // front arm raised a little (attack wind-up, balancing on one foot)
    '.oSWSSWSoo',
    'oSSwWwWWSS',
    'oSWWYWwWo.',
    '.o.wWWWo..',
  ],
};
const LEGS = { // rows 10..14, x 2..9
  stand: [
    '.oJJJJo.',
    '.oJjJJo.',
    '.oJoJJo.',
    '.oToRTo.',
    'oBTBBTBo',
  ],
  lift: [ // front foot up, toes wiggling
    '.oJJJJoo',
    '.oJjJTRo',
    '.oJooTBo',
    '.oRo..o.',
    'oBTBo...',
  ],
  walkA: [ // front leg forward
    '.oJJJJo.',
    '.oJjoJJo',
    'oJo.oRTo',
    'oTRo.oTB',
    'oBBo.oBB',
  ],
  walkB: [ // legs passing
    '.oJJJJo.',
    '.oJjJJo.',
    '..oJJo..',
    '..oRTo..',
    '.oBTBBo.',
  ],
  walkC: [ // back leg forward
    '.oJJJJo.',
    'oJJojJo.',
    'oTRo.oJo',
    'BTo..oRT',
    'BBo..oBB',
  ],
};
// ---------------------------------------------------------------- tiny painter
const grid = () => Array.from({length: FH}, () => Array(FW).fill(null));
function stamp(g, ox, oy, rows) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    if (!PAL[ch]) throw new Error('no colour for ' + ch);
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= FW || Y >= FH) throw new Error('frame overflow at ' + X + ',' + Y);
    g[Y][X] = ch;
  }));
}
// a stink line: a small wavy column of pixels, dark at the bottom, light at the top
function stink(g, x, y, len, phase) {
  for (let i = 0; i < len; i++) {
    const X = x + (((i + phase) >> 1) & 1), Y = y - i;
    if (X < 0 || Y < 0 || X >= FW || Y >= FH || g[Y][X]) continue;
    g[Y][X] = i < len / 2 ? 'G' : 'g';
  }
}
function figure(g, {dy = 0, torso = 'down', legs = 'stand', eye = true}) {
  const head = eye ? HEAD : HEAD.map(r => r.replace('E', 's'));
  stamp(g, 2, dy, head);
  stamp(g, 1, 6 + dy, TORSO[torso]);
  stamp(g, 2, 10, LEGS[legs]);
}

const F = [];
F[0] = g => { figure(g, {}); stink(g, 1, 13, 3, 0); stink(g, 10, 13, 3, 1); stink(g, 11, 4, 2, 0); };
F[1] = g => { figure(g, {eye: false}); stink(g, 0, 12, 4, 1); stink(g, 10, 12, 4, 0); stink(g, 1, 3, 3, 1); stink(g, 11, 5, 2, 1); };
F[2] = g => { figure(g, {torso: 'up', legs: 'lift'}); stink(g, 10, 12, 3, 0); stink(g, 11, 8, 3, 1); };
F[3] = g => {
  figure(g, {});
  stamp(g, 9, 9, ['.gG', 'gGg', 'Gg.', '.Gg', 'g..']); // stink burst to the front
  stink(g, 1, 13, 2, 0);
};
F[4] = g => { figure(g, {legs: 'walkA'}); stink(g, 0, 13, 4, 0); stink(g, 1, 7, 2, 1); };
F[5] = g => { figure(g, {dy: 1, legs: 'walkB'}); stink(g, 0, 12, 4, 1); stink(g, 1, 6, 3, 0); };
F[6] = g => { figure(g, {legs: 'walkC'}); stink(g, 0, 11, 4, 0); stink(g, 10, 13, 2, 1); };
F[7] = g => { figure(g, {dy: 1, legs: 'walkB'}); stink(g, 0, 12, 3, 1); stink(g, 1, 6, 2, 1); };
F[8] = g => { // knees give way
  stamp(g, 2, 2, HEAD.map(r => r.replace('E', 's')));
  stamp(g, 1, 8, TORSO.down);
  stamp(g, 2, 12, ['oJJJJJJo', 'oJjJJoTR', 'oBBBoTBB']);
  stink(g, 0, 12, 4, 0); stink(g, 11, 11, 4, 1); stink(g, 1, 5, 3, 1);
};
const SEATED = g => { // sitting on the floor, legs stretched out to the front
  stamp(g, 0, 4, HEAD.map(r => r.replace('E', 's')));
  stamp(g, 0, 10, ['.oSWSSWSo...', 'oSwWYWWSSo..', 'oSWWwWWWo...']);
  stamp(g, 0, 13, ['oJJJJJJJoTRo', 'oJjJJJJJoTBB']);
};
F[9] = g => { SEATED(g); stink(g, 10, 12, 4, 0); stink(g, 11, 9, 3, 1); stink(g, 1, 3, 3, 0); };
F[10] = g => { SEATED(g); stink(g, 10, 12, 5, 1); stink(g, 9, 8, 3, 0); };

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
const png = encodePNG(out);
if (Buffer.compare(decodePNG(png).px, out.px) !== 0) throw new Error('PNG round trip mismatch');
fs.writeFileSync(OUT, png);
console.log('sprites/gas-alchemist.png  ' + W + 'x' + H + '  eleven 12x15 frames (Herr Fuß, zu Fuß)');

const argv = process.argv.slice(2), pi = argv.indexOf('--preview');
if (pi >= 0) {
  const dir = path.resolve(argv[pi + 1]); fs.mkdirSync(dir, {recursive: true});
  const Z = 8, gap = 4, cw = FW * Z + gap;
  const c = {w: FRAMES * cw, h: FH * Z, px: Buffer.alloc(FRAMES * cw * FH * Z * 4)};
  for (let i = 0; i < c.w * c.h; i++) c.px.writeUInt32BE(0x202028ff, i * 4);
  for (let f = 0; f < FRAMES; f++) for (let y = 0; y < FH * Z; y++) for (let x = 0; x < FW * Z; x++) {
    const sx = f * FW + (x / Z | 0), sy = y / Z | 0, i = (sy * W + sx) * 4, a = out.px[i + 3] / 255;
    const bg = (((x / Z | 0) + sy) & 1) ? [58, 56, 52] : [70, 68, 63], q = (y * c.w + f * cw + x) * 4;
    for (let k = 0; k < 3; k++) c.px[q + k] = Math.round(out.px[i + k] * a + bg[k] * (1 - a));
    c.px[q + 3] = 255;
  }
  fs.writeFileSync(path.join(dir, 'gas-alchemist-x8.png'), encodePNG(c));
  console.log('preview in ' + dir);
}
