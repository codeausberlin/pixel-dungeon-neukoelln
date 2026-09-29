// Kiez-Helden: draws the four playable hero atlases (warrior/mage/rogue/huntress.png) as
// original Neukölln pixel art. Pure Node (zlib via tools/lib/tileset-kit.cjs), no npm, no
// randomness: every run writes byte-identical PNGs.
//
//   node tools/generate-kiez-heroes.cjs                     write all four atlases
//   node tools/generate-kiez-heroes.cjs --only mage,rogue   write only these
//   node tools/generate-kiez-heroes.cjs --preview DIR       also write x6 previews
//
// Atlas contract (HeroSprite.java, TextureFilm 12x15): 256x128 RGBA, hard alpha only.
// Row r (y = 15*r) is armour tier r: 0 none, 1 Hoodie (cloth), 2 Lederjacke (leather),
// 3 Bomberjacke (mail), 4 Funktionsjacke (scale), 5 Türsteherweste (plate), 6 class armour.
// Row 7 (y 105..119) and the columns x 252..255 stay empty, as upstream.
// 21 frames per row: 0-1 idle, 2-7 run, 8-12 die, 13-15 attack/zap, 16-17 operate,
// 18 fly, 19-20 read. Feet stand on y 14 of the frame; the head occupies y 0..7 like the
// upstream heroes, so status text, emitters and the avatar (frame 0, uvRect x+1) line up.
//
// Method: every frame is composed from shared "material code" maps (body pose, class head,
// class accessories, class weapon), then each code is resolved to a colour from the class
// and tier palette. 'o' is a selective outline: it takes a darkened tone of the material it
// borders, as in the upstream sprites. Heads are identical on every tier; only the
// jacket codes (J j I Z C B A a F f c) change per tier.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {decodePNG, encodePNG, rgb, hex} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const SPRITES = path.join(ROOT, 'core/src/main/assets/sprites');
const FW = 12, FH = 15, FRAMES = 21, TIERS = 7, AW = 256, AH = 128;
// unmodified upstream v4.0.0 atlases (only used for the before/after preview)
const UPSTREAM = {
  warrior: 'd9a5bb715dd8c917ab7b892edea87e0bcf52a6dc', mage: 'fb48ce3d2834168d5e823fc91d55602368d20626',
  rogue: 'f7f400f3f5291073a0cbbd7f7710292d1826e760', huntress: '9b4612afac60ec4cd8387dfd33278048567dc7fc',
};

// ================================================================ material codes
// o outline (auto tone)        K k skin / skin shade      ! front hand (skin, weapon anchor)
// E eye                        g G glasses frame / lens   U sunburn
// R r Q hair base/shade/light  T t Y hat base/shade/band  N n paper / paper shade, b paper ink
// J j I jacket base/shade/highlight   Z front line (zip, strings)   C collar
// B hem / waistband   * chest anchor (J)   + hip anchor (B)
// A a sleeve / sleeve shade   F f forearm / forearm shade   c hood behind the neck (drawn over the head)
// P p trousers   L l lower leg   S s shoe / shoe shade

// ---------------------------------------------------------------- body poses (rows 7..14)
const B0 = [
  '............',
  '..oaJJCCJAo.',
  '.oaJJJZ*JAo.',
  '.ofJJJZJjFo.',
  '.okBBB+BB!o.',
  '..oPPPpPPPo.',
  '..oLlo.oLlo.',
  '..oSSs.oSSs.',
];
const BODY = {
  0: B0,
  1: B0,
  2: ['............',
      '..oaJJCCJAo.',
      '..oJJJZ*JAo.',
      '..oJJJZJjFo.',
      '..oBBB+BB!o.',
      '...oPPpPPPo.',
      '...oLl.oSSs.',
      '...oSSs.....'],
  3: ['............',
      '..oaJJCCJAo.',
      '..oJJJZ*JAo.',
      '..oJJJZJjFo.',
      '..oBBB+BB!o.',
      '..oPPPpPPPo.',
      '..oLlo..oSSs',
      '..oSSs......'],
  4: ['............',
      '............',
      '..oaJJCCJAo.',
      '..oJJJZ*jFo.',
      '..oBBB+BB!o.',
      '..oPPPpPPPo.',
      '.oSSs...oLl.',
      '........oSSs'],
  5: ['............',
      '..oaJJCCJAo.',
      '.oaJJJZ*JAAo',
      '.ofJJJZJjoF!',
      '.okBBB+BBo..',
      '..oPPPpPPo..',
      '..oSSs.oLl..',
      '.......oSSs.'],
  6: ['............',
      '..oaJJCCJAo.',
      'oaaJJJZ*JAAo',
      'kfoJJJZJjoF!',
      '..oBBB+BBo..',
      '...oPPpPPo..',
      '....oLlSSs..',
      '....oSSs....'],
  7: ['............',
      '............',
      '.oaaJJCCJAAo',
      'kfoJJJZ*joF!',
      '..oBBB+BBo..',
      '...oPPpPPo..',
      '....oLlo....',
      '....oSSs....'],
  8: ['............',
      '............',
      '.oaJJJCCJAo.',
      '.ofJJJZ*jFo.',
      '.okBBB+BB!o.',
      '..oPPPpPPPo.',
      '..oLlo.oLlo.',
      '..oSSs.oSSs.'],
  9: ['............',
      '............',
      '............',
      '............',
      '............',
      '..oaJJCCJAo.',
      '.okJJJ*B!Jo.',
      '..oPPPPPoSSs'],
  13: ['............',
       '.oaJJCCJJo..',
       'oAAJJZ*JJo..',
       '!FoJJZJJjo..',
       '.ooBBB+BBo..',
       '..oPPPpPPo..',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
  14: ['............',
       '..oaJJCCJAF!',
       '..oJJJZ*JAo.',
       '..oJJJZJjjo.',
       '..oBBB+BBo..',
       '..oPPPpPPPo.',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
  15: ['............',
       '...oaJJCCJo.',
       '...oJJJZ*JAF',
       '...oJJJZJjo!',
       '...oBBB+BBo.',
       '..oPPPpPPPo.',
       '.oLlo..oLlo.',
       '.oSSs...oSSs'],
  16: ['...c........',
       '..oAJCCJJAo.',
       '.oAaJJJJJaAo',
       '.oFjJJJJJjKo',
       '..oBBBBBBBo.',
       '..oPPPpPPPo.',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
  17: ['...c........',
       '..oAJCCJJAo.',
       '.oAaJJJJJaAo',
       '.oKjJJJJJjFo',
       '..oBBBBBBBo.',
       '..oPPPpPPPo.',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
  18: ['............',
       '..oaJJCCJAo.',
       '.oaJJJZ*JAFo',
       'okfJJJZJjo!.',
       '..oBBB+BBo..',
       '..oPPPpPPPo.',
       '..oSSs.oSSs.',
       '............'],
  19: ['............',
       '..oaJJCCJAo.',
       '.oaJJJZ*JAo.',
       '.ofJJJZJNNn.',
       '.okBBB+B!Nn.',
       '..oPPPpPPPo.',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
  20: ['............',
       '..oaJJCCJAo.',
       '.oaJJJZ*JAFo',
       '.ofJJJZJjo!.',
       '.okBBB+BBo..',
       '..oPPPpPPPo.',
       '..oLlo.oLlo.',
       '..oSSs.oSSs.'],
};
// hood bump behind the neck in the side view (all standing side frames)
for (const f of [0, 1, 2, 3, 5, 6, 13, 14, 15, 18, 19, 20]) BODY[f] = ['..c' + BODY[f][0].slice(3), ...BODY[f].slice(1)];
BODY[4] = [BODY[4][0], '..c' + BODY[4][1].slice(3), ...BODY[4].slice(2)];
BODY[7] = [BODY[7][0], '..c' + BODY[7][1].slice(3), ...BODY[7].slice(2)];
// extra cells drawn after the head: [x, y, code]
const OVER = {
  20: [[9, 6, 'N'], [10, 6, 'N'], [11, 6, 'n'], [9, 7, 'N'], [10, 7, 'b'], [11, 7, 'n'], [9, 8, 'N'], [10, 8, 'N'], [11, 8, 'n']],
};
// head placement per frame: view, dx, dy, mirrored, eyes closed
const HEAD = {
  0: ['side', 0, 0], 1: ['side', 1, 0, true], 2: ['side', 0, 0], 3: ['side', 0, 0], 4: ['side', 0, 1], 5: ['side', 0, 0],
  6: ['side', 0, 0], 7: ['side', 0, 1], 8: ['side', 0, 1, false, true], 9: ['side', 0, 4, false, true],
  13: ['side', -1, 0], 14: ['side', 0, 0], 15: ['side', 1, 0], 16: ['back', 0, 0], 17: ['back', 0, 0],
  18: ['side', 0, 0], 19: ['side', 0, 0], 20: ['side', 0, 0],
};

// ================================================================ classes
// Heads are 12x8 stamps for y 0..7, facing right (face on the right, eyes on x 6 and 9).
const CLASSES = {};

// ---------------------------------------------------------------- Alteingesessene (warrior)
CLASSES.warrior = {
  head: {
    side: ['...oooooo...',
           '..oRQRRQRo..',
           '.oRRRQRRRQo.',
           '.oRQRRKKKKRo',
           '.oRRrgGgKGgo',
           '.oRRrKKKKKKo',
           '..oRrKKkkKo.',
           '...ookKKKo..'],
    back: ['...oooooo...',
           '..oRQRRQRo..',
           '.oRRRQRRRQo.',
           '.oRQRRRQRRo.',
           '.ogRRQRRRgo.',
           '.oRRRRQRRRo.',
           '..oRRRRRRo..',
           '...okKKko...'],
  },
  base: {
    K: 'f0b99a', k: 'c98672', E: '1c1a26', g: '4a2f5e', G: 'cde8f6', R: 'cfc3dc', r: '9a8fae', Q: 'efeaf8',
    P: '5a5068', p: '443c52', L: '5a5068', l: '443c52', S: 'f4f0ea', s: 'b8b0a8', N: 'f6f3e6', n: 'c8c2b0', b: '3f6fb0',
  },
  // T0: Kittelschürze (sleeveless floral house coat), T6: Ballonseiden-Anzug
  tier0: {J: '8fa8d8', j: '6f86b8', I: 'b8ccef', Z: '6f86b8', C: 'K', B: '6f86b8', A: '8fa8d8', a: '6f86b8', F: 'K', f: 'k',
    pattern: (x, y) => ((x + 2 * y) % 4 === 0 ? 'f4f0ea' : null)},
  tier6: {J: '3fa6a0', j: '2a716f', I: '7fd6c5', Z: 'f4f0ea', C: '7a4f9c', B: '7a4f9c', A: '3fa6a0', a: '2a716f', F: '3fa6a0', f: '2a716f',
    P: '3fa6a0', p: '2a716f', L: '3fa6a0', l: '2a716f', yoke: '7a4f9c'},
  lie: ['.oooo.',
        'oRQRRo',
        'oRRRQo',
        'oQRRRo',
        'oRRQKo',
        '.oooo.'],
  weapon: 'umbrella',
};

// ---------------------------------------------------------------- Expat (mage)
CLASSES.mage = {
  head: {
    side: ['...ooooo....',
           '..oTTTTYo...',
           '.oTTTTTTYo..',
           '..ottttttto.',
           '..oRKgGgKGgo',
           '..oRKKKKKKKo',
           '...oKKkkKKo.',
           '....okKKo...'],
    back: ['...ooooo....',
           '..oTTTTYo...',
           '.oTTTTTTTo..',
           '..ottttttto.',
           '..oRRRRRRRo.',
           '..ogRRRRRgo.',
           '...oRRRRRo..',
           '....okKko...'],
  },
  base: {
    K: 'f2c4a4', k: 'cc9078', E: '1a1a28', g: '3a2a4a', G: 'c28cff', R: '8a6440', r: '64462a', Q: 'a8805a',
    T: 'e0b440', t: 'b08326', Y: 'f6d670',
    P: 'd9c3a0', p: 'a99273', L: 'd9c3a0', l: 'a99273', S: 'f3efe6', s: '7a4a2e', N: 'f6f3e6', n: 'c8c2b0', b: '3f6fb0',
  },
  // T0: white startup T-shirt, T6: Gründer-Fleeceweste over the mint hoodie
  tier0: {J: 'f3efe6', j: 'c8c0b8', I: 'ffffff', Z: 'c8c0b8', C: 'K', B: 'c8c0b8', A: 'f3efe6', a: 'c8c0b8', F: 'K', f: 'k'},
  tier6: {J: '4a5670', j: '36405a', I: '6a7896', Z: '9aa4b4', C: '8fbf8a', B: '36405a', A: '8fbf8a', a: '5f8f63', F: '8fbf8a', f: '5f8f63', c: '8fbf8a'},
  lie: ['.oooo.',
        'oTTRRo',
        'otTRRo',
        'oTTRRo',
        'otTRKo',
        '.oooo.'],
  weapon: 'selfie',
  accessory: 'lanyard',
};

// ---------------------------------------------------------------- Tourist (rogue)
CLASSES.rogue = {
  head: {
    side: ['....oooo....',
           '...oTTTWo...',
           '...oYYYYo...',
           '.oTTTTTTTTTo',
           '..oRkkEkkEko',
           '..oRKKKKKKUo',
           '...oKKKkKKo.',
           '....okKKo...'],
    back: ['....oooo....',
           '...oTWTTo...',
           '...oYYYYo...',
           '.oTTTTTTTTTo',
           '..oRRRRRRRo.',
           '..oRRRRRRRo.',
           '...oRRRRRo..',
           '....okKko...'],
  },
  base: {
    K: 'f4c3a0', k: 'd08c78', U: 'ef6f6a', E: '1d1c2a', R: '7a5030', r: '5a3820', Q: '9a6a44',
    T: 'f2e2b0', t: 'c9b27a', W: 'fff8e0', Y: 'e2524e',
    P: 'c8b27c', p: '9c8858', L: 'fbf8f0', l: 'd0ccc4', S: '8a5a3a', s: '5e3a22', N: 'f6f3e6', n: 'c8c2b0', b: '3f6fb0',
  },
  // T0: Feinripp tank top with sunburnt arms, T6: Hawaiihemd
  tier0: {J: 'f4f0e8', j: 'cfc8bc', I: 'ffffff', Z: 'cfc8bc', C: 'K', B: 'cfc8bc', A: 'K', a: 'k', F: 'U', f: 'k'},
  tier6: {J: '3fb3a6', j: '2a7f79', I: '6fd6c8', Z: '2a7f79', C: 'K', B: '3fb3a6', A: '3fb3a6', a: '2a7f79', F: 'K', f: 'k',
    flowers: ['ff8fb3', 'ffb04a', 'fbf8f0']},
  lie: ['.oooo.',
        'oRQRRo',
        'oRRRRo',
        'oRRQRo',
        'oRRRKo',
        '.oooo.'],
  lieExtra: [[6, 9, 'o'], [7, 9, 'W'], [8, 9, 'T'], [9, 9, 'o'], [5, 10, 'o'], [6, 10, 'T'], [7, 10, 'Y'], [8, 10, 'Y'], [9, 10, 'T'], [10, 10, 'o']],
  weapon: 'knife',
  accessory: 'camera',
};

// ---------------------------------------------------------------- Zugezogene (huntress)
CLASSES.huntress = {
  head: {
    side: ['...ooooo....',
           '..oRRQRRoo..',
           '.oRRRRRQRRo.',
           '.oRRRRRRRRRo',
           '.oRRkKEKKEKo',
           '.oRRkKKKKKKo',
           '.oRRoYKKkKo.',
           '.oRRo.oKKo..'],
    back: ['...ooooo....',
           '..oRRQRRoo..',
           '.oRRRRRQRRo.',
           '.oRRQRRRRRo.',
           '.oRRRRRQRRo.',
           '.oRRRRRRRRo.',
           '.oRRRRRRRRo.',
           '..oRRRRRRo..'],
  },
  base: {
    K: 'e9b08e', k: 'bb7f67', E: '1f1a2b', R: '4a2e45', r: '36203a', Q: '7c4a6a', Y: 'ef7f97',
    P: '5876b4', p: '3d5588', L: '5876b4', l: '3d5588', S: 'fbf6ea', s: 'c8c0b0', N: 'f6f3e6', n: 'c8c2b0', b: '3f6fb0',
  },
  // T0: colour-block windbreaker top (teal, pink stripe, cream) as on the splash, T6: Vintage-Cordjacke
  tier0: {J: '46b3a6', j: '2e7f79', I: '7fd6c5', Z: '2e7f79', C: 'K', B: 'f4e6c8', A: '46b3a6', a: '2e7f79', F: 'K', f: 'k',
    rows: {1: 'ef7f97'}},
  tier6: {J: 'b8763a', j: '8a5528', I: 'd89a58', Z: '8a5528', C: 'f4e6c8', B: '8a5528', A: 'b8763a', a: '8a5528', F: 'b8763a', f: '8a5528',
    cord: 'a4672f'},
  lie: ['.oooo.',
        'oRQRRo',
        'oRRRRR',
        'oRRQRR',
        'oRRRKo',
        '.oooo.'],
  // bow poses: front hand forward at (10,9) holding the bow, back hand pulls the string
  body: {
    13: ['..c.........',
         '..oaJJCCJAo.',
         '..oJJJZ*kF!.',
         '..oJJJZJjjo.',
         '..oBBB+BBo..',
         '..oPPPpPPPo.',
         '..oLlo.oLlo.',
         '..oSSs.oSSs.'],
    14: ['..c.........',
         '..oaJJCCJAo.',
         '.okaaAAAAF!.',
         '..oJJJZ*jjo.',
         '..oBBB+BBo..',
         '..oPPPpPPPo.',
         '.oLlo..oLlo.',
         '.oSSs..oSSs.'],
    15: ['..c.........',
         '..oaJJCCJAo.',
         '..oJJJZ*AF!.',
         '.okJJJZJjjo.',
         '..oBBB+BBo..',
         '..oPPPpPPPo.',
         '..oLlo.oLlo.',
         '..oSSs.oSSs.'],
  },
  weapon: 'bow',
  accessory: 'jutebag',
};

// ---------------------------------------------------------------- shared tiers 1..5
const TIER = {
  1: {J: '8e8a9a', j: '6a6678', I: 'b0acbc', Z: 'efe9e0', C: '6a6678', B: '6a6678', A: '8e8a9a', a: '6a6678', F: '8e8a9a', f: '6a6678', c: '8e8a9a'}, // Hoodie
  2: {J: '5c3a2c', j: '3e261c', I: '7e5646', Z: 'c8ccd8', C: '7e5646', B: '3e261c', A: '5c3a2c', a: '3e261c', F: '5c3a2c', f: '3e261c'},              // Lederjacke
  3: {J: '6f7a42', j: '505a2e', I: '97a266', Z: '505a2e', C: 'e0823a', B: '3e4424', A: '6f7a42', a: '505a2e', F: '6f7a42', f: '3e4424'},              // Bomberjacke
  4: {J: 'd8473a', j: 'a23026', I: 'f07a60', Z: '2a2a38', C: 'd8473a', B: 'e8e8e0', A: 'd8473a', a: 'a23026', F: 'd8473a', f: 'e8e8e0'},              // Funktionsjacke
  5: {J: '2c2c34', j: '1c1c22', I: '5a5a6a', Z: '6a6a7c', C: '2c2c34', B: '1c1c22', A: '2c2c34', a: '1c1c22', F: 'K', f: 'k', rows: {0: '4c4c5c'}},                                    // Türsteherweste
};

// ================================================================ composition
const darken = c => { const [r, g, b] = rgb(c); return hex([Math.round(r * 0.42 + 4), Math.round(g * 0.36 + 2), Math.round(b * 0.42 + 10)].map(v => Math.min(255, v))); };

function palette(cls, tier) {
  const C = CLASSES[cls];
  const t = tier === 0 ? C.tier0 : tier === 6 ? C.tier6 : TIER[tier];
  const pal = Object.assign({}, C.base, t);
  for (const k of Object.keys(pal)) if (typeof pal[k] === 'string' && pal[k].length === 1) pal[k] = C.base[pal[k]] || pal[pal[k]];
  pal['!'] = pal.K; pal['*'] = pal.J; pal['+'] = pal.B;
  return pal;
}

function stampHead(grid, cls, spec) {
  const [view, dx, dy, flip, closed] = spec;
  const rows = CLASSES[cls].head[view];
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const X = (flip ? FW - 1 - x : x) + dx, Y = y + dy;
    if (X < 0 || X >= FW || Y < 0 || Y >= FH) return;
    grid[Y][X] = closed && ch === 'E' ? 'k' : ch;
  }));
}

function find(grid, code) { for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (grid[y][x] === code) return [x, y]; return null; }

// the frame as a grid of codes (no colours yet)
function codeFrame(cls, f) {
  const grid = Array.from({length: FH}, () => Array(FW).fill('.'));
  const body = (CLASSES[cls].body && CLASSES[cls].body[f]) || BODY[f];
  body.forEach((row, i) => [...row].forEach((ch, x) => { if (ch !== '.' && ch !== 'c') grid[7 + i][x] = ch; }));
  if (HEAD[f]) stampHead(grid, cls, HEAD[f]);
  body.forEach((row, i) => [...row].forEach((ch, x) => { if (ch === 'c') grid[7 + i][x] = 'c'; }));
  for (const [x, y, c] of OVER[f] || []) grid[y][x] = c;
  return grid;
}

// colour grid: null = transparent
function colourFrame(cls, tier, f) {
  const grid = codeFrame(cls, f), out = resolve(grid, palette(cls, tier), cls, tier, f);
  accessory(cls, tier, f, grid, out);
  weapon(cls, f, grid, out);
  return out;
}

// codes -> colours (patterns are anchored to the chest so they move with the body)
function resolve(grid, pal, cls, tier, f) {
  const out = Array.from({length: FH}, () => Array(FW).fill(null));
  const chest = find(grid, '*') || [7, 9];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const ch = grid[y][x];
    if (ch === '.' || ch === 'o') continue;
    let col = pal[ch];
    if (ch === 'c' && !pal.c) continue;              // no hood on this tier
    if (col === undefined) throw new Error(cls + ' tier ' + tier + ' frame ' + f + ': no colour for ' + ch);
    const rx = x - chest[0], ry = y - chest[1];
    if (ch === 'J' || ch === 'j') {
      if (pal.pattern) col = pal.pattern(rx + 20, ry + 20) || col;
      if (pal.yoke && ry < 0) col = pal.yoke;
      if (pal.rows && pal.rows[ry]) col = pal.rows[ry];
      if (pal.cord && (rx + 20) % 2 === 1 && ch === 'J') col = pal.cord;
      if (pal.flowers && ch === 'J') { const k = ((rx + 20) * 3 + (ry + 20) * 5) % 7; if (k === 0) col = pal.flowers[((rx + 20) + (ry + 20)) % 3]; }
    }
    out[y][x] = col;
  }
  // selective outline: darkened tone of the neighbouring material
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (grid[y][x] !== 'o') continue;
    const count = {};
    for (const [dx, dy, w] of [[1, 0, 2], [-1, 0, 2], [0, 1, 2], [0, -1, 2], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= FW || Y >= FH || !out[Y][X] || grid[Y][X] === 'o') continue;
      count[out[Y][X]] = (count[out[Y][X]] || 0) + w;
    }
    const best = Object.entries(count).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    out[y][x] = best ? darken(best[0]) : '2a2233';
  }
  return out;
}

const put = (out, x, y, c) => { if (x >= 0 && y >= 0 && x < FW && y < FH && c) out[y][x] = c; };

function accessory(cls, tier, f, grid, out) {
  const kind = CLASSES[cls].accessory, chest = find(grid, '*'), hip = find(grid, '+');
  if (kind === 'jutebag' && (f === 16 || f === 17)) { // back view: bag hangs on the right hip
    put(out, 7, 8, 'a88d5e'); put(out, 8, 9, 'a88d5e');
    for (let y = 10; y <= 12; y++) for (let x = 8; x <= 10; x++) put(out, x, y, y === 12 || x === 10 ? 'a88d5e' : 'd8c08c');
    return;
  }
  if (!kind || !chest) return;
  const [ax, ay] = chest;
  if (kind === 'lanyard') { put(out, ax - 1, ay - 1, 'ff7eb0'); put(out, ax, ay, 'f3efe6'); put(out, ax, ay + 1, '3fb3c6'); }
  if (kind === 'camera') { put(out, ax - 1, ay - 1, '2a2830'); put(out, ax, ay, '3a3a44'); put(out, ax + 1, ay, '2f6fc4');
    if (hip) { put(out, hip[0] - 1, hip[1], 'c8661e'); put(out, hip[0], hip[1], 'ff9a3c'); put(out, hip[0] + 1, hip[1], 'ff9a3c'); } }
  if (kind === 'jutebag') {
    put(out, ax + 1, ay - 1, 'a88d5e'); put(out, ax, ay, 'a88d5e'); put(out, ax - 1, ay + 1, 'a88d5e');
    for (let dy = 1; dy <= 3; dy++) for (let dx = -5; dx <= -3; dx++) put(out, ax + dx, ay + dy, dy === 3 || dx === -5 ? 'a88d5e' : 'd8c08c');
    put(out, ax - 4, ay + 2, 'e0434e');
  }
}

function weapon(cls, f, grid, out) {
  const kind = CLASSES[cls].weapon, hand = find(grid, '!');
  if (!hand || f < 13 || f > 15) return;
  const [hx, hy] = hand;
  const draw = cells => cells.forEach(([dx, dy, c]) => put(out, hx + dx, hy + dy, c));
  // 13 wind-up (hand behind the back), 14 raised in front, 15 strike downwards
  const swing = (a, b, c) => {
    if (f === 13) draw(a.map((col, i) => [0, -1 - i, col]));
    if (f === 14) draw(b.map((col, i) => [0, -1 - i, col]));
    if (f === 15) draw(c.map((col, i) => [0, 1 + i, col]));
  };
  if (kind === 'umbrella') { // rolled-up Stockschirm, bordeaux canopy, wooden crook
    const C = 'b04660', D = '6e2438', T = 'd8dde6';
    swing([C, C, D, T], [C, C, T], [C, D, T]);
  }
  if (kind === 'knife') { // small pocket knife
    const Bl = 'eef2f8', Bd = '9aa2b0';
    swing([Bl, Bd], [Bl, Bd], [Bl]);
  }
  if (kind === 'selfie') { // selfie stick with the violet glowing phone-light at its tip
    const St = 'a8b2c2', V = 'b070ff', L = 'f4e8ff';
    swing([St, St, V, L], [St, St, V, L], [V, L]);
  }
  if (kind === 'bow') { // wooden bow held at (hx, hy); string to the pulling hand
    const W = 'c07a3a', Wd = '7a4a22', Str = 'efe6d2', Ar = 'd8c8a8';
    draw([[1, -2, W], [1, -1, W], [1, 0, W], [1, 1, W], [1, 2, W], [0, -3, Wd], [0, 3, Wd]]);
    if (f === 13) draw([[-1, -2, Str], [-1, -1, Str], [-1, 1, Str], [-1, 2, Str]]);
    if (f === 14) draw([[-1, -2, Str], [-2, -1, Str], [-2, 1, Str], [-1, 2, Str], [-3, 0, Ar], [-2, 0, Ar], [-1, 0, Ar]]);
    if (f === 15) draw([[0, -2, Str], [0, -1, Str], [0, 1, Str], [0, 2, Str]]);
  }
}

// die frames 10-12: collapsed face down, head (class stamp) on the left, shoes on the right
const LIE = ['......ooooo.',
             '.....oJJIJoS',
             '....kaJJjPPS',
             '.....oBBpPps'];
function lyingFrame(cls, tier, lift) {
  const pal = palette(cls, tier), grid = Array.from({length: FH}, () => Array(FW).fill('.'));
  const C = CLASSES[cls], y0 = 11 - lift;
  LIE.forEach((row, i) => [...row].forEach((ch, x) => { if (ch !== '.') grid[y0 + i][x] = ch; }));
  C.lie.forEach((row, i) => [...row].forEach((ch, x) => { if (ch !== '.') grid[y0 - 2 + i][x] = ch; }));
  for (const [x, y, ch] of C.lieExtra || []) grid[y - lift][x] = ch;
  return resolve(grid, pal, cls, tier, 11);
}

function frame(cls, tier, f) {
  if (f === 10) return lyingFrame(cls, tier, 2);
  if (f === 11) return lyingFrame(cls, tier, 0);
  if (f === 12) return lyingFrame(cls, tier, 1);
  return colourFrame(cls, tier, f);
}

function buildAtlas(cls) {
  const px = Buffer.alloc(AW * AH * 4);
  for (let t = 0; t < TIERS; t++) for (let f = 0; f < FRAMES; f++) {
    const g = frame(cls, t, f);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (!g[y][x]) continue;
      const c = rgb(g[y][x]), i = ((t * FH + y) * AW + f * FW + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    }
  }
  return {w: AW, h: AH, px};
}

// ================================================================ previews
function blit(dst, src, sx, sy, w, h, dx, dy, s, bg) {
  for (let y = 0; y < h * s; y++) for (let x = 0; x < w * s; x++) {
    const i = ((sy + (y / s | 0)) * src.w + sx + (x / s | 0)) * 4, j = ((dy + y) * dst.w + dx + x) * 4;
    if (src.px[i + 3]) { dst.px[j] = src.px[i]; dst.px[j + 1] = src.px[i + 1]; dst.px[j + 2] = src.px[i + 2]; }
    else if (bg) { const c = bg((x / s | 0), (y / s | 0)); dst.px[j] = c[0]; dst.px[j + 1] = c[1]; dst.px[j + 2] = c[2]; }
    dst.px[j + 3] = 255;
  }
}
const canvas = (w, h, c) => { const px = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) { px[i * 4] = c[0]; px[i * 4 + 1] = c[1]; px[i * 4 + 2] = c[2]; px[i * 4 + 3] = 255; } return {w, h, px}; };
const checker = (x, y) => ((x >> 0) + (y >> 0)) % 2 ? [74, 70, 82] : [84, 80, 92];

function classPreview(cls, atlas, upstream) {
  const S = 6, G = 2, cw = FW * S + G, ch = FH * S + G;
  const rows = TIERS + 2, c = canvas(FRAMES * cw, rows * ch + 8, [40, 36, 48]);
  for (let t = 0; t < TIERS; t++) for (let f = 0; f < FRAMES; f++) blit(c, atlas, f * FW, t * FH, FW, FH, f * cw, t * ch, S, checker);
  // last row: frame 0 of every tier side by side, then the upstream frame 0 of tiers 0..6 for comparison
  const y0 = TIERS * ch + 8;
  for (let t = 0; t < TIERS; t++) blit(c, atlas, 0, t * FH, FW, FH, t * cw, y0, S, () => [58, 54, 60]);
  if (upstream) for (let t = 0; t < TIERS; t++) blit(c, upstream, 0, t * FH, FW, FH, (t + 8) * cw, y0, S, () => [58, 54, 60]);
  return c;
}

// all four classes: frame 0 of every tier plus the run cycle of tier 1 and 6, on a floor tone
function sheet(atlases) {
  const S = 6, G = 3, cw = FW * S + G, ch = FH * S + G, cols = TIERS + 1 + 6 + 1 + 6;
  const c = canvas(cols * cw, 4 * ch, [34, 30, 40]);
  const floor = () => [66, 62, 70];
  Object.values(atlases).forEach((a, r) => {
    for (let t = 0; t < TIERS; t++) blit(c, a, 0, t * FH, FW, FH, t * cw, r * ch, S, floor);
    for (let i = 0; i < 6; i++) blit(c, a, (2 + i) * FW, 1 * FH, FW, FH, (TIERS + 1 + i) * cw, r * ch, S, floor);
    for (let i = 0; i < 6; i++) blit(c, a, (2 + i) * FW, 6 * FH, FW, FH, (TIERS + 8 + i) * cw, r * ch, S, floor);
  });
  return c;
}

// ================================================================ main
const argv = process.argv.slice(2);
const oi = argv.indexOf('--only'), only = oi >= 0 ? argv[oi + 1].split(',') : Object.keys(CLASSES);
const pi = argv.indexOf('--preview'), previewDir = pi >= 0 ? path.resolve(argv[pi + 1]) : null;
const atlases = {};
for (const cls of only) {
  if (!CLASSES[cls]) throw new Error('unknown class ' + cls);
  const atlas = buildAtlas(cls);
  for (let i = 3; i < atlas.px.length; i += 4) if (atlas.px[i] !== 0 && atlas.px[i] !== 255) throw new Error('soft alpha');
  fs.writeFileSync(path.join(SPRITES, cls + '.png'), encodePNG(atlas));
  atlases[cls] = atlas;
  console.log('wrote sprites/' + cls + '.png');
}
if (previewDir) {
  fs.mkdirSync(previewDir, {recursive: true});
  const {execFileSync} = require('node:child_process');
  for (const cls of only) {
    let up = null;
    try { up = decodePNG(execFileSync('git', ['cat-file', 'blob', UPSTREAM[cls]], {cwd: ROOT, maxBuffer: 1 << 24})); } catch (e) { /* no history */ }
    fs.writeFileSync(path.join(previewDir, cls + '-x6.png'), encodePNG(classPreview(cls, atlases[cls], up)));
  }
  if (only.length === 4) fs.writeFileSync(path.join(previewDir, 'heroes-sammelvorschau-x6.png'), encodePNG(sheet(atlases)));
  console.log('previews in ' + previewDir);
}
