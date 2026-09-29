// Kiez-UI: Neukölln versions of the interface sheets (badges, talent and hero icons, window
// chrome, status pane, toolbar and friends). Pure Node (zlib via tools/lib/tileset-kit.cjs),
// no npm, no randomness: two runs write byte-identical PNGs.
//
//   node tools/generate-kiez-ui.cjs                 write all sheets listed in SHEETS
//   node tools/generate-kiez-ui.cjs --only badges   only some sheets (comma separated keys)
//   node tools/generate-kiez-ui.cjs --preview DIR   also write before|after previews
//
// Every sheet starts from the unmodified upstream PNG (git blob of commit UPSTREAM_REV), so
// the script can be re-run any number of times. Sheet sizes, cell grids, nine-patch borders
// and transparent areas stay exactly as upstream (checked: alpha of every frame sheet is
// compared against upstream and the script aborts on a difference).
//
// Contracts (read-only Java):
// - badges.png 128x256, 16x16 cells, index = Badges.Badge image. Frame per tier (bronze 0-31,
//   silver 32-63, gold 64-95, platinum 96-119, diamond 120-127) stays upstream; only the inner
//   field is redrawn (field colours per badge from upstream, motif centred, dark outline).
//   BadgeBanner.highlight() puts its sparkle on the first pixel in row 4 (from x=3) that
//   differs from (3,4); with the new motifs it simply lands on the motif edge.
// - talent_icons.png 512x128, 16x16, index = Talent icon (rows 0-3 warrior/mage/rogue/huntress,
//   rows 4-5 duelist/cleric stay upstream, they are not playable in this fork).
// - hero_icons.png 128x256, 16x16, index = HeroIcon constant.
// - chrome/status_pane/toolbar/menu_button/menu_pane/talent_button/boss_hp/radial_menu:
//   nine-patch and sliced frames; only colours of the neutral stone material are remapped
//   (alpha untouched), plus small details on opaque pixels.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {decodePNG, encodePNG, rgb, lum, mix, shade} = require('./lib/tileset-kit.cjs');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = 'core/src/main/assets/';
const UPSTREAM_REV = '4256b22';
const argv = process.argv.slice(2);

// ================================================================ image helpers
function upstream(rel) {
  return decodePNG(execFileSync('git', ['show', `${UPSTREAM_REV}:${ASSETS}${rel}`], {cwd: ROOT, maxBuffer: 1 << 26}));
}
const clone = im => ({w: im.w, h: im.h, px: Buffer.from(im.px)});
const get = (im, x, y) => { const o = (y * im.w + x) * 4; return [im.px[o], im.px[o + 1], im.px[o + 2], im.px[o + 3]]; };
const set = (im, x, y, c) => { if (x < 0 || y < 0 || x >= im.w || y >= im.h) return; const o = (y * im.w + x) * 4; im.px[o] = c[0]; im.px[o + 1] = c[1]; im.px[o + 2] = c[2]; im.px[o + 3] = c.length > 3 ? c[3] : 255; };
const key = c => c.join(',');
const C = h => [...rgb(h), 255];

// Shared motif palette. '.' = nothing, lower/upper case = light/dark tone of a material.
const PAL = {
  k: '1b1418', // outline black
  w: 'ffffff', W: 'dcd8cc', h: 'b4b4b8', g: '8c8c94', G: '5c5c66', // white .. dark grey
  r: 'e0402c', R: '961e1e', p: 'f282a8', P: 'b44c78',            // red, pink
  o: 'f09030', O: 'a85418', y: 'fadc50', Y: 'c89a1c',            // orange, yellow/gold
  b: '5a8ce0', B: '284090', c: '8adcf0', C: '3ca0c0',            // blue, cyan
  n: 'a0663a', N: '5e3a20', t: 'd8b27a', T: 'f2dcae',            // brown, tan, bread
  e: '5cb84a', E: '2c6e2c', l: 'b4e664', m: '8ce0c0', M: '3caa8c', // green, lime, mint
  v: 'a070dc', V: '5c3494', a: '6a3a5c', A: '42203c',            // violet, aubergine hair
  s: 'f4c49c', S: 'cc8c6c', u: 'ec9a80',                         // skin, skin shade, sunburn
  L: 'b8aec8', i: 'e4dcf0',                                      // lilac-grey perm, curl light
  x: '000000',                                                   // pure black (talent outline)
};
function paint(im, x0, y0, rows, pal = {}, clip = null) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const hx = pal[ch] || PAL[ch]; if (!hx) throw new Error('no colour for ' + ch);
    if (clip && !clip(x0 + x, y0 + y)) return;
    set(im, x0 + x, y0 + y, C(hx));
  }));
}
// 4-neighbour outline around the drawn rows (only where the rows are empty)
function outline(im, x0, y0, rows, col, clip = null, eight = false) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const on = (x, y) => y >= 0 && y < h && x >= 0 && x < rows[y].length && rows[y][x] !== '.' && rows[y][x] !== ' ';
  const N = eight ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (on(x, y)) continue;
    if (N.some(([dx, dy]) => on(x + dx, y + dy))) { if (!clip || clip(x0 + x, y0 + y)) set(im, x0 + x, y0 + y, col); }
  }
}
const dims = rows => [Math.max(...rows.map(r => r.length)), rows.length];
const flipX = rows => { const w = dims(rows)[0]; return rows.map(r => [...r.padEnd(w, '.')].reverse().join('')); };

// ================================================================ badges
// Motifs are drawn centred into the inner field; an outline in a dark tone of the field is added.
const BM = {
  swatter: [ // Fliegenklatsche (Kammerjäger)
    '....rrrrr',
    '....rRrRr',
    '....rrrrr',
    '....rRrRr',
    '....rrrrr',
    '...n.....',
    '..n......',
    '.n.......',
    'n........'],
  coin: [
    '..hhhh..',
    '.hyyyYh.',
    'hyywyyYh',
    'hywyyyYh',
    'hyyyyyYh',
    'hyyyyYYh',
    '.hYYYYh.',
    '..hhhh..'],
  coins2: [
    '...hhhh...',
    '..hyyyYh..',
    '.hywyyyYh.',
    '.hyyyyyYh.',
    'hhhhYYYhh.',
    'hyyyYhhYh.',
    'hywyyyYYh.',
    '.hyyyYYh..',
    '..hhhhh...'],
  stack: [ // Münzstapel
    '..hhhhh...',
    '.hyyyyyh..',
    '.hYYYYYh..',
    '.hyyyyyhh.',
    '.hYYYYYyYh',
    '.hyyyyyYYh',
    '.hYYYYYyYh',
    '.hyyyyyYYh',
    '.hYYYYYYh.'],
  house: [ // Zweitwohnung mit Münze
    '....r.....',
    '...rrr....',
    '..rrrrr...',
    '.rrrrrrr..',
    '..WWWWW...',
    '..WcWcW.hh',
    '..WWWWWhyY',
    '..WcWnWhYY',
    '..WWWnW.hh'],
  houses: [ // Immobilienportfolio: drei Häuser
    '.r....r...',
    'rrr..rrr..',
    'WWW.rrrrr.',
    'WcWrrrrrrr',
    'WWW.WWWWW.',
    'WcW.WcWcW.',
    'WWW.WWWWW.',
    'WnW.WcWnW.',
    'WnW.WWWnW.'],
  drill: [ // Akkuschrauber
    '..yyyyy...',
    '.yyyyyyhhg',
    '.yYYYYy...',
    '..kk.yY...',
    '.....yY...',
    '....yyY...',
    '....GGG...',
    '....GGG...'],
  key: [
    '.yyy......',
    'yY.yy.....',
    'yY.yy.....',
    '.yyyyyyyyy',
    '......y.yY',
    '......Y.Y.'],
  keys: [ // Schlüsselbund
    '..hhh.....',
    '.h...h....',
    '.h...h....',
    '..hyhh....',
    '...y.bbbb.',
    '..yY.b..b.',
    '..y..bbbbb',
    '..yy....b.',
    '..y.....bb',
    '..yy......'],
  box: [
    '..TTTTTTTT',
    '.TTTTWWTTn',
    'TTTTWWTTnn',
    'tttWWtttnN',
    'tttttttnNN',
    'tkkkkttnNN',
    'tttttttnN.',
    'tttttttN..'],
  doener: [
    '..e.l.e...',
    '.lrelrel..',
    'TnnwnnwnT.',
    'TtnnnnnnTt',
    'TTtnnnntTt',
    '.TTttttTt.',
    '..TTTTtt..'],
  brew: [ // Kombucha im Bügelglas
    '...ww...',
    '..hhhh..',
    '..hWWh..',
    '.hoooOh.',
    '.howoOh.',
    '.hoooOh.',
    '.hoowOh.',
    '.hoooOh.',
    '..hhhh..'],
  mould: [ // Schimmelfleck mit Sprühstoß
    '.......w.w',
    '..e...w...',
    '.eEe...w.w',
    'eElEee....',
    '.eEEEe....',
    'eEeElEe...',
    '.eEEEe....',
    '..e.e.....'],
  ticket: [ // Wartenummer
    'WWWWWWWW',
    'WkkWkkkW',
    'WWkWWWkW',
    'WWkWWkWW',
    'WWkWkWWW',
    'WkkkkkkW',
    'WWWWWWWW',
    'W.W.W.W.'],
  helmet: [ // Bauhelm
    '...yyyy...',
    '..yyYyyy..',
    '.yywYyyyy.',
    '.yyyYyyyy.',
    '.yyyYyyyy.',
    'YYYYYYYYYY'],
  crownx: [ // Krone mit Zwangsverwaltungs-Stempel
    'y..y..y...',
    'yy.yy.yy..',
    'yyyyyyyy..',
    'yrywyryy..',
    'yyyyyyyy..',
    'YYYYYrrrrr',
    '.....rwwwr',
    '.....rrrrr'],
  kiez4: [ // vier Köpfe: ganzer Kiez
    '.LL..yy.',
    'LssLyssy',
    '.ss..ss.',
    'bbbbmmmm',
    '.WW..aa.',
    'WssWassa',
    '.ss..ss.',
    'cccceeee'],
  kiez6: [
    'LL.yy.WW.',
    'ss.ss.ss.',
    'bb.mm.cc.',
    '.aa.nn.rr',
    '.ss.ss.ss',
    '.ee.vv.oo'],
  letter: [ // Nachlass: versiegelter Brief
    'WWWWWWWWWW',
    'WhWWWWWWhW',
    'WWhWWWWhWW',
    'WWWhWWhWWW',
    'WWWWrrWWWW',
    'WWWrRRrWWW',
    'WWWWrrWWWW'],
  jute: [
    '...TTTT...',
    '..T....T..',
    '..T....T..',
    'TTTTTTTTTt',
    'TTrTTrTTTt',
    'TrrrrrTTTt',
    'TTrrrTTTTt',
    'TTTrTTTTTt',
    'TTTTTTTTTt',
    'tttttttttt'],
  equip: [ // Pulle und Formular
    '..w..WWWW.',
    '.hhh.WkkW.',
    '.hch.WWWW.',
    'hcccWkkkW.',
    'hcwcWWWWW.',
    'hcccWkkWW.',
    'hcccWWWrW.',
    '.hhh.WWWW.'],
  flame: [
    '....y.....',
    '...yo.....',
    '..yoo..o..',
    '..yooo.oo.',
    '.yoooOooo.',
    '.yoyyoOoo.',
    '.oyyyyoOo.',
    '.oywwyoo..',
    '..oooOO...'],
  poison: [
    '....e....',
    '...eEe...',
    '..elEEe..',
    '.elEEEEe.',
    '.eEkEkEe.',
    '.eEEEEEe.',
    '.eEkkkEe.',
    '..eEEEe..'],
  cloud: [
    '...lll....',
    '..llelll..',
    '.lleeleel.',
    'lleeleeell',
    'leeeleeeel',
    '.leeeeeel.',
    '..eeEEee..',
    '...e..e...'],
  shutter: [ // Späti-Rollladen, zu
    'rrrrrrrrrr',
    'rwwwwwwwwr',
    'hhhhhhhhhh',
    'GGGGGGGGGG',
    'hhhhhhhhhh',
    'GGGGGGGGGG',
    'hhhhyyhhhh',
    'GGGGyYGGGG',
    'hhhhhhhhhh'],
  stairs: [ // Treppenhaus
    '.......ttt',
    '.......nNN',
    '.....tttNN',
    '.....nNNNN',
    '...tttNNNN',
    '...nNNNNNN',
    '.tttNNNNNN',
    '.nNNNNNNNN'],
  bolt: [
    '.....cc',
    '....cc.',
    '...cc..',
    '..cccwc',
    '.wccccc',
    '...cc..',
    '..cc...',
    '.cc....',
    'cc.....'],
  goal: [ // Eigentor
    'wwwwwwwww.',
    'whWhWhWhw.',
    'wWhWhWhWw.',
    'whWhWhWhw.',
    'wWhWhWkkw.',
    'whWhWkwwk.',
    'wWhWhkwkw.',
    '.....kkk..'],
  blueflame: [
    '...c.....',
    '..cc..c..',
    '..cbc.cc.',
    '.cbbcbbc.',
    '.cbwwbbc.',
    '.bwwwwbb.',
    '..bwwbb..',
    '...bbb...'],
  candle: [ // Grabkerze
    '....y....',
    '...yoy...',
    '...ywy...',
    '....k....',
    '.rrrrrrr.',
    '.rwrrrrR.',
    '.rrrrrrR.',
    '.rrrrrRR.',
    '.RRRRRRR.'],
  poo: [ // Tödlicher Fehltritt
    '.h.....h..',
    '..h...h...',
    '....n.....',
    '...nNn....',
    '..nnnNn...',
    '..nNnnn...',
    '.nnnnNnn..',
    'nnNnnnnNn.',
    '.NNNNNNN..'],
  paper: [ // Kleingedrucktes unter der Lupe
    'WWWWWW....',
    'WggggWW...',
    'WWWWWW.hh.',
    'WggWWWh.wh',
    'WWWWWWh..h',
    'WgggWW.hh.',
    'WWWWWWWkk.',
    'WgggWWkk..',
    'WWWWWWW...'],
  bell: [
    '.YYYYYYYY.',
    'YyyyyyyyyY',
    'YyWgWWyGyY',
    'YyyyyyyyyY',
    'YyWWgWyGyY',
    'YyyyyyyyyY',
    'YyWgWWyGyY',
    'YyyyyyyyyY',
    '.YYYYYYYY.'],
  chart: [ // Leistungskurve
    '.......rr.',
    '......rrr.',
    '.....r.r..',
    '....r..yy.',
    '...r.yyyy.',
    '.yy..yyyy.',
    '.yy.yyyyy.',
    '.yyyyyyyy.',
    'hhhhhhhhhh'],
  speech: [ // Gewaltfreie Kommunikation
    '.WWWWWWWW.',
    'WWWrWrWWWW',
    'WWrrrrrWWW',
    'WWrrrrrWWW',
    'WWWrrrWWWW',
    '.WWWrWWWW.',
    '..WW......',
    '.W........'],
  cone: [ // Baustellenbake / Pylon
    '....o....',
    '...ooo...',
    '...www...',
    '..ooooo..',
    '..wwwww..',
    '.ooooooo.',
    'kkkkkkkkk'],
  fish: [
    '......h...',
    '......h...',
    '..bbbbh.bb',
    '.bbbbbhbbc',
    'bwkbbbbbb.',
    '.bbcccbbbc',
    '..bbbb..bb'],
  scythe: [
    '.hhhhh...',
    'hwwwwhh..',
    '.....nhh.',
    '.....n.h.',
    '....n....',
    '....n....',
    '...n.....',
    '...n.....',
    '..n......'],
  cargo: [
    '.......hh.',
    '........h.',
    'bbbbb...h.',
    'bBbBbhhhh.',
    'bbbbb..h..',
    'hhhhhhhh..',
    'GGG....GGG',
    'G.G....G.G',
    'GGG....GGG'],
  glove: [ // Boxhandschuh, Faust nach rechts
    '....rrrr..',
    '..rrrwrrr.',
    'WWrrwrrrrr',
    'WWrrrrrrrr',
    'WWrrrrRrrr',
    'WWrrrrrRrr',
    '..rrRRRrr.',
    '...rrrrr..'],
  binoc: [ // Fernglas
    '.GG..GG.',
    '.GG..GG.',
    'GGGGGGGG',
    'GcwG.GcG',
    'GccG.GcG',
    'GGGG.GGG'],
  contract: [ // Mietvertrag, unbefristet
    'WWWWWWW...',
    'WkkkkWW...',
    'WWWWWWW...',
    'WkkkWWW...',
    'WWWWWyyy..',
    'WkkWyyYyy.',
    'WWWWyYYYy.',
    'WWWWyyYyy.',
    '.....yyy..'],
  contract4: [ // Alle haben unterschrieben
    'WWWWWWWW',
    'WkkkkkkW',
    'WWWWWWWW',
    'WbbWrrWW',
    'WWWWWWWW',
    'WeeWvvWW',
    'WWWWWWWW'],
  fridge: [ // Späti-Kühlschrank, bunt
    'hhhhhhhh',
    'hccccccG',
    'hrcoycgG',
    'hrcoycgG',
    'hhhhhhhG',
    'hebvcpcG',
    'hebvcpcG',
    'hhhhhhhG',
    'hkhhhhkG'],
  guest: [ // Gästeliste auf Klemmbrett
    '...hh...',
    'nnnhhnnn',
    'nWWWWWWn',
    'nWkkWeWn',
    'nWWWWWen',
    'nWkkWeWn',
    'nWWWeWWn',
    'nWkkWWWn',
    'nnnnnnnn'],
  guestheart: [
    '...hh...',
    'nnnhhnnn',
    'nWWWWWWn',
    'nWkkkkWn',
    'nWrWWrWn',
    'nWrrrrWn',
    'nWWrrWWn',
    'nWkkkkWn',
    'nnnnnnnn'],
  die: [
    '.WWWWWWW.',
    'WWkWWWWWh',
    'WWWWWWWWh',
    'WWWWkWWWh',
    'WWWWWWWWh',
    'WWWWWWkWh',
    'WWWWWWWWh',
    '.hhhhhhh.'],
  rat: [
    '.....hh...',
    '....hGGh..',
    '..hhGGGhk.',
    '.hGGGGGGGp',
    'hGGGGGGGh.',
    'hGGGGGGh..',
    '.pphhpp...',
    'p.........'],
  trophy: [
    'yyyyyyyy',
    'yywyyyyY',
    'yyyyyyyY',
    '.yyyyyY.',
    '..yyyY..',
    '...yY...',
    '..YYYY..',
    '.YYYYYY.'],
  dove: [ // Friedlicher Auszug
    '.....ww..',
    '....wwkwo',
    '.w..wwww.',
    'www.www..',
    '.wwwwwww.',
    '..wwwwwh.',
    '...hhhh..',
    '..e......'],
  pick: [
    '..hhhhh...',
    '.hG...Gh..',
    'h...n...h.',
    '....n.....',
    '....n.....',
    '....r.....',
    '....n.....',
    '....n.....'],
  bit: [ // Bohrkopf (Bohrlinde)
    '...hh...',
    '..hwhh..',
    '..hhGh..',
    '.hwhhGh.',
    '.hhhGGh.',
    '..hGGh..',
    '..hGh...',
    '...h....'],
  crown: [
    'y..y..y.',
    'yy.yy.yy',
    'yyyyyyyy',
    'yryyryyy',
    'yyyyyyyy',
    'YYYYYYYY'],
  mirror: [ // Mietspiegel, gesprungen
    '..YYYY..',
    '.YcccwY.',
    'YcccwkcY',
    'YccwkccY',
    'YcwkcccY',
    '.YkcccY.',
    '..YYYY..',
    '...nn...',
    '...nn...'],
  sparkle: ['.w.', 'www', '.w.'],
  cross: ['w...w', '.w.w.', '..w..', '.w.w.', 'w...w'],
};

const FACES = {
  alt: [
    '...LiLLiL...',
    '..LiLLLLiL..',
    '.LLiLLLLiLL.',
    '.LLssssssLL.',
    '.LgckggckgL.',
    '.LssssSsssL.',
    '..ssRRRRss..',
    '...ssssss...',
    '..cccccccc..',
    '.ccwccccwcc.',
    '.cccccwcccc.'],
  expat: [
    '...yyyyyy...',
    '..yyyyyyyy..',
    '.YYYYYYYYYY.',
    '.nsssssssn..',
    '.nvvsssvvn..',
    '.nvkvsvkvn..',
    '.nsssSssss..',
    '..sssRRss...',
    '...ssssss...',
    '..mmmpmmmm..',
    '.mmmmpmmmmm.'].map(r => r.padEnd(12, '.')),
  tourist: [
    '...WWWWWW...',
    '...rrrrrr...',
    'WWWWWWWWWWWW',
    '..ssssssss..',
    '..skssssks..',
    '..sssuusss..',
    '..ssRRRRss..',
    '...ssssss...',
    '..ccpcccoc..',
    '.ccwccccpcc.',
    '.cpccccwccc.'],
  zug: [
    '...aaaaaa...',
    '..aaAaaAaa..',
    '.aaAAAAAAaa.',
    '.aassssssaa.',
    '.aaskssksaa.',
    '.aassssssaa.',
    '.aysppssaa..',
    '..asRRRsaa..',
    '..aassssaa..',
    '..mmpppmmm..',
    '.mmmmmmmmmm.'],
};
const FACE_PAL = {alt: {c: 'a8d0f0'}, expat: {m: '8ce0c0'}, tourist: {c: '3cc8b4'}, zug: {m: '3cc8b4'}};

// badge index -> [motif, extra] ; extra: 'x' adds a red cross-out, 's' adds a sparkle
const BADGES = {
  0: 'face:alt', 1: 'face:expat', 2: 'face:tourist', 3: 'face:zug',
  6: 'swatter', 7: 'swatter', 34: 'swatter', 35: 'swatter', 69: 'swatter',
  8: 'coin', 9: 'coins2', 36: 'stack', 37: 'house', 70: 'houses',
  10: 'drill', 38: 'drill', 39: 'drill', 71: 'drill', 97: 'drill',
  11: 'key', 40: 'key', 41: 'key', 72: 'keys', 98: 'keys',
  12: 'box', 42: 'box', 43: 'box', 73: 'box', 74: 'box',
  13: 'doener', 44: 'doener', 45: 'doener', 75: 'doener', 76: 'doener',
  14: 'brew', 46: 'brew', 47: 'brew', 77: 'brew', 78: 'brew',
  15: 'mould', 48: 'ticket', 49: 'helmet', 79: 'crownx', 54: 'kiez4', 105: 'kiez6', 33: 'letter',
  16: 'jute', 50: 'equip',
  17: 'flame', 18: 'poison', 19: 'cloud', 20: 'shutter', 21: 'stairs',
  51: 'bolt', 52: 'goal', 53: 'blueflame', 81: 'poo', 104: 'candle',
  22: 'paper', 55: 'paper', 85: 'paper', 108: 'paper', 123: 'paper',
  23: 'bell', 56: 'bell', 86: 'bell', 109: 'bell', 124: 'bell',
  24: 'chart', 57: 'chart', 87: 'chart', 110: 'chart', 125: 'chart',
  32: 'speech', 64: 'cone', 65: 'fish', 66: 'scythe', 67: 'cargo', 68: 'glove', 80: 'binoc',
  82: 'contract', 103: 'contract4', 96: 'fridge', 99: 'guest', 101: 'guestheart', 100: 'die',
  102: 'rat', 111: 'trophy', 126: 'trophy', 127: 'trophy', 120: 'dove', 121: 'pick',
  83: 'mould+s', 84: 'ticket+x', 106: 'bit+s', 107: 'crown+s', 122: 'mirror+s',
};
const B_BRICK = ['b85a3c', '7c3424']; // Klingelschild an Klinkerwand
const BADGE_BG = { // own field colours where the upstream one does not fit the new motif [light, dark]
  20: ['4d4d4d', '333333'], 23: B_BRICK, 56: B_BRICK, 86: B_BRICK, 109: B_BRICK, 124: B_BRICK, 52: ['3d7a3d', '285a28'], 96: ['1452cc', '1212b3'],
};
const TROPHY_TINT = {111: ['e0a070', 'a86a3c', 'fff0d8'], 126: ['e8e8f0', 'a8a8b8', 'ffffff'], 127: ['fadc50', 'c89a1c', 'fffbe0']};

function tierOf(i) { return i < 32 ? 0 : i < 64 ? 1 : i < 96 ? 2 : i < 120 ? 3 : 4; }
function cellXY(sheetW, i, size = 16) { const cols = sheetW / size; return [(i % cols) * size, Math.floor(i / cols) * size]; }

function badges() {
  const up = upstream('interfaces/badges.png'), out = clone(up);
  const P = (i, x, y) => { const [cx, cy] = cellXY(128, i); return key(get(up, cx + x, cy + y)); };
  // field template per tier from a clean reference cell (coin / arrow badges)
  const REF = [8, 36, 70, 97, 122];
  const templ = REF.map((ref, t) => {
    const light = P(ref, 7, 3); let dark = null;
    for (let y = 12; y > 8 && !dark; y--) for (const x of [4, 11]) { const v = P(ref, x, y); if (v !== light && !v.endsWith(',0')) { dark = v; break; } }
    const bg = new Set([light, dark]);
    // field mask: bg pixels + enclosed holes
    const inB = Array.from({length: 16}, (_, y) => Array.from({length: 16}, (_, x) => bg.has(P(ref, x, y))));
    const reach = Array.from({length: 16}, () => Array(16).fill(false)); const st = [];
    for (let k = 0; k < 16; k++) st.push([k, 0], [k, 15], [0, k], [15, k]);
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x > 15 || y > 15 || reach[y][x] || inB[y][x]) continue; reach[y][x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    const mask = inB.map((r, y) => r.map((v, x) => v || !reach[y][x]));
    // per row: 'L', 'D' or dither 'LD' with the parity of the light pixels
    const rows = mask.map((r, y) => {
      let l = 0, d = 0, par = 0;
      r.forEach((m, x) => { if (!m) return; const v = P(ref, x, y); if (v === light) { l++; par += (x + y) & 1; } else if (v === dark) d++; });
      if (!l && !d) return null; if (!d) return 'L'; if (!l) return 'D'; return par * 2 > l ? 'L1' : 'L0';
    });
    for (let y = 0; y < 16; y++) if (!rows[y]) rows[y] = rows[y - 1] || 'L';
    if (!['L', 'D', 'L0', 'L1'].includes(rows[4])) throw new Error('tier ' + t);
    return {mask, rows};
  });
  const TIERMASK = templ.map(t => t.mask);
  for (const [idx, spec] of Object.entries(BADGES)) {
    const i = +idx, t = tierOf(i), {mask, rows} = templ[t], [cx, cy] = cellXY(128, i);
    const inside = (x, y) => x >= cx && y >= cy && x < cx + 16 && y < cy + 16 && mask[y - cy][x - cx];
    // field colours
    let light, dark;
    if (BADGE_BG[i]) [light, dark] = BADGE_BG[i].map(C);
    else {
      const cnt = new Map(), cnt2 = new Map();
      for (let x = 2; x < 14; x++) { if (mask[3][x]) { const v = P(i, x, 3); cnt.set(v, (cnt.get(v) || 0) + 1); } }
      light = [...cnt].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
      for (let y = 9; y < 15; y++) for (const x of [2, 3, 12, 13]) if (mask[y][x] && rows[y] === 'D') { const v = P(i, x, y); cnt2.set(v, (cnt2.get(v) || 0) + 1); }
      dark = cnt2.size ? [...cnt2].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number) : shade(light, 0.7).concat(255);
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (!mask[y][x]) continue;
      const r = rows[y]; let c = light;
      if (r === 'D') c = dark; else if (r === 'L0' || r === 'L1') c = ((x + y) & 1) === (r === 'L1' ? 1 : 0) ? light : dark;
      set(out, cx + x, cy + y, c);
    }
    const [name, extra] = spec.split('+');
    if (name.startsWith('face:')) {
      const f = FACES[name.slice(5)], [w] = dims(f);
      paint(out, cx + ((16 - w) >> 1), cy + 2, f, FACE_PAL[name.slice(5)], inside);
      continue;
    }
    const m = BM[name]; if (!m) throw new Error('motif ' + name);
    const [w, h] = dims(m), ox = cx + ((16 - w) >> 1), oy = cy + 2 + ((11 - h) >> 1);
    const ol = [...shade(dark, 0.45), 255];
    let pal = {};
    if (name === 'trophy') { const [a, b, hi] = TROPHY_TINT[i]; pal = {y: a, Y: b, w: hi}; }
    outline(out, ox, oy, m, ol, inside);
    paint(out, ox, oy, m, pal, inside);
    if (extra === 'x') paint(out, ox + w - 5, oy + h - 5, BM.cross.map(r => r.replace(/w/g, 'r')), {}, inside);
    if (extra === 's') { outline(out, cx + 11, cy + 2, BM.sparkle, ol, inside); paint(out, cx + 11, cy + 2, BM.sparkle, {}, inside); }
  }
  return {'interfaces/badges.png': out, _up: {'interfaces/badges.png': up}, _mask: TIERMASK};
}

// ================================================================ hero and talent icons
// Big pictograms (subclasses, armor abilities, class talents). Black 1px outline is added
// automatically. Keys are referenced from HERO_ICONS and TALENTS below.
const TM = {
  // ---- subclasses (hero_icons 0-7, talent columns 11-16)
  wut: [ // Wutbürgerin: rotes Wutgesicht mit Dampf
    'w..........w',
    '.w.rrrrrr.w.',
    '..rrrrrrrr..',
    '.rxxrrrrxxr.',
    'rrrxxrrxxrrr',
    'rrwwrrrrwwrr',
    'rrwxrrrrxwrr',
    'rrrrrrrrrrrr',
    'rrrrxxxxrrrr',
    'rrrxrrrrxrrr',
    '.rrrrrrrrrr.',
    '..rrrrrrrr..'],
  glove: [ // Kiezboxerin
    '...rrrrrr...',
    '..rrwwrrrr..',
    '.rrwrrrrrrr.',
    '.rwrrrrrrrrr',
    '.rrrrrrrrrrr',
    'rrrrrrrrRrrr',
    'rRrrrrrRrrrr',
    'rrRRrrrRrrrr',
    '.rrrRRRrrrr.',
    '..rrrrrrrr..',
    '..WWWWWWWW..',
    '..WxWxWxWW..',
    '..WWWWWWWW..'],
  selfie: [ // Hands-on-Gründer: Selfie-Stick als Knüppel
    '.........xxx',
    '........xvvx',
    '.......xvwvx',
    '......xvvvx.',
    '.....hxxxx..',
    '....hh...y..',
    '...hh...yoy.',
    '..hh.....y..',
    '.hh..y......',
    'hh..yoy.....',
    'h....y......'],
  growth: [ // Growth-Hacker: Hockeyschläger-Kurve
    '.......vvvvv',
    '........vvvv',
    '.......vvvvv',
    '......vvv.vv',
    '.....vvv...v',
    '....vvv.....',
    'v..vvv......',
    'vvvvv.......',
    '.vvv........'],
  camera: [ // Schnappschütze
    '..........y.',
    '...GGG...yyy',
    '..GGGGG...y.',
    'GGGGGGGGGGGG',
    'GhhhGGGGhhhG',
    'GhhGcccGhhhG',
    'GhGcbbbcGhhG',
    'GhGcbwbcGhhG',
    'GhGcbbbcGhhG',
    'GhhGcccGhhhG',
    'GGGGGGGGGGGG'],
  sandal: [ // Sightseeing-Sprinter: Socke in Sandale
    '......WWW...',
    '......WWW...',
    '......WhW...',
    '......WWW...',
    'www...WWWW..',
    '.....nWWWWW.',
    'www.nWWWWWWW',
    '...nnnnnnnnn',
    'ww.NNNNNNNNN'],
  tape: [ // Abstandshalterin: Maßband
    '..oooooo....',
    '.oooooooo...',
    'ooowwwwooo..',
    'oowwGGwwoo..',
    'oowGGGGwoo..',
    'oowwGGwwoo..',
    'ooowwwwoooyy',
    '.oooooooOyyy',
    '..OOOOOOyxyx',
    '........yyyy'],
  treebed: [ // Baumscheibenpatin
    '...eeeee....',
    '..eelleee...',
    '.eelEEeeee..',
    '.eEeeeeEee..',
    '..eeeEeee...',
    '.....nn.....',
    '.....nn.....',
    '.n...nn...n.',
    '.nprennerpn.',
    '.nnnnnnnnnn.',
    '.n........n.'],
  // ---- armor abilities (hero_icons 16-27, talent columns 17-25)
  leap: [ // Sprung übern Hof
    '...yyyyy.....',
    '.yyy...yyy...',
    'yy.......yy..',
    'y.........y..',
    'y.......yyyyy',
    '.........yyy.',
    '..........y..',
    '.............',
    'nnnnnnnnnnnnn',
    'nNnnnNnnnNnnn',
    'nnnnnnnnnnnnn',
    'NnnnNnnnNnnnN'],
  broom: [ // Ruhe da unten! Besenstiel klopft auf den Boden
    '..yYyYyYyY..',
    '..yYyYyYyY..',
    '...yYyYyY...',
    '....rrrr....',
    '.....nn.....',
    '.....nn.....',
    '.....nn.....',
    '.....nn.....',
    '.w...nn...w.',
    'w.w..nn..w.w',
    'hhhhhhhhhhhh',
    'gggggggggggg'],
  chair: [ // Aussitzen: Ohrensessel
    '..RRRRRRRR..',
    '.RrrrrrrrrR.',
    '.RrrrrrrrrR.',
    'RRrrrrrrrrRR',
    'RrRrrrrrrRrR',
    'RrRRRRRRRRrR',
    'RrrrrrrrrrrR',
    'RRRRRRRRRRRR',
    'N..........N'],
  burst: [ // Disruption
    '.....y......',
    '.y...y...y..',
    '..y.yoy.y...',
    '...yooooy...',
    '..yoowwooy..',
    'yyoowwwwooyy',
    '..yoowwooy..',
    '...yooooy...',
    '..y.yoy.y...',
    '.y...y...y..',
    '.....y......'],
  bulb: [ // Brainstorming
    'r...yyyy...b',
    '...ywwyyy...',
    '..ywyyyyyy..',
    'e.yyyyyyyy.v',
    '..yyyyyyyy..',
    '...yyyyyy...',
    '....yyyy....',
    '....hhhh....',
    '....gggg....',
    '....hhhh....',
    '.....gg.....'],
  homeoffice: [ // Homeoffice-Anker: Laptop mit Standort-Pin
    '.......rrr..',
    '......rrwrr.',
    '......rrrrr.',
    '.......rrr..',
    '.hhhhhhhrhh.',
    '.hccccccccg.',
    '.hcwccccccg.',
    '.hccccccccg.',
    '.hggggggggg.',
    'hhhhhhhhhhhh',
    'gggggggggggg'],
  flash: [ // Blitzlicht
    '.....w.....',
    '.w...w...w.',
    '..w..w..w..',
    '...wyyyw...',
    '....yww....',
    'wwwywwwywww',
    '....yww....',
    '...wyyyw...',
    '..w..w..w..',
    '.w...w...w.',
    '.....w.....'],
  pin: [ // Roter Pin
    '...rrrrr...',
    '..rrrrrrr..',
    '.rrwwrrrrr.',
    '.rwwwrrrrr.',
    '.rrwrrrrrr.',
    '.rrrrrrrRr.',
    '..rrrrrRr..',
    '...rrrrr...',
    '....rrr....',
    '....rRr....',
    '.....r.....'],
  twohats: [ // Partnerlook: zwei gleiche Sonnenhüte
    '..WWWW......',
    '..rrrr......',
    'WWWWWWWW....',
    '............',
    '......WWWW..',
    '......rrrr..',
    '....WWWWWWWW',
    '............',
    '...w....w...',
    '..www..www..'],
  blades: [ // Upcycling-Klingen: drei Cutterklingen aus Blech
    'm....mm....m',
    'mm...mm...mm',
    '.mm..mm..mm.',
    '.mwm.mw.mwm.',
    '..mm.mm.mm..',
    '...mmmmmm...',
    '....oooo....',
    '....oOOo....',
    '.....oo.....'],
  solar: [ // Balkonkraftwerk
    '..........y.',
    '..BBBBBBByyy',
    '.BbBbBbBBBy.',
    '.BBBBBBBBB..',
    'BbBbBbBbB...',
    'BBBBBBBBB...',
    '..h....h....',
    'hhhhhhhhhhhh',
    'h..h..h..h.h',
    'h..h..h..h.h',
    'hhhhhhhhhhhh'],
  pigeon: [ // Geistertaube
    '......ccc...',
    '.....cwxcy..',
    '.....cccc...',
    '....ccmc....',
    '.ccccccc....',
    'cccCcccc....',
    '.cCCcccc....',
    '..cccccc....',
    '...cccc.....',
    '....y.y.....'],
  // ---- class talents, Alteingesessene
  stulle: [ // Schmalzstulle
    '.nnnnnnn...',
    'nttttttnn..',
    'ntWWWWWtn..',
    'ntWWWWWtn..',
    'ntWwWWWtn..',
    'ntWWWWWtn..',
    'nttttttnn..',
    '.nnnnnnn...'],
  specs: [ // Kenn ick schon: Brille
    '............',
    'GGGGG..GGGGG',
    'GccwG..GccwG',
    'GcccGGGGcccG',
    'GcccG..GcccG',
    'GGGGG..GGGGG'],
  enough: [ // Jetzt reicht's aber: Sprechblase !!
    '.WWWWWWWWW.',
    'WWWrWWWrWWW',
    'WWWrWWWrWWW',
    'WWWrWWWrWWW',
    'WWWWWWWWWWW',
    'WWWrWWWrWWW',
    '.WWWWWWWWW.',
    '..WW.......',
    '.W.........'],
  door: [ // Ick wohn hier: Altbau-Haustür
    '..nnnnnn..',
    '.nccnnccn.',
    '.nccnnccn.',
    '.nnnnnnnn.',
    '.nNNnnNNn.',
    '.nNNnnNNn.',
    '.nNNnnyNn.',
    '.nNNnnNNn.',
    '.nNNnnNNn.',
    '.nnnnnnnn.'],
  curry: [ // Currywurstmagen
    '.......r..',
    '......r...',
    '.rrRrrrRr.',
    'rrnyrrnyrr',
    'rRrrnrrrRr',
    'WWWWWWWWWW',
    '.WhhhhhhW.',
    '..WWWWWW..'],
  beer: [ // Wegbier
    '...gg...',
    '...nn...',
    '...nn...',
    '..nnnn..',
    '.nnnnnn.',
    '.nWWWWn.',
    '.nWrrWn.',
    '.nWWWWn.',
    '.nnnnnn.',
    '.NNNNNN.'],
  patch: [ // Aufnäher-Umzug
    '..rrrrr.....',
    '.rWWWWWr....',
    'rWWrWrWWr...',
    'rWrrrrrWr...',
    'rWWrrrWWr...',
    'rWWWrWWWr...',
    '.rWWWWWr....',
    '..rrrrr.yy..',
    '.......yyyy.',
    '........yy..'],
  sponge: [ // In einem Abwasch: Schwamm mit Schaum
    '.w..w..w..',
    'w.ww.ww.w.',
    '.yyyyyyyy.',
    '.yYyyYyyy.',
    '.yyyyyYyy.',
    '.eeeeeeee.',
    '.EEEEEEEE.'],
  window: [ // Aus dem Fenster geworfen
    'WWWWWWW.....',
    'WccWccW.....',
    'WccWccW..nn.',
    'WWWWWWW.nnnn',
    'WccWccW.nnnn',
    'WccWcc...nn.',
    'WWWWWW...e..',
    '.........e..'],
  campchair: [ // Hier geh ick nich weg: Klappstuhl auf dem Gehweg
    '..bbbbbb....',
    '..bwbbbb....',
    '..bbbbbb....',
    '..bbbbbb....',
    '.hbbbbbbbh..',
    '.hbbbbbbbh..',
    '..h.....h...',
    '...h...h....',
    '....h.h.....',
    '...h...h....',
    '..h.....h...'],
  coal: [ // Kohlenschlepperin: Eimer Briketts
    '..GkGkGkG..',
    '.GkGGkGGkG.',
    '.gggggggggg',
    '.hhhhhhhhhg',
    '..hgggggg..',
    '..hgggggg..',
    '..hgggggg..',
    '...hhhhh...'],
  // ---- class talents, Expat
  bowl: [ // Power-Lunch: Bowl
    '..e.o.l...',
    '.eleoerel.',
    'wwwwwwwwwww',
    '.hwwwwwwh.',
    '..hwwwwh..',
    '...hhhh...'],
  notebook: [ // Quick Learner
    'hvvvvvvv..',
    'hvwwwwwv..',
    'hvvvvvvv..',
    'hvvvvvvv.y',
    'hvvvvvvvyy',
    'hvvvvvvyy.',
    'hvvvvvvvyy',
    'hvvvvvvv.y',
    'hvvvvvvv..'],
  phone: [ // Follow-up-Call
    '..GGGG...w..',
    '.GccccG.w.w.',
    '.GcccwG..w..',
    '.GccccG.w.w.',
    '.GccccG.....',
    '.GccccG.....',
    '.GccccG.....',
    '.GGhGGG.....'],
  planb: [ // Plan B: Flipchart
    '.hhhhhhhhh.',
    '.WWWWWWWWW.',
    '.WWbbbbWWW.',
    '.WWbWWWbWW.',
    '.WWbbbbWWW.',
    '.WWbWWWbWW.',
    '.WWbbbbWWW.',
    '.WWWWWWWWW.',
    '..g.....g..',
    '.g.......g.'],
  matcha: [ // Matcha-Boost
    '...w.w....',
    '....w.....',
    '.WWWWWWW..',
    '.WeeeeeWWW',
    '.WelleeW.W',
    '.WeeeeeWWW',
    '..WWWWW...',
    '.hhhhhhh..'],
  whitepaper: [ // Whitepaper-Power
    'WWWWWWW...',
    'WgggggWW..',
    'WWWWWWWWW.',
    'WgggWWyWW.',
    'WWWWWyyWW.',
    'WgggyyyyW.',
    'WWWWWyyWW.',
    'WgggWyWWW.',
    'WWWWWWWWW.'],
  exit: [ // Exit-Strategie: Notausgangsschild
    'eeeeeeeeeeee',
    'ewwwweeeewee',
    'ewEEweeewwwe',
    'ewEEweewweee',
    'ewEEweeewwee',
    'ewEEweewewee',
    'ewEEwewweewe',
    'eeeeeeeeeeee'],
  radar: [ // Stakeholder-Radar
    '...eeeee...',
    '..eEEEEEe..',
    '.eEEEeEEEe.',
    'eEEEEeEEEle',
    'eEeeeweEEEe',
    'eEEEEeEEEEe',
    '.eEEEeEEEe.',
    '..eEEEEEe..',
    '...eeeee...'],
  burnrate: [ // Burn Rate: Akku mit Flamme
    '....o.....',
    '...ooy....',
    '..oyyoo...',
    '.oyywyo...',
    'hhhhhhhhh.',
    'hrrggggghh',
    'hrrggggghh',
    'hhhhhhhhh.'],
  stopwatch: [ // Last-Minute-Pitch
    '....hh....',
    '...hhhh...',
    '..WWWWWW..',
    '.WWWkWWWW.',
    '.WWWkWWWW.',
    '.WWWkkkWW.',
    '.WWWWWWWW.',
    '.WWWWWWrW.',
    '..WWWWWW..'],
  hotdesk: [ // Hot Desking: Schreibtisch mit Tauschpfeilen
    '.y.......y..',
    'yyy.....yyy.',
    '.y.......y..',
    '.yyyyyyyyy..',
    '............',
    'nnnnnnnnnnnn',
    'n.hh......n.',
    'n.hh......n.',
    'n.........n.'],
  // ---- class talents, Tourist
  togo: [ // Frühstück to go
    '..hhhhhh..',
    '.hhhhhhhh.',
    '..WWWWWW..',
    '..WnnnnW..',
    '..WnWWnW..',
    '..WnnnnW..',
    '...WWWW...',
    '...WWWW...'],
  snowglobe: [ // Souvenirblick: Schneekugel mit Fernsehturm
    '...cccc...',
    '..cwcgcc..',
    '.ccccgwcc.',
    '.cwcgggcc.',
    '.ccccgccw.',
    '.cwccgcwc.',
    '..cwwwww..',
    '.nnnnnnnn.',
    '.NNNNNNNN.'],
  surprise: [ // Überraschungsbesuch: Knallbonbon-Konfetti
    '.r..y...b.',
    '...b..e...',
    '.y..r...y.',
    '..v...o...',
    '...ppp....',
    '..pppp....',
    '.pppp.....',
    'ppp.......'],
  umbrella: [ // Im Schatten der Reisegruppe: Guide-Schirm
    '.....h......',
    '...rrwrrr...',
    '.rrrwrrrrrr.',
    'rrrwrrrrrrrr',
    'rRRrRRrRRrRR',
    '......G.....',
    '......G.....',
    '......G.....',
    '......G.....',
    '..G...G.....',
    '...GGG......'],
  fries: [ // Streetfood-Magie: Pommes rot-weiß
    '.y.y.y.y..',
    '.yyyyyyy..',
    '.yywyyrry.',
    'rrrrrrrrr.',
    'rwrrrrrrr.',
    '.rrrrrrr..',
    '.rrrrrrr..',
    '..rrrrr...'],
  guide: [ // Reiseführer-Tarnung
    'rrrrrrrrW.',
    'rrrrrrrrW.',
    'rrwwwwrrW.',
    'rrrrrrrrW.',
    'rryyyyrrW.',
    'rrrrrrrrW.',
    'rrrrrrrrW.',
    'RRRRRRRRW.'],
  lens: [ // Weitwinkel
    '...GGGGG...',
    '..GcccccG..',
    '.GcbbbbbcG.',
    'GcbBBBBbbcG',
    'GcbBwBBbbcG',
    'GcbBBBBbbcG',
    '.GcbbbbbcG.',
    '..GcccccG..',
    '...GGGGG...'],
  trolley: [ // Flüsterrollkoffer
    '...hhhh...',
    '...h..h...',
    '.bbbbbbbb.',
    '.bBbbbbBb.',
    '.bBbbbbBb.',
    '.bBbbbbBb.',
    '.bBbbbbBb.',
    '.bbbbbbbb.',
    '..G....G..'],
  map: [ // Geheimtipp: Karte mit Kreuz
    'TTTtTTTtTT',
    'TeeTtTTtTT',
    'TeeTtrTrTT',
    'TTTtTTrTtT',
    'TbbtTrTrtT',
    'TbbbTTTTtT',
    'TTTtTTTtTT'],
  keyring: [ // Souvenir-Boost: Schlüsselanhänger mit Bär
    '..hhhh......',
    '.h....h.....',
    '.h....h.....',
    '..hhhhn.....',
    '.....nnn.n..',
    '....nnnnnn..',
    '....nwnwn...',
    '...nnnnnnn..',
    '....nnnnn...',
    '....n...n...'],
  poncho: [ // Poncho in der Bauchtasche
    '....ccc....',
    '...cwwcc...',
    '...cssc....',
    '..ccccccc..',
    '.cwccccccc.',
    'cwcccccccCc',
    'ccccccccccC',
    '...ooooo...',
    '...oOkOo...'],
  // ---- class talents, Zugezogene
  berries: [ // Bahndamm-Beeren
    '....e.....',
    '...eEe....',
    '..VvV.VvV.',
    '.VvwVVvwV.',
    '.VvVvVvVV.',
    '..VvV.VvV.',
    '...V...V..'],
  pricetag: [ // Flohmarktblick
    '.......yy..',
    '......y..y.',
    '.....TTTTT.',
    '....TTTTTTT',
    '...TTkTkTTT',
    '..TTTkTkTT.',
    '.TTTTTTTT..',
    '.TTkkTTT...',
    '..TTTTT....',
    '...TTT.....'],
  chevrons: [ // Nachsetzen
    'yy...yy...',
    '.yy...yy..',
    '..yy...yy.',
    '...yy...yy',
    '..yy...yy.',
    '.yy...yy..',
    'yy...yy...'],
  balcony: [ // Balkongrün
    '.e..e..e..',
    'eEe.eEe.e.',
    '.e.eEe.eEe',
    'nnnnnnnnnn',
    'nNNNNNNNNn',
    '.nnnnnnnn.',
    'hhhhhhhhhh',
    'h.h.h.h.hh'],
  smoothie: [ // Smoothie-Schub
    '......r...',
    '.....r....',
    '.hhhrhh...',
    '.hpppppph.',
    '.hppwppph.',
    '..hppph...',
    '..hpppph..',
    '...hhhh...'],
  canister: [ // Guerilla-Gießkanne
    '..eeee.....w',
    '.e....e...ww',
    '.eeeeeee.ew.',
    '.eEEEEEe.e..',
    'eeEEEEEeee..',
    'e.EEEEEee...',
    'eeEEEEEe....',
    '..eeeeee....'],
  trowel: [ // Baumscheibenpflege
    '.......e..',
    '......eEe.',
    '.......e..',
    '....h.....',
    '...hhh....',
    '..hhhhh...',
    '...hhh....',
    '....n.....',
    '....n.....',
    '....N.....'],
  ear: [ // Nachbarschaftsgespür
    '..ssss....',
    '.ssSSss...',
    'ssS..Ss.w.',
    'sS.ss.s..w',
    'sS.sSss.w.',
    'ssS.Ss...w',
    '.ssSSs..w.',
    '..sss.....',
    '...ss.....'],
  recycle: [ // Upcycling
    '....eee...',
    '...e...e..',
    '..e.....eE',
    '.eEe...eEE',
    '..e.......',
    '.........e',
    'EEe...eEe.',
    'Ee.....e..',
    '..e...e...',
    '...eee....'],
  floor: [ // Zu nah dran: Abstandsaufkleber
    'y.........',
    '.n.rrrr...',
    '..nwwwwr..',
    '.rwnrrwwr.',
    '.rwrnrrwr.',
    '.rwrrkrwr.',
    '.rwwrrwwr.',
    '..rwwwwr..',
    '...rrrr...'],
  viewing: [ // Vorab-Besichtigung: Wohnungsfenster mit Auge
    'WWWWWWWWWW',
    'WccccWcccW',
    'WcWWWWWccW',
    'WWbbxbbWWW',
    'WcWWWWWccW',
    'WccccWcccW',
    'WWWWWWWWWW'],
};

// hero_icons.png: index -> [motif, background]
const HERO_ICONS = {
  0: ['wut', '3a1418'], 1: ['glove', '5a5a64'], 2: ['selfie', 'f0d060'], 3: ['growth', '2a1a3a'],
  4: ['camera', 'a8d8e8'], 5: ['sandal', '3aa0a0'], 6: ['tape', '2a4a2a'], 7: ['treebed', '2e6a36'],
  16: ['leap', 'b8b0a0'], 17: ['broom', 'f0d8a0'], 18: ['chair', '8a3a2a'],
  19: ['burst', 'd84a1a'], 20: ['bulb', '4a2a6a'], 21: ['homeoffice', '6a4ab0'],
  22: ['flash', '404050'], 23: ['pin', 'a8c8a8'], 24: ['twohats', '3ab4c0'],
  25: ['blades', '7a2a6a'], 26: ['solar', '8ac0f0'], 27: ['pigeon', '283050'],
  // action indicator icons (transparent background)
  104: ['wut', null], 105: ['glove', null], 106: ['camera', null], 107: ['sandal', null],
};
// talent_icons.png: unique class talents (background colour kept from upstream per cell)
const TALENTS = {
  0: 'stulle', 1: 'specs', 2: 'enough', 3: 'door', 4: 'curry', 5: 'beer', 6: 'patch', 7: 'sponge', 8: 'window', 9: 'campchair', 10: 'coal',
  32: 'bowl', 33: 'notebook', 34: 'phone', 35: 'planb', 36: 'matcha', 37: 'whitepaper', 38: 'exit', 39: 'radar', 40: 'burnrate', 41: 'stopwatch', 42: 'hotdesk',
  64: 'togo', 65: 'snowglobe', 66: 'surprise', 67: 'umbrella', 68: 'fries', 69: 'guide', 70: 'lens', 71: 'trolley', 72: 'map', 73: 'keyring', 74: 'poncho',
  96: 'berries', 97: 'pricetag', 98: 'chevrons', 99: 'balcony', 100: 'smoothie', 101: 'canister', 102: 'trowel', 103: 'ear', 104: 'recycle', 105: 'floor', 106: 'viewing',
};
// meals keep the upstream effect overlay (heal cross, shield, charge ...), extracted per column
const MEAL_COLS = [0, 4];
// subclass / ability talent groups: first talent cell -> hero icon it shares the pictogram with
const GROUPS = {};
[[0, 1, 16, 17, 18], [2, 3, 19, 20, 21], [4, 5, 22, 23, 24], [6, 7, 25, 26, 27]].forEach((h, row) =>
  h.forEach((hero, k) => { GROUPS[row * 32 + 11 + 3 * k] = hero; }));

function cellPx(im, i) { const [cx, cy] = cellXY(im.w, i); return (x, y) => get(im, cx + x, cy + y); }
function modeOf(list) { const m = new Map(); list.forEach((v, n) => { const k = key(v); const e = m.get(k) || {n: 0, v, first: n}; e.n++; m.set(k, e); }); return [...m.values()].sort((a, b) => b.n - a.n || a.first - b.first)[0].v; }
// overlay = pixels of a cell that differ from the per-pixel mode of its group (first member wins ties)
function overlayOf(up, cell, group, extra = null) {
  const pxs = group.map(i => cellPx(up, i)), me = cellPx(up, cell), out = [];
  for (let y = 5; y < 16; y++) for (let x = 5; x < 16; x++) {
    const vals = (extra ? [extra(x, y)] : []).concat(pxs.map(p => p(x, y)));
    const base = modeOf(vals), v = me(x, y);
    if (key(v) !== key(base)) out.push([x, y, v]);
  }
  return out;
}
function drawIcon(im, i, motif, bg, alphaFrom, {overlay = null, align = 'center'} = {}) {
  const [cx, cy] = cellXY(im.w, i), m = TM[motif]; if (!m) throw new Error('motif ' + motif);
  const alpha = cellPx(alphaFrom, i);
  const inside = (x, y) => alpha(x - cx, y - cy)[3] > 0 || bg === null;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const a = alpha(x, y)[3];
    set(im, cx + x, cy + y, bg === null ? [0, 0, 0, 0] : a ? [...rgb(bg), a] : [0, 0, 0, 0]);
  }
  const [w, h] = dims(m);
  const ox = cx + (align === 'tl' ? Math.max(1, Math.min(2, 14 - w)) : (16 - w) >> 1);
  const oy = cy + (align === 'tl' ? Math.max(1, Math.min(2, 14 - h)) : (16 - h) >> 1);
  outline(im, ox, oy, m, [0, 0, 0, 255], (x, y) => x >= cx && y >= cy && x < cx + 16 && y < cy + 16 && inside(x, y));
  paint(im, ox, oy, m, {}, (x, y) => x >= cx && y >= cy && x < cx + 16 && y < cy + 16 && inside(x, y));
  if (overlay && overlay.length) {
    const on = new Set(overlay.map(([x, y]) => x + ',' + y));
    for (const [x, y, v] of overlay) set(im, cx + x, cy + y, v);
    for (const [x, y] of overlay) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx > 15 || ny > 15 || on.has(nx + ',' + ny) || !alpha(nx, ny)[3]) continue;
      set(im, cx + nx, cy + ny, [0, 0, 0, 255]);
    }
  }
}
function heroIcons() {
  const up = upstream('interfaces/hero_icons.png'), out = clone(up);
  for (const [i, [motif, bg]] of Object.entries(HERO_ICONS)) drawIcon(out, +i, motif, bg, up);
  return {out, up};
}
function iconSheets() {
  const {out: hero, up: heroUp} = heroIcons();
  const up = upstream('interfaces/talent_icons.png'), out = clone(up);
  const bgOf = i => { // most common colour on the cell border (rounded corners skipped)
    const p = cellPx(up, i), list = [];
    for (let k = 2; k < 14; k++) list.push(p(k, 1), p(k, 14), p(1, k), p(14, k));
    return modeOf(list.filter(v => v[3] > 0));
  };
  const hexOf = c => c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
  for (const [i, motif] of Object.entries(TALENTS)) {
    const cell = +i, col = cell % 32;
    let ov = null;
    if (MEAL_COLS.includes(col)) ov = overlayOf(up, cell, [0, 1, 2, 3, 4, 5].map(r => r * 32 + col));
    drawIcon(out, cell, motif, hexOf(bgOf(cell)), up, {overlay: ov, align: ov ? 'tl' : 'center'});
  }
  for (const [first, heroIdx] of Object.entries(GROUPS)) {
    const f = +first, g = [f, f + 1, f + 2], heroPx = cellPx(heroUp, heroIdx);
    const [motif, bg] = HERO_ICONS[heroIdx];
    for (const cell of g) drawIcon(out, cell, motif, bg, up, {overlay: overlayOf(up, cell, g, heroPx)});
  }
  return {'interfaces/hero_icons.png': hero, 'interfaces/talent_icons.png': out,
    _up: {'interfaces/hero_icons.png': heroUp, 'interfaces/talent_icons.png': up}};
}

// ================================================================ frames (chrome, panes, toolbar)
// Upstream frames are a green-grey stone. Here they become warm Altbau plaster/concrete
// (same luminance per pixel, so text contrast in windows stays as it was); window corner
// studs become brass screw heads like on a Klingelschild. Pure greys (shield bar, silver
// window), reds (HP, menu button), yellows (XP) and every alpha value stay untouched.
const isStone = ([r, g, b, a]) => {
  if (!a) return false;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return mx - mn <= 26 && g >= r && g - b >= 3;
};
function warmStone([r, g, b, a]) {
  const L = lum(r, g, b), s = Math.max(r, g, b) - Math.min(r, g, b) + 6; // a little more chroma than upstream
  const c = [L + 0.62 * s, L - 0.02 * s, L - 0.78 * s];
  const k = L / Math.max(1, lum(...c)); // keep luminance exactly
  return [...c.map(v => Math.max(0, Math.min(255, Math.round(v * k)))), a];
}
const BRASS = [[0, '3a2a10'], [60, '6e5222'], [110, 'a8862e'], [150, 'd8b448'], [200, 'f6e27a'], [255, 'fff6c0']];
function brass(c) {
  const L = lum(c[0], c[1], c[2]);
  const f = BRASS.map(([l, h]) => [l, rgb(h)]);
  for (let i = 1; i < f.length; i++) if (L <= f[i][0]) {
    const t = (L - f[i - 1][0]) / (f[i][0] - f[i - 1][0]);
    return [...mix(f[i - 1][1], f[i][1], t), c[3]];
  }
  return [...f[f.length - 1][1], c[3]];
}
function restone(im, brassRects = []) {
  const inBrass = (x, y) => brassRects.some(([bx, by, bw, bh]) => x >= bx && y >= by && x < bx + bw && y < by + bh);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const c = get(im, x, y);
    if (!isStone(c)) continue;
    set(im, x, y, inBrass(x, y) ? brass(warmStone(c)) : warmStone(c));
  }
  return im;
}
function sameAlpha(a, b, rel, skip = null) { // skip: [x, y, w, h] redrawn icon area
  for (let i = 3; i < a.px.length; i += 4) {
    const p = (i - 3) / 4, x = p % a.w, y = (p / a.w) | 0;
    if (skip && x >= skip[0] && y >= skip[1] && x < skip[0] + skip[2] && y < skip[1] + skip[3]) continue;
    if (a.px[i] !== b.px[i]) throw new Error(rel + ': alpha changed at ' + x + ',' + y);
  }
}
// Jutebeutel instead of the leather backpack (toolbar inventory button, 16x16 at 160,0)
const JUTE_ICON = [
  '................',
  '.....NNNNNN.....',
  '....NTttttTN....',
  '....NT....TN....',
  '..NNNTNNNNTNNN..',
  '..NTTTTTTTTTtN..',
  '..NTTTTTTTTTtN..',
  '..NTTTrTTrTTtN..',
  '..NTTrrrrrrTtN..',
  '..NTTrrrrrrTtN..',
  '..NTTTrrrrTTtN..',
  '..NTTTTrrTTTtN..',
  '..NTTTTTTTTTtN..',
  '..NtttttttttNN..',
  '...NNNNNNNNNN...',
  '................'];
function frames() {
  const out = {}, ups = {};
  const plain = ['chrome', 'status_pane', 'toolbar', 'menu_button', 'menu_pane', 'talent_button', 'boss_hp', 'radial_menu'];
  for (const n of plain) {
    const rel = `interfaces/${n}.png`, up = upstream(rel), im = clone(up);
    // chrome WINDOW (0,0,20,20): the four 5x5 corner studs become brass screw heads
    const brassRects = n === 'chrome' ? [[0, 0, 5, 5], [15, 0, 5, 5], [0, 15, 5, 5], [15, 15, 5, 5]] : [];
    restone(im, brassRects);
    if (n === 'toolbar') {
      for (let y = 0; y < 16; y++) for (let x = 160; x < 176; x++) set(im, x, y, [0, 0, 0, 0]);
      paint(im, 160, 0, JUTE_ICON);
    }
    sameAlpha(up, im, rel, n === 'toolbar' ? [160, 0, 16, 16] : null);
    out[rel] = im; ups[rel] = up;
  }
  out._up = ups;
  return out;
}

// ================================================================ main
const SHEETS = {badges, icons: iconSheets, frames};
function main() {
  const oi = argv.indexOf('--only');
  const only = oi >= 0 ? argv[oi + 1].split(',') : Object.keys(SHEETS);
  const pi = argv.indexOf('--preview'), pdir = pi >= 0 ? argv[pi + 1] : null;
  for (const k of only) {
    const res = SHEETS[k]();
    for (const [rel, im] of Object.entries(res)) {
      if (rel.startsWith('_')) continue;
      fs.writeFileSync(path.join(ROOT, ASSETS, rel), encodePNG(im));
      console.log('wrote ' + rel);
      if (pdir) preview(pdir, rel, res._up[rel], im);
    }
  }
}
// side by side: upstream | new, nearest neighbour, on a checkerboard
function preview(dir, rel, a, b) {
  fs.mkdirSync(dir, {recursive: true});
  const S = a.w >= 512 ? 3 : a.w >= 256 ? 4 : 6, gap = 8, W = (a.w * 2) * S + gap, H = a.h * S;
  const px = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const chk = ((x >> 3) + (y >> 3)) & 1 ? 86 : 104; let c = [40, 40, 48];
    const side = x < a.w * S ? a : x >= a.w * S + gap ? b : null;
    if (side) {
      const sx = ((x - (side === b ? a.w * S + gap : 0)) / S) | 0, sy = (y / S) | 0, p = get(side, sx, sy), al = p[3] / 255;
      c = [0, 1, 2].map(k => Math.round(p[k] * al + chk * (1 - al)));
    }
    px.set([...c, 255], (y * W + x) * 4);
  }
  fs.writeFileSync(path.join(dir, 'ui-' + path.basename(rel, '.png') + '-vorher-nachher.png'), encodePNG({w: W, h: H, px}));
}
main();
