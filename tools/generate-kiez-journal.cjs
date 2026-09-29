// Kiez-Journal: redraws the journal-owned symbols in interfaces/icons.png in Neukölln style.
// Pure Node, deterministic. Only the cells listed in CELLS are touched; every other pixel of
// the current icons.png is kept as it is (the script checks this before writing).
//
//   node tools/generate-kiez-journal.cjs                 rewrite core/src/main/assets/interfaces/icons.png
//   node tools/generate-kiez-journal.cjs --preview DIR   also write before/after preview sheets
//   node tools/generate-kiez-journal.cjs --source FILE   read the upstream atlas from FILE instead of git
//
// Upstream reference: Shattered Pixel Dungeon v4.0.0 (commit 2bb34a4). Level-feeling markers of the
// stair icons and the water/marker of the two well icons are copied from the upstream pixels, so
// they stay identical to the HUD depth icons and keep their meaning. Cell rectangles are the
// uvRectBySize() values from ui/Icons.java and are listed in docs/NEUKOELLN-JOURNAL.md.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const REL = 'core/src/main/assets/interfaces/icons.png';
const TARGET = path.join(ROOT, REL);
const UPSTREAM = '2bb34a4';
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

const up = decodePNG(opt('--source') ? fs.readFileSync(opt('--source'))
  : execFileSync('git', ['show', `${UPSTREAM}:${REL}`], {cwd: ROOT, maxBuffer: 1 << 24}));
const cur = decodePNG(fs.readFileSync(TARGET));
if (up.w !== cur.w || up.h !== cur.h) throw new Error('icons.png size differs from upstream');
const out = {w: cur.w, h: cur.h, px: Buffer.from(cur.px)};

// ------------------------------------------------------------------ helpers
const at = (img, x, y) => (y * img.w + x) * 4;
const get = (img, x, y) => { const i = at(img, x, y); return [img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]]; };
const set = (x, y, c) => { const i = at(out, x, y); out.px[i] = c[0]; out.px[i + 1] = c[1]; out.px[i + 2] = c[2]; out.px[i + 3] = c[3] ?? 255; };
const col = v => { if (Array.isArray(v)) return v; const [h, a] = v.split('@'); return [...rgb(h), a === undefined ? 255 : +a]; };

// shared palette: 'o' soft outline like upstream (black at 40 %), 'O' bottom shadow (80 %)
const BASE = {o: '000000@102', O: '000405@204', k: '1c1416'};

function art(rows, keys) {
  if (rows.some(r => r.length !== rows[0].length)) throw new Error('ragged art: ' + rows.find(r => r.length !== rows[0].length));
  const pal = Object.fromEntries(Object.entries({...BASE, ...keys}).map(([k, v]) => [k, col(v)]));
  return (x, y) => { const ch = rows[y][x]; if (ch === '.') return null; const c = pal[ch]; if (!c) throw new Error('no colour ' + ch); return c; };
}

// ------------------------------------------------------------------ designs
// Kieznotizen (Icons.JOURNAL 17x15): open kraft-paper notebook with spiral and a red waiting ticket.
const JOURNAL = art([
  '...........oooo..',
  '.oooooooSoooRRoo.',
  'oPPPPPPPsPPoRWoPo',
  'oPLLLLLPSPPoRRoPo',
  'oPPPPPPPsPLoooLPo',
  'oPLLLLpPSPLLLLLPo',
  'oPPPPPPPsPPPPPPPo',
  'oPLLLLLPSPLLLLLPo',
  'oPPPPPPPsPPPPPPPo',
  'oPLLLpPPSPLLLLpPo',
  'oPPPPPPPsPPPPPPPo',
  'oppppppPSPppppppo',
  'oCCCCCCCsCCCCCCCo',
  'ocCCCCCCCCCCCCCco',
  '.ooooooooooooooo.',
], {P: 'f2ead2', p: 'cfc3a4', L: '6f82a8', S: 'c4cad2', s: '6a7078', R: 'd83a2c', W: 'fff4e0', C: 'b98246', c: '7f5428'});

// Abzeichen (Icons.BADGES 16x16): a round pin-back button with a star.
function BADGES(x, y) {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d > 7.9) return null;
  if (d > 7.0) return col(BASE.o);
  const star = ['...Y...', '...Y...', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'YY...YY'];
  if (x >= 4 && x <= 10 && y >= 4 && y <= 10 && star[y - 4][x - 4] === 'Y') return col(y < 7 ? 'ffe45a' : 'f2c230');
  if (d > 6.0) return col(x + y < 13 ? 'e9ecef' : '9aa2ab');              // crimped metal rim
  if ((x === 4 && y === 3) || (x === 3 && y === 4)) return col('ffd0de'); // shine
  return col(x + y < 11 ? 'ff6f98' : x + y < 18 ? 'e84a7c' : 'b8325e');
}

// Katalog (Icons.CATALOG 13x16): the Aktenordner from the Amt, label on the spine, finger hole.
const CATALOG = art([
  'ooooooooooooo',
  'oBBBBBBBBBBbo',
  'oBWWWWWWWWBbo',
  'oBWLLLLLLWBbo',
  'oBWWWWWWWWBbo',
  'oBWLLLLRWWBbo',
  'oBWWWWWWWWBbo',
  'oBBBBBBBBBBbo',
  'oBBBBBBBBBBbo',
  'oBBBoooooBBbo',
  'oBBokkkkkoBbo',
  'oBBBoooooBBbo',
  'oBBBBBBBBBBbo',
  'oBBBBBBBBBBbo',
  'oddddddddddDo',
  'ooooooooooooo',
], {B: '3a78c8', b: '285a98', d: '1e4478', D: '16345c', W: 'f4f0e4', L: '5a5a6a', R: 'd83a2c', k: '101820'});

// Alchemiekessel (Icons.ALCHEMY 16x16): red enamel preserving pot with a bubbling green brew.
const ALCHEMY = art([
  '................',
  '.......oo.......',
  '......oggo..oo..',
  '...oo.oggo.oggo.',
  '..oggo.oo..oggo.',
  '..oooooooooooo..',
  '.oWWWWWWWWWWWWo.',
  '.owGGgGGGGgGGwo.',
  'oooRRRRRRRRRrooo',
  'oHoRWRRRRRRRroHo',
  'oooRRRRRWRRRrooo',
  '..oRRWRRRRRRro..',
  '..oRRRRRRRWRro..',
  '..orRRRRRRRrro..',
  '...orrrrrrrro...',
  '....OOOOOOOO....',
], {g: '9cf07c', G: '3cc048', R: 'd8402c', r: '9c2a1c', W: 'f8f4ec', w: 'c8c0b0', H: '3a3a3a'});

// Gemeinschaftsgarten (Icons.GRASS 16x16): a wooden raised bed with sunflower, leaves and a tomato.
const GRASS = art([
  '....ooo.........',
  '...oYYYo........',
  '...oYyYo....oo..',
  '...oYYYo...oLLo.',
  '....oSo...oLLo..',
  '.oo.oSo.oo.oSo..',
  'oLLooSooLLooSLo.',
  '.oLLoSoLLo.oSLLo',
  '..oLLSLLo.oRSoo.',
  '.oooooooooooooo.',
  'oWWWWWWWWWWWWWWo',
  'owMMMMMMMMMMMMwo',
  'oWWWWWWWWWWWWWWo',
  'owMMMMMMMMMMMMwo',
  'oWWWWWWWWWWWWWWo',
  'OOOOOOOOOOOOOOOO',
], {Y: 'ffd23a', y: '7a4a1a', L: '5cba44', S: '2e7a2e', R: 'e03a2a', W: 'b07a44', M: '7e5028', w: '8e5c30'});

// Jutebeutel (Icons.BACKPACK_LRG 16x16): jute tote bag with a printed heart.
const BACKPACK = art([
  '....oooooooo....',
  '...oHHHHHHHHo...',
  '...oHooooooHo...',
  '...oHo....oHo...',
  '.oooHooooooHooo.',
  '.oJJHJJJJJJHJJo.',
  '.oJJJJJJJJJJJJo.',
  '.oJJJRRJRRJJJJo.',
  '.oJJJRRRRRJJJJo.',
  '.oJJJJRRRJJJJJo.',
  '.oJJJJJRJJJJJJo.',
  '.oJJJJJJJJJJJJo.',
  '.ojJJJJJJJJJJjo.',
  '.ojjJJJJJJJJjjo.',
  '.ojjjjjjjjjjjjo.',
  '..OOOOOOOOOOOO..',
], {J: 'd8c49a', j: 'b09a70', H: 'c8b088', R: 'd83a2c'});

// Hausflur-Aushang (Icons.SCROLL_COLOR 15x14, eigene Notizen): notice with pin and tear-off strips.
const NOTICE = art([
  '......ooo......',
  '.ooooooRoooooo.',
  '.oPPPPPrPPPPPo.',
  '.oPKKKKKKKKKPo.',
  '.oPPPPPPPPPPPo.',
  '.oPLLLLLLLLPPo.',
  '.oPLLLLLLPPPPo.',
  '.oPPPPPPPPPPPo.',
  '.oPLLLLLLLLLPo.',
  '.oPPPPPPPPPPPo.',
  '.opppppppppppo.',
  '.oPoPo.oPoPoPo.',
  '.oLoLo.oLoLoLo.',
  '.OOOOO.OOOOOOO.',
], {P: 'fbf6e6', p: 'c8bfa8', K: '2a2a38', L: '6a7088', R: 'e8342a', r: 'b8b0a0'});

// Kabelschlange (Icons.SNAKE 9x13, Kiezführer "Überraschungsangriffe"): orange extension cable,
// head is a plug with two prongs.
const SNAKE = art([
  '...o.o...',
  '..oSoSo..',
  '.oPPPPPo.',
  '.oPpPPPo.',
  '.ooPPPoo.',
  '..oCco...',
  '.oCco....',
  'oCco.....',
  'oCcooooo.',
  '.oCCCCcco',
  '.oooooCco',
  '..ooCCco.',
  '..ooooo..',
], {S: 'd8dce0', P: '2a2a30', p: '4a4a52', C: 'f08a24', c: 'b85c10'});

// Opferflamme (Icons.SACRIFICE_ALTAR 16x16): disposable grill from the Feld, skull in the flames.
const ALTAR = art([
  '.......oo.......',
  '......oFFo..oo..',
  '...oo.oFYFooFFo.',
  '..oFFFFSSSSFFFo.',
  '..oFFFSSSSSSFFo.',
  '..oFYFSkSSkSFYo.',
  '..oFYFSSSSSSFYo.',
  '..oYYYFSSSSFYYo.',
  '..oYYYYSoSoYYYo.',
  '.oEeEEeEEeEEeEo.',
  'oAAAAAAAAAAAAAAo',
  '.oaAaAaAaAaAaAo.',
  '..oaaaaaaaaaao..',
  '...oKo....oKo...',
  '..oKo......oKo..',
  '..OO........OO..',
], {F: 'e8581c', Y: 'ffd23a', S: 'f0ece0', k: '2a1a1a', E: 'd83a18', e: '6a2a1c', A: 'dfe3e8', a: '9aa0a8', K: '4a4a52'});

// Ferner Brunnen (Icons.DISTANT_WELL 16x16): hole in rotten floorboards, a well far below.
const DISTANT = art([
  '.oooooooooooooo.',
  'oWWWWWWWWWWWWWWo',
  'oMMMMMMMMMMMMMMo',
  'oWWWWWoooooWWWWo',
  'oWWWWoKKKKKoWWWo',
  'oMMMoKKKKKKKoMMo',
  'oWWoKKKKKKKKKoWo',
  'oWWoKKKbbbKKKoWo',
  'oMMoKKbKKKbKKoMo',
  'oWWWoKKbbbKKoWWo',
  'oWWWWoKKKKKoWWWo',
  'oMMMMMoKKKoMMMMo',
  'oWWWWWWoooWWWWWo',
  'oWWWWWWWWWWWWWWo',
  'oMMMMMMMMMMMMMMo',
  '.OOOOOOOOOOOOOO.',
], {W: 'a0703c', M: '6a4424', K: '0c0a0a', b: '3a5a70'});

// Treppenhaus (Icons.STAIRS* 15x16): Altbau cellar stairs, oak treads with brass nosing, brick below.
// The level-feeling marker (top right) is copied from the matching upstream cell.
function stairsBase(x, y) {
  const edge = y < 2 ? 5 : y < 4 ? 8 : y < 6 ? 11 : 14;           // right edge per step
  const top = x <= 5 ? 0 : x <= 8 ? 2 : x <= 11 ? 4 : 6;          // top outline row per column
  if (x > edge || y < top) return null;
  if (y === 15) return col(BASE.O);
  if (x === 0 || x === edge || y === top || x === 14) return col(BASE.o);
  const step = y - top;                                            // 1 = tread, 2 = riser
  if (step === 1) return col(x % 3 === 0 ? 'f4d488' : 'e0b468');   // brass-edged oak tread
  if (step === 2) return col('9a6234');                            // oak riser
  if (step === 3) return col('5a3420');                            // shadow under the tread
  // brick body below the steps: courses of 2 rows, bricks 4 wide, staggered
  const course = (y >> 1), off = course & 1 ? 2 : 0;
  if ((y & 1) === 1 && y > 7) return col('3a2018');                // mortar line
  if (((x + off) & 3) === 0) return col('3a2018');                 // head joint
  return col(course & 1 ? '6e3024' : '7c382a');
}

// Brunnen der Gesundheit / Wahrnehmung (16x16): green cast-iron rim of a Berlin street pump
// ("Plumpe") with brass rivets; water and marker inside are the upstream pixels.
function wellCell(ux, uy) {
  return (x, y) => {
    const inner = x >= 3 && x <= 12 && y >= 3 && y <= 11;
    if (inner) { const c = get(up, ux + x, uy + y); return c[3] ? c : null; }
    const c = get(up, ux + x, uy + y);
    if (!c[3]) return null;
    if (c[0] < 8 && c[1] < 8) return c;                            // keep the soft outline
    if ((x === 1 || x === 14) && (y === 1 || y === 13)) return col('e0b848'); // rivets
    const L = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;       // keep upstream shading
    const t = Math.max(0, Math.min(1, (L - 40) / 120));
    const dark = [30, 70, 44], light = [86, 160, 104];
    return dark.map((v, i) => Math.round(v + (light[i] - v) * t)).concat(255);
  };
}

// ------------------------------------------------------------------ cell table (x, y, w, h from Icons.java)
const STAIRS = ['STAIRS', 'STAIRS_CHASM', 'STAIRS_WATER', 'STAIRS_GRASS', 'STAIRS_DARK', 'STAIRS_LARGE', 'STAIRS_TRAPS', 'STAIRS_SECRETS'];
const CELLS = [
  {name: 'JOURNAL', x: 136, y: 0, w: 17, h: 15, draw: JOURNAL},
  {name: 'BADGES', x: 51, y: 0, w: 16, h: 16, draw: BADGES},
  {name: 'SCROLL_COLOR', x: 160, y: 32, w: 15, h: 14, draw: NOTICE},
  {name: 'BACKPACK_LRG', x: 0, y: 48, w: 16, h: 16, draw: BACKPACK},
  {name: 'SNAKE', x: 48, y: 48, w: 9, h: 13, draw: SNAKE},
  {name: 'CATALOG', x: 80, y: 48, w: 13, h: 16, draw: CATALOG},
  {name: 'ALCHEMY', x: 96, y: 48, w: 16, h: 16, draw: ALCHEMY},
  {name: 'GRASS', x: 112, y: 48, w: 16, h: 16, draw: GRASS},
  ...STAIRS.map((name, i) => ({name, x: i * 16, y: 64, w: 15, h: 16, draw: (x, y) => {
    if (i > 0) { // marker = pixels where the upstream variant differs from upstream STAIRS
      const a = get(up, i * 16 + x, 64 + y), b = get(up, x, 64 + y);
      if (a.some((v, k) => v !== b[k])) return a[3] ? a : null;
    }
    return stairsBase(x, y);
  }})),
  {name: 'WELL_HEALTH', x: 128, y: 64, w: 16, h: 16, draw: wellCell(128, 64)},
  {name: 'WELL_AWARENESS', x: 144, y: 64, w: 16, h: 16, draw: wellCell(144, 64)},
  {name: 'SACRIFICE_ALTAR', x: 160, y: 64, w: 16, h: 16, draw: ALTAR},
  {name: 'DISTANT_WELL', x: 176, y: 64, w: 16, h: 16, draw: DISTANT},
];

const inCell = (x, y) => CELLS.some(c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
for (const c of CELLS) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
  const v = c.draw(x, y);
  set(c.x + x, c.y + y, v || [0, 0, 0, 0]);
}
// guard: nothing outside the journal cells may change
for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
  if (inCell(x, y)) continue;
  const i = at(out, x, y);
  for (let k = 0; k < 4; k++) if (out.px[i + k] !== cur.px[i + k]) throw new Error(`pixel ${x},${y} outside journal cells changed`);
}
fs.writeFileSync(TARGET, encodePNG(out));
console.log('wrote ' + path.relative(process.cwd(), TARGET) + ' (' + CELLS.length + ' journal cells)');

const pdir = opt('--preview');
if (pdir) {
  fs.mkdirSync(pdir, {recursive: true});
  // before/after strip: every cell upstream (top) and new (bottom), 6x, on a checker background
  const S = 6, pad = 2, cw = 17 + pad, W = CELLS.length * cw * S, H = (16 * 2 + pad * 3) * S;
  const img = {w: W, h: H, px: Buffer.alloc(W * H * 4)};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, ch = ((x / S >> 2) + (y / S >> 2)) & 1 ? 70 : 50;
    img.px[i] = ch; img.px[i + 1] = ch * 0.6; img.px[i + 2] = ch; img.px[i + 3] = 255;
  }
  CELLS.forEach((c, n) => [up, out].forEach((src, row) => {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const p = get(src, c.x + x, c.y + y), a = p[3] / 255;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const X = (n * cw + pad + x) * S + sx, Y = (pad + row * (16 + pad) + y) * S + sy, i = (Y * W + X) * 4;
        for (let k = 0; k < 3; k++) img.px[i + k] = Math.round(p[k] * a + img.px[i + k] * (1 - a));
      }
    }
  }));
  fs.writeFileSync(path.join(pdir, 'kiez-journal-before-after-6x.png'), encodePNG(img));
  console.log('preview in ' + pdir);
}
