// Pixel Dungeon Neukoelln: intro sequence before the first run (splashes/intro/intro_1..4.png).
// Story: the M41 never came, the next one left in front of your nose, so you go down to the
// cellar for your bike, past the dog poo on the first step, and the fire door slams shut.
// Every scene is drawn at 160x90 and scaled 5x (nearest neighbour) to 800x450, exactly like the
// region splashes of tools/generate-neukoelln-splashes.cjs (whose Layer and font are reused).
// No real logos: "M41" appears only as a route number, the stop sign is a generic "H".
// Usage: node tools/generate-kiez-intro.cjs [1 2 3 4] [--preview DIR]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {Layer, rng, chunk} = require('./generate-neukoelln-splashes.cjs');

const W = 160, H = 90, SCALE = 5;
const OUT = path.join(__dirname, '../core/src/main/assets/splashes/intro');

function encode(layer, scale) {
  const w = layer.w * scale, h = layer.h * scale;
  const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = layer.get(Math.floor(x / scale), Math.floor(y / scale));
    if (!c) throw new Error(`Unpainted pixel ${Math.floor(x / scale)},${Math.floor(y / scale)}`);
    const o = y * (w * 3 + 1) + 1 + x * 3;
    rows[o] = parseInt(c.slice(0, 2), 16); rows[o + 1] = parseInt(c.slice(2, 4), 16); rows[o + 2] = parseInt(c.slice(4, 6), 16);
  }
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// ------------------------------------------------------------------ people ----
// The hero is the same in all four scenes: teal rain jacket, red beanie, yellow backpack.
const HERO = {coat: '3aa39a', coatD: '267069', coatL: '6fd0c4', skin: 'f0c09c', skinD: 'c98c70', hair: '5a3a2a',
  hat: 'd6453a', hatD: '9a2c26', pants: '3b4468', pantsD: '2a3150', shoe: 'e8e4da', shoeD: '9c988e', pack: 'e8b83a', packD: 'a8801e'};
const INK = '14121c';

// pose: 'stand' | 'run' | 'turn' (looking back over the shoulder) | 'step' (one foot forward)
function person(o, pose = 'stand', flip = false) {
  const f = new Layer(18, 26), X = x => flip ? 17 - x : x;
  const px = (x, y, c) => f.px(X(x), y, c);
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
  // legs
  if (pose === 'run') {
    for (let i = 0; i < 6; i++) { px(7 - i, 17 + i, o.pants); px(8 - i, 17 + i, o.pantsD); }
    for (let i = 0; i < 5; i++) { px(10 + (i >> 1), 17 + i, o.pants); px(11 + (i >> 1), 17 + i, o.pantsD); }
    px(12, 22, o.pants); px(13, 22, o.pants);
    rect(0, 23, 3, 2, o.shoe); px(0, 24, o.shoeD); rect(13, 22, 3, 2, o.shoe); px(15, 23, o.shoeD);
  } else if (pose === 'step') {
    rect(6, 17, 2, 6, o.pants); rect(9, 17, 2, 3, o.pants); px(11, 20, o.pants); px(12, 21, o.pants); px(12, 22, o.pants); px(11, 21, o.pantsD);
    rect(5, 23, 4, 2, o.shoe); rect(11, 23, 4, 2, o.shoe); px(5, 24, o.shoeD); px(14, 24, o.shoeD);
  } else {
    rect(6, 17, 2, 6, o.pants); rect(9, 17, 2, 6, o.pants); px(7, 17, o.pantsD); px(10, 17, o.pantsD);
    rect(5, 23, 3, 2, o.shoe); rect(9, 23, 3, 2, o.shoe); px(5, 24, o.shoeD); px(11, 24, o.shoeD);
  }
  // backpack behind (on the left when facing right)
  if (o.pack) { rect(2, 9, 3, 7, o.pack); px(2, 15, o.packD); px(2, 9, o.packD); rect(3, 11, 2, 1, o.packD); }
  // torso
  rect(5, 8, 7, 10, o.coat); for (let y = 8; y < 18; y++) px(5, y, o.coatD); px(8, 9, o.coatL); px(8, 11, o.coatL); px(8, 13, o.coatL);
  rect(5, 17, 7, 1, o.coatD);
  // arms
  if (pose === 'run') { // front arm stretched out forward and up, back arm swinging
    for (let i = 0; i < 5; i++) px(12 + i, 9 - (i >> 1), o.coat); px(17, 6, o.skin); px(16, 6, o.skin); px(17, 5, o.skin);
    px(4, 10, o.coatD); px(3, 11, o.coatD); px(2, 12, o.coatD); px(1, 13, o.skin);
  } else if (o.phone) {
    rect(11, 9, 1, 4, o.coatD); px(12, 12, o.coat); px(13, 11, o.skin); px(13, 10, o.phone); px(14, 10, o.phone);
  } else {
    rect(12, 9, 1, 7, o.coatD); px(12, 16, o.skin);
  }
  // head
  const hy = pose === 'run' ? 1 : 0, hx = pose === 'run' ? 1 : 0;
  rect(6 + hx, 3 + hy, 6, 5, o.skin); px(6 + hx, 7 + hy, o.skinD);
  if (pose === 'turn') { px(6 + hx, 4 + hy, INK); px(8 + hx, 4 + hy, INK); px(7 + hx, 6 + hy, o.skinD); }
  else { px(10 + hx, 4 + hy, INK); px(11 + hx, 6 + hy, o.skinD); if (pose === 'run') { px(10 + hx, 6 + hy, INK); } }
  if (o.hood) { rect(5 + hx, 1 + hy, 8, 3, o.hood); rect(5 + hx, 4 + hy, 2, 4, o.hood); px(12 + hx, 3 + hy, o.hood); }
  else if (o.hat) { rect(6 + hx, 1 + hy, 6, 3, o.hat); rect(6 + hx, 3 + hy, 6, 1, o.hatD); px(8 + hx, 0 + hy, o.hat); px(9 + hx, 0 + hy, o.hatD); }
  else { rect(6 + hx, 2 + hy, 6, 2, o.hair); px(6 + hx, 4 + hy, o.hair); px(6 + hx, 5 + hy, o.hair); }
  return f;
}
const put = (c, fig, x, footY) => c.draw(fig, x, footY - 25, INK);

// rain: short diagonal streaks, skipped inside the given sheltered rectangles
function rain(c, seed, col, n, skip = []) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const x = Math.floor(r() * (W + 20)) - 10, y = Math.floor(r() * H), len = 2 + Math.floor(r() * 3);
    for (let i = 0; i < len; i++) {
      const px = x + Math.floor(i / 2), py = y + i;
      if (skip.some(([sx, sy, sw, sh]) => px >= sx && px < sx + sw && py >= sy && py < sy + sh)) continue;
      c.px(px, py, col);
    }
  }
}

// small comic speech bubble with 3x5 text
function bubble(c, msg, x, y, tailX, tailDown, P) {
  const tw = c.textWidth(msg);
  c.rect(x - 3, y - 3, tw + 6, 11, P.ink); c.rect(x - 2, y - 2, tw + 4, 9, P.paper);
  const ty = tailDown ? y + 7 : y - 4;
  c.poly(tailDown ? [[tailX - 2, ty], [tailX + 2, ty], [tailX, ty + 4]] : [[tailX - 2, ty + 1], [tailX + 2, ty + 1], [tailX, ty - 3]], P.ink);
  c.px(tailX, tailDown ? ty : ty + 1, P.paper); c.px(tailX - 1, tailDown ? ty : ty + 1, P.paper); c.px(tailX + 1, tailDown ? ty : ty + 1, P.paper);
  c.px(tailX, tailDown ? ty + 1 : ty, P.paper);
  c.text(msg, x, y, P.ink);
}

// Altbau facade band in the rain (scenes 1 and 2)
function street(c, P, seed) {
  c.vgrad(0, 0, W, 14, [P.sky0, P.sky1, P.sky2]);
  const r = rng(seed);
  const houses = [[0, 8, P.facA], [34, 5, P.facB], [70, 9, P.facA], [104, 4, P.facC], [136, 7, P.facB]];
  for (const [x, top, col] of houses) {
    c.rect(x, top, 36, 50 - top, col); c.hline(x, top, 36, P.facL);
    for (const wy of [top + 4, top + 17, top + 30]) for (let wx = x + 3; wx < x + 33; wx += 8) {
      if (wy + 9 > 50) continue;
      const lit = r() < 0.35;
      c.rect(wx, wy, 5, 8, P.frame); c.rect(wx + 1, wy + 1, 3, 6, lit ? P.lit : P.dark);
      if (lit) c.rect(wx + 1, wy + 4, 3, 3, P.litD);
      c.hline(wx - 1, wy + 8, 7, P.facL);
    }
  }
  // sidewalk and road
  c.rect(0, 50, W, 24, P.walk); c.dither(0, 50, W, 24, P.walkD, 4);
  for (let x = 0; x < W; x += 12) c.vline(x, 50, 24, P.walkD);
  c.hline(0, 50, W, P.walkL);
  c.rect(0, 74, W, 2, P.curb); c.hline(0, 74, W, P.walkL);
  c.rect(0, 76, W, 14, P.road); c.dither(0, 77, W, 13, P.roadL, 4, 1);
}

const SCENES = {};

// =============================================================================
// 1: the stop. Display: "M41" "FÄLLT AUS". Everybody waits in the rain anyway.
// =============================================================================
SCENES[1] = () => {
  const P = {
    ink: INK, paper: 'f4f1e6', sky0: '171b2b', sky1: '1f2438', sky2: '272d45',
    facA: '3b3a4e', facB: '433a48', facC: '363f4f', facL: '4f4d63', frame: '2a2a3a', lit: 'e8c26e', litD: 'c2904a', dark: '1c1e2c',
    walk: '4a4b5c', walkD: '424353', walkL: '5c5d70', curb: '6a6b7e', road: '23252f', roadL: '2c2f3b',
    steel: '6f7686', steelD: '4a5060', glass: '6f8fa8', glassL: '9bbad0', roof: '2e3140',
    led: '0d0d10', ledO: 'ff9a2a', ledD: '7a4410', signY: 'e8c63a', signG: '2f8a4c', bench: '8a5a36',
    rain: '8a96b8', rainL: 'b6c2dc', puddle: '5a6a8a', umb: 'b83a5a', umbD: '7e2640', grey: '7c7f8c',
  };
  const c = new Layer(W, H);
  street(c, P, 41);
  // shelter: roof, back glass, posts, bench
  c.rect(62, 20, 70, 4, P.roof); c.hline(62, 20, 70, P.steel); c.hline(62, 23, 70, P.steelD);
  c.rect(64, 24, 66, 45, P.glass); c.dither(64, 24, 66, 45, P.walk, 2);
  c.line(66, 26, 74, 40, P.glassL); c.line(100, 26, 108, 40, P.glassL);
  for (const x of [63, 96, 129]) c.rect(x, 24, 2, 50, P.steelD);
  c.rect(78, 60, 40, 2, P.bench); c.vline(80, 62, 6, P.steelD); c.vline(115, 62, 6, P.steelD);
  // dynamic passenger display hanging from the roof
  c.vline(80, 24, 2, P.steelD); c.vline(114, 24, 2, P.steelD);
  c.rect(70, 26, 56, 13, P.steelD); c.rect(71, 27, 54, 11, P.led);
  c.text('M41', 73, 30, P.ledO); c.text('FÄLLT AUS', 88, 30, P.ledO);
  for (let x = 72; x < 124; x += 2) c.px(x, 36, P.ledD);
  // stop pole with a generic round "H" sign and a timetable box
  c.rect(142, 14, 2, 60, P.steel); c.vline(143, 14, 60, P.steelD);
  c.ellipse(143, 13, 7, 7, P.signG); c.ellipse(143, 13, 6, 6, P.signY);
  c.text('H', 142, 11, P.signG); c.vline(141, 11, 5, P.signG);
  c.rect(139, 36, 9, 12, P.paper); c.frame(139, 36, 9, 12, P.steelD);
  for (let y = 38; y < 47; y += 2) c.hline(140, y, 7, P.grey);
  // puddles
  for (const [x, y, w] of [[10, 70, 14], [100, 71, 18], [48, 79, 22], [124, 84, 16]]) {
    c.rect(x, y, w, 2, P.puddle); c.hline(x + 2, y, w - 4, P.rainL);
  }
  // waiting people under the roof: umbrella (inside, out of habit), hood, phone glow
  const ppl = [
    {coat: '6b5a8c', coatD: '4a3e66', coatL: '8f7eb0', skin: 'e0a888', skinD: 'b07a60', hair: '2a2020', pants: '2c2c38', pantsD: '1e1e28', shoe: '3a3a44', shoeD: '22222a'},
    {coat: '8a8f5a', coatD: '5e6240', coatL: 'a8ad78', skin: 'c48a66', skinD: '93624a', hair: '1c1818', hood: '6e7248', pants: '3a3a48', pantsD: '262632', shoe: 'd8d4ca', shoeD: '8c887e'},
    {coat: 'c46a3a', coatD: '8a4424', coatL: 'e0925e', skin: 'f2caa8', skinD: 'c49276', hair: 'd8b060', pants: '44506a', pantsD: '2e384c', shoe: '3a3a44', shoeD: '22222a', phone: '9fe8ff'},
  ];
  put(c, person(ppl[0]), 80, 73);
  c.poly([[76, 45], [89, 40], [102, 45]], P.umb); c.hline(77, 45, 25, P.umbD); c.vline(89, 45, 5, P.steelD);
  put(c, person(ppl[1], 'stand', true), 98, 73);
  put(c, person(ppl[2]), 110, 73); c.px(124, 58, P.lit);
  // the hero, outside the roof, soaked, staring at the display
  put(c, person(HERO, 'stand'), 34, 73);
  c.px(47, 51, P.rainL); c.px(44, 49, P.rainL);
  bubble(c, '?!', 44, 38, 45, true, P);
  rain(c, 7, P.rain, 260, [[64, 24, 66, 50]]);
  rain(c, 19, P.rainL, 60, [[64, 24, 66, 50]]);
  return c;
};

// =============================================================================
// 2: the next one leaves in front of your nose. Tail lights, you run.
// =============================================================================
SCENES[2] = () => {
  const P = {
    ink: INK, paper: 'f4f1e6', sky0: '171b2b', sky1: '1f2438', sky2: '272d45',
    facA: '3b3a4e', facB: '433a48', facC: '363f4f', facL: '4f4d63', frame: '2a2a3a', lit: 'e8c26e', litD: 'c2904a', dark: '1c1e2c',
    walk: '4a4b5c', walkD: '424353', walkL: '5c5d70', curb: '6a6b7e', road: '23252f', roadL: '2c2f3b',
    bus: 'd9b43a', busD: 'a8862a', busL: 'efd574', win: '2a3346', winL: '5e7290', tire: '17171c', hub: '7c7f8c',
    tail: 'ff3a3a', tailL: 'ffb0a0', tailD: '9a1a1a', led: '0d0d10', ledO: 'ff9a2a', steel: '6f7686', steelD: '4a5060',
    signY: 'e8c63a', signG: '2f8a4c', rain: '8a96b8', rainL: 'b6c2dc', puddle: '5a6a8a', smoke: '6a6e7c', smokeL: '8a8e9c', speed: 'c8d0e4',
  };
  const c = new Layer(W, H);
  street(c, P, 42);
  // stop pole on the left
  c.rect(18, 14, 2, 60, P.steel); c.vline(19, 14, 60, P.steelD);
  c.ellipse(19, 13, 7, 7, P.signG); c.ellipse(19, 13, 6, 6, P.signY); c.text('H', 18, 11, P.signG); c.vline(17, 11, 5, P.signG);
  // the bus, side view, driving off to the right (rear end on the left, cut by the frame)
  const bx = 86, top = 30, bot = 78;
  c.rect(bx, top, W - bx, bot - top, P.bus); c.hline(bx, top, W - bx, P.busL); c.rect(bx, bot - 6, W - bx, 6, P.busD);
  c.rect(bx + 1, top - 2, W - bx - 1, 2, P.busD); // roof line
  for (let x = bx + 10; x < W; x += 16) { c.rect(x, top + 9, 13, 13, P.win); c.line(x + 1, top + 20, x + 7, top + 10, P.winL); }
  c.rect(bx + 1, top + 9, 7, 13, P.win); // rear window
  c.rect(bx + 10, top + 1, 17, 7, P.led); c.text('M41', bx + 12, top + 2, P.ledO); // side route display
  c.rect(bx + 1, top + 26, 3, 8, P.tail); c.px(bx + 1, top + 26, P.tailL); c.rect(bx + 1, top + 34, 3, 2, P.tailD);
  c.vline(bx, top, bot - top, P.busD);
  c.rect(122, top + 23, 16, 19, P.busD); c.rect(123, top + 24, 6, 17, P.win); c.rect(130, top + 24, 6, 17, P.win); // closed doors
  for (const wx of [104, 148]) { c.ellipse(wx, bot, 6, 6, P.tire); c.ellipse(wx, bot, 2.5, 2.5, P.hub); }
  // tail light glow and its reflection on the wet road
  c.vline(bx - 1, top + 25, 10, P.tailD); c.px(bx - 2, top + 28, P.tailD); c.px(bx - 2, top + 31, P.tailD);
  for (let y = 80; y < 90; y++) { if (y % 2) c.px(bx + 1, y, P.tail); c.px(bx + 2, y, y % 3 ? P.tailD : P.tail); }
  // exhaust cloud and speed lines
  for (const [x, y, r] of [[80, 74, 4], [72, 71, 3], [66, 73, 2.5], [76, 68, 2]]) { c.ellipse(x, y, r, r * 0.8, P.smoke); c.px(x - 1, y - 1, P.smokeL); }
  for (const [x, y, w] of [[54, 40, 20], [60, 48, 16], [50, 56, 22], [62, 62, 12]]) c.hline(x, y, w, P.speed);
  // the hero sprinting, arm out; splash from the puddle
  put(c, person(HERO, 'run'), 26, 75);
  c.rect(20, 74, 16, 2, P.puddle);
  for (const [x, y] of [[20, 70], [18, 68], [23, 68], [34, 69], [37, 67], [16, 71]]) c.px(x, y, P.rainL);
  bubble(c, 'HALT!', 36, 30, 40, true, P);
  rain(c, 23, P.rain, 240, [[bx, top, W - bx, bot - top]]);
  rain(c, 29, P.rainL, 50);
  return c;
};

// =============================================================================
// 3: Altbau hallway, down to the cellar for the bike. Dog poo on the first step.
// =============================================================================
SCENES[3] = () => {
  const P = {
    ink: INK, paper: 'f4f1e6', paint: 'b89a6a', paintD: '9f8256', paintL: 'cfb382', oil: '3f5a48', oilD: '30463a', oilL: '557560',
    tileA: 'a45a3a', tileB: 'd8c8a8', tileD: '6e3a26', wood: '7a4a2a', woodD: '54321c', woodL: 'a06a3e', glass: 'a8c4c8', glassD: '6e8a90',
    brass: 'c9a23a', mail: '6d7480', mailD: '4c525c', mailL: '9aa1ad', stick: 'ff6fae', stick2: '7fd6c5',
    dark: '15151d', cellar: '2a2a33', cellarL: '3a3a44', brick: '4a3a36', brickD: '3a2c2a', stair: '8c8478', stairD: '6a6258', stairL: 'a8a094',
    bulb: 'fff2b0', glow: '6a6450', bike: 'd6453a', bike2: '3f7ac4', tire: '101014', steel: '9aa0a8', poo: '6a4020', pooD: '4a2a14', pooL: '8a5a30', fly: '101014', stink: '9ab860',
  };
  const c = new Layer(W, H);
  const floorY = 58;
  // hallway walls: warm paint above, dark green oil paint below (typical Berlin stairwell)
  c.rect(0, 0, W, floorY, P.paint); c.dither(0, 0, W, 30, P.paintD, 4);
  c.rect(0, 36, W, floorY - 36, P.oil); c.hline(0, 36, W, P.oilL); c.hline(0, 37, W, P.oilD);
  c.hline(0, 35, W, P.paintL);
  // stucco ceiling band
  c.rect(0, 0, W, 4, P.paintL); for (let x = 0; x < W; x += 6) c.rect(x + 1, 1, 3, 2, P.paint);
  // front door (wood + glass) on the left, light from the street
  c.rect(2, 10, 26, floorY - 10, P.woodD); c.rect(4, 12, 22, floorY - 12, P.wood);
  c.rect(6, 14, 8, 18, P.glass); c.rect(16, 14, 8, 18, P.glass); c.line(7, 30, 12, 16, 'd8ecee'); c.line(17, 30, 22, 16, 'd8ecee');
  c.frame(6, 36, 8, 18, P.woodD); c.frame(16, 36, 8, 18, P.woodD); c.px(24, 40, P.brass); c.px(24, 41, P.brass);
  // mailboxes with stickers
  c.rect(32, 20, 28, 16, P.mailD);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = 33 + k * 7, y = 21 + r * 5; c.rect(x, y, 6, 4, P.mail); c.hline(x + 1, y + 1, 4, P.mailD); c.px(x + 1, y + 3, P.paper); }
  c.px(35, 26, P.stick); c.px(50, 31, P.stick2); c.px(44, 22, P.stick); c.rect(52, 22, 3, 2, P.paper);
  // floor: cement tiles, pattern
  c.rect(0, floorY, 72, 4, P.tileB);
  for (let x = 0; x < 72; x += 4) { c.rect(x, floorY, 2, 2, P.tileA); c.rect(x + 2, floorY + 2, 2, 2, P.tileA); }
  c.hline(0, floorY, 72, P.tileD);
  c.rect(0, floorY + 4, 72, H - floorY - 4, P.oilD); for (let y = floorY + 8; y < H; y += 6) c.hline(0, y, 72, P.dark);
  // cellar cut-away on the right: dark room, bricks, bare bulb
  c.rect(72, floorY, W - 72, H - floorY, P.cellar);
  for (let y = floorY + 1; y < H; y += 4) for (let x = 72 + ((y >> 2) % 2) * 4; x < W; x += 8) { c.rect(x, y, 6, 2, P.brick); c.px(x, y + 1, P.brickD); }
  c.rect(100, floorY, W - 100, 3, P.stairD); c.hline(100, floorY, W - 100, P.stair);
  // cellar door frame above the stairs with an enamel sign
  c.rect(70, 14, 30, floorY - 14, P.dark); c.frame(69, 13, 32, floorY - 13, P.woodD);
  c.rect(71, 4, 29, 9, P.paper); c.frame(71, 4, 29, 9, P.ink); c.text('KELLER', 74, 6, P.ink);
  // open door leaf swung against the wall
  c.poly([[100, 13], [106, 16], [106, floorY + 2], [100, floorY]], P.wood); c.vline(106, 16, floorY - 14, P.woodD);
  // stairs down: 8 steps of 6x4
  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 7, y = floorY + 4 + i * 4;
    c.rect(x, y, 7, H - y, P.stair); c.hline(x, y, 7, P.stairL); c.vline(x, y, H - y, P.stairD);
    c.rect(x + 1, y + 1, 6, H - y - 1, P.stairD); c.hline(x + 1, y + 1, 6, P.stair);
  }
  c.rect(70, floorY, 2, 4, P.stairD);
  // redraw what is behind/after the stairs: cellar floor at the bottom right
  c.rect(118, 86, W - 118, 4, P.stairD); c.hline(118, 86, W - 118, P.stair);
  // bulb and light cone in the cellar
  c.vline(134, floorY + 3, 5, P.ink); c.rect(133, floorY + 8, 3, 3, P.bulb);
  c.dither(118, floorY + 12, 40, 16, P.glow, 4);
  // bike stand with bikes (yours is the red one)
  c.hline(118, 84, 40, P.steel); for (let x = 120; x < 158; x += 6) { c.vline(x, 80, 5, P.steel); c.px(x + 1, 80, P.steel); c.vline(x + 2, 80, 5, P.steel); }
  const bike = (x, col) => {
    c.frame(x - 4, 76, 9, 9, P.tire); c.frame(x + 10, 76, 9, 9, P.tire);
    c.line(x, 80, x + 6, 75, col); c.line(x + 6, 75, x + 14, 80, col); c.line(x, 80, x + 8, 80, col); c.line(x + 8, 80, x + 6, 75, col);
    c.line(x + 14, 80, x + 12, 72, col); c.hline(x + 10, 72, 4, P.ink); c.rect(x + 4, 73, 4, 1, P.ink);
  };
  bike(125, P.bike2); bike(140, P.bike);
  // the dog poo on the first step, stink lines and a fly
  c.stamp(72, floorY, ['..p..', '.pPp.', 'pPPPp', 'DDDDD'], {p: P.poo, P: P.pooL, D: P.pooD});
  c.px(72, floorY - 3, P.stink); c.px(73, floorY - 4, P.stink); c.px(72, floorY - 5, P.stink);
  c.px(76, floorY - 4, P.stink); c.px(77, floorY - 5, P.stink); c.px(76, floorY - 6, P.stink);
  c.px(80, floorY - 8, P.fly); c.px(79, floorY - 9, P.glass); c.px(81, floorY - 9, P.glass);
  // the hero, walking towards the stairs, looking at the phone (not at the step)
  put(c, person(Object.assign({}, HERO, {phone: '9fe8ff'}), 'step'), 50, floorY);
  return c;
};

// =============================================================================
// 4: RUMS. The fire door falls shut behind you; the cellar is dark.
// =============================================================================
SCENES[4] = () => {
  const P = {
    ink: INK, paper: 'f4f1e6', bg: '0c0c12', wall: '17171f', brick: '1f1f2a', brickL: '2a2a38', floor: '121218', floorL: '1c1c26',
    door: '5a5f68', doorD: '3e434b', doorL: '7a808a', closer: '2a2d33', plate: 'c9c4b4', plateD: '8a8678',
    lamp: 'f4ecc0', lampD: 'b8ae84', beamA: '3c3a30', beamB: '5a5640', slat: '2e2618', slatL: '4a3c26', pipe: '2a3036', pipeL: '3c444c',
    burst: 'ffe36a', burstD: 'ff9a3a', eye: 'ff4a4a', dust: '8a8678', poo: '6a4020',
  };
  const c = new Layer(W, H);
  c.rect(0, 0, W, H, P.bg);
  // back wall bricks, barely visible
  for (let y = 4; y < 66; y += 4) for (let x = ((y >> 2) % 2) * 5; x < W; x += 10) c.rect(x, y, 8, 2, P.brick);
  c.rect(0, 66, W, 24, P.floor); c.dither(0, 66, W, 24, P.floorL, 4);
  // pipes along the ceiling
  c.rect(0, 2, W, 2, P.pipe); c.hline(0, 2, W, P.pipeL); for (let x = 30; x < W; x += 36) c.rect(x, 1, 2, 4, P.pipeL);
  // the steel fire door on the left, closed, with door closer arm and a plain sign plate (no brand)
  c.rect(8, 14, 40, 54, P.doorD); c.rect(10, 16, 36, 52, P.door);
  c.vline(10, 16, 52, P.doorL); c.hline(10, 16, 36, P.doorL);
  for (let y = 22; y < 66; y += 8) c.hline(12, y, 32, P.doorD);
  c.rect(12, 10, 26, 4, P.closer); c.line(36, 12, 44, 18, P.closer); c.line(44, 18, 40, 22, P.closer);
  c.rect(38, 40, 6, 3, P.plateD); c.rect(40, 39, 5, 2, P.doorL);
  c.rect(18, 26, 14, 6, P.plate); c.frame(18, 26, 14, 6, P.plateD); c.text('T30', 19, 27, P.ink);
  // slam: comic burst "RUMS!" and dust from the frame
  const bx = 30, by = 46;
  const star = [];
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? 11 : 17; star.push([bx + 12 + Math.cos(a) * r * 1.3, by + Math.sin(a) * r * 0.8]); }
  c.poly(star, P.burstD);
  const inner = star.map(([x, y]) => [bx + 12 + (x - bx - 12) * 0.8, by + (y - by) * 0.8]);
  c.poly(inner, P.burst);
  c.text('RUMS!', bx + 2, by - 2, P.ink);
  const r = rng(4);
  for (let k = 0; k < 40; k++) c.px(8 + Math.floor(r() * 42), 12 + Math.floor(r() * 60), k % 2 ? P.dust : P.doorL);
  // cellar compartments with wooden slats receding to the right
  for (let i = 0; i < 4; i++) {
    const x = 96 + i * 16;
    for (let s = 0; s < 14; s += 3) c.vline(x + s, 20, 46, P.slat);
    c.hline(x, 20, 14, P.slatL); c.hline(x, 42, 14, P.slat);
  }
  // phone flashlight cone from the hero to the right
  const LIT = {[P.bg]: P.beamA, [P.brick]: '4a4636', [P.slat]: '6a5838', [P.slatL]: '7e6a44', [P.floor]: '2e2c26', [P.floorL]: '3a3830', [P.pipe]: P.pipeL};
  const LIT2 = {[P.beamA]: P.beamB, '4a4636': '6a6450', '6a5838': '8a7448', '7e6a44': '9a8452', '2e2c26': '4a463a', '3a3830': '524e40'};
  for (const [map, k] of [[LIT, 0.36], [LIT2, 0.16]]) for (let x = 86; x < W; x++) for (let y = 0; y < H; y++) {
    const d = Math.abs(y - 57) / ((x - 84) * k);
    if (d > 1 || (d > 0.8 && (x + y) % 2)) continue;
    const col = c.get(x, y); if (map[col]) c.px(x, y, map[col]);
  }
  // glowing eyes in the dark corner (the first rat of the dungeon)
  c.px(150, 80, P.eye); c.px(152, 80, P.eye); c.px(60, 22, P.eye); c.px(62, 22, P.eye);
  // the hero, turned back towards the door, startled; shoe prints lead in
  put(c, person(Object.assign({}, HERO, {phone: P.lamp}), 'turn'), 70, 72);
  c.px(84, 48, P.paper); c.px(84, 49, '9fd0ff'); c.px(85, 49, '9fd0ff'); // sweat drop
  for (const [x, y] of [[56, 78], [48, 80], [40, 78]]) { c.rect(x, y, 3, 1, P.poo); c.px(x + 1, y + 1, P.poo); }
  return c;
};

// ------------------------------------------------------------------ main ----
if (require.main === module) {
  const argv = process.argv.slice(2), pi = argv.indexOf('--preview');
  const prev = pi >= 0 ? argv[pi + 1] : null;
  const wanted = argv.filter((a, i) => /^[1-4]$/.test(a) && i !== pi + 1);
  fs.mkdirSync(OUT, {recursive: true});
  for (const n of (wanted.length ? wanted : Object.keys(SCENES))) {
    const layer = SCENES[n]();
    const file = path.join(OUT, `intro_${n}.png`);
    fs.writeFileSync(file, encode(layer, SCALE));
    console.log(`Generated ${path.relative(process.cwd(), file)} (${W * SCALE}x${H * SCALE})`);
    if (prev) { fs.mkdirSync(prev, {recursive: true}); fs.writeFileSync(path.join(prev, `intro_${n}-x5.png`), encode(layer, 5)); }
  }
}
module.exports = {SCENES, person, HERO};
