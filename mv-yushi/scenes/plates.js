// 《于是》— painted plates. Authored in FULL COLOUR, always: the grey world is the engine's
// `grey` uniform, never a grey palette. Value structure first (3+ values), knife detail second.
import { Ref, paintRef } from '../engine/plate.js';
import { KNIFE, DAB } from '../engine/impasto.js';
import { P, E, lin, rad, lerp } from './common.js';

const mk = (w, h, scale = 1) => new Ref(w, h, scale);
const done = (R, o) => ({ ref: R, strokes: paintRef(R, { seed: 1, ...o }), w: R.w, h: R.h });

// ---------------------------------------------------------------- 1 · the window
// The film's bookend. 'night' = cold rain on glass, one warm street lamp outside.
// 'dawn'  = the same frame, rain stopped, low sun coming in.
export const WIN = { w: 1920, h: 1080, glass: [300, 150, 1620, 790] };

const WINPAL = {
  night: {
    wall: ['#5c4433', '#6b5139', '#4a3628'], band: '#7a5c40',
    sky: [[0, '#3d6a86'], [.4, '#5b8ba4'], [.72, '#8fb4bd'], [1, '#b6c9c6']],
    cloud: '#5f8398', cloudLit: '#9db4bd',
    city: ['#4c4340', '#574a44', '#453c3a', '#5d4d45', '#48403c', '#524640'],
    cityWin: '#f4c778', cityDark: '#3d4a4e',
    frame: '#4a3524', frameLit: '#c29257', frameSh: '#2e2118', cast: '#3d2c1f',
    sill: '#8a6746', sillDrop: '#33251b', cup: '#c0392b', cuplip: '#e0654a', cupsh: '#7d241a',
    curtain: ['#8a6244', '#a87a52', '#6b4a33'],
  },
  dawn: {
    wall: ['#6b503a', '#7a5c40', '#54402e'], band: '#8a6a48',
    sky: [[0, '#bcd2cf'], [.34, '#f0e2bc'], [.68, '#ffd08e'], [1, '#ffbe74']],
    cloud: '#a8bdb8', cloudLit: '#ffe0b0',
    city: ['#7a6a58', '#8a7660', '#6f5f50', '#8e7a62', '#736350', '#7e6c58'],
    cityWin: '#5c5040', cityDark: '#5c5040',
    frame: '#6b4c2c', frameLit: '#e0b878', frameSh: '#3a281a', cast: '#4a3423',
    sill: '#b58a58', sillDrop: '#3f2c1e', cup: '#c0392b', cuplip: '#e0654a', cupsh: '#7d241a',
    curtain: ['#9a7050', '#b88a5c', '#77543a'],
  },
};

export function buildWindow(mode = 'night') {
  const W = 1920, H = 1080, R = mk(W, H), dawn = mode === 'dawn', P_ = WINPAL[mode];
  const [gx0, gy0, gx1, gy1] = WIN.glass;

  // ---- interior wall: warm umber, two values, so the dark frame has something to sit on
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), lin(0, 0, W, H, [[0, P_.wall[0]], [.5, P_.wall[1]], [1, P_.wall[2]]]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 64, jit: .05, detail: 2.2, aj: .25 });
  R.fill(P([[0, 190], [W, 190], [W, 660], [0, 660]]), P_.band,
    { dir: 90, fallback: 90, group: 'band', maxR: 52, jit: .04, aj: .2 });
  // curtain at the left edge: three folds, one lit
  R.fill(P([[0, 0], [150, 0], [176, 1080], [0, 1080]]), P_.curtain[0], { dir: 88, group: 'curt1', maxR: 40, jit: .06 });
  R.fill(P([[150, 0], [238, 0], [262, 1080], [176, 1080]]), P_.curtain[1], { dir: 88, group: 'curt2', maxR: 30, jit: .06 });
  R.fill(P([[238, 0], [300, 0], [318, 1080], [262, 1080]]), P_.curtain[2], { dir: 88, group: 'curt3', maxR: 26, jit: .06 });

  // ---- beyond the glass: sky, cloud banks, then the roofs (order matters: dawn must not bury them)
  R.fill(P([[gx0, gy0], [gx1, gy0], [gx1, gy1], [gx0, gy1]]), lin(0, gy0, 0, gy1, P_.sky),
    { dir: 0, fallback: 0, group: 'sky', maxR: 44, jit: .06, detail: 2.0, aj: .3 });
  [[560, 300, 320, 56], [1180, 240, 350, 50], [900, 420, 250, 34]].forEach(([x, y, w0, h0], i) =>
    R.fill(c2 => { c2.ellipse(x, y, w0, h0, 0, 0, 7); c2.ellipse(x - w0 * .5, y + h0 * .3, w0 * .55, h0 * .65, 0, 0, 7); c2.ellipse(x + w0 * .5, y + h0 * .32, w0 * .5, h0 * .6, 0, 0, 7); },
      lin(0, y - h0, 0, y + h0, [[0, P_.cloud], [.7, P_.cloud], [1, P_.cloudLit]]),
      { dir: -4, group: 'cloud' + i, maxR: 20, detail: 1.4, aj: .3, alpha: .85 }));
  const roof = (x, y, w0, h0, c, k) => R.fill(P([[x, y], [x + w0, y], [x + w0, y + h0], [x, y + h0]]), c,
    { dir: 90, group: 'bld' + k, maxR: 13, detail: 1.4 });
  [[-20, 190, 300], [280, 240, 210], [490, 168, 260], [750, 214, 240], [990, 150, 200], [1180, 200, 160]]
    .forEach(([dx, hh, w0], i) => roof(gx0 + dx, gy1 - hh, w0, hh, P_.city[i], i + 1));
  // their windows
  for (let i = 0; i < 22; i++) {
    const x = gx0 + 22 + (i * 137) % (gx1 - gx0 - 60), y = gy1 - 150 + (i % 5) * 34, s = 11 + (i % 3) * 3;
    R.fill(P([[x, y], [x + s, y], [x + s, y + s * .8], [x, y + s * .8]]), i % 4 === 0 ? P_.cityWin : P_.cityDark,
      { dir: 90, maxR: 4, group: 'bw' + i });
  }
  // the street lamp behind the glass: a few large soft dabs, low contrast
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.283, rr = 20 + i * 14, x = gx1 - 255 + Math.cos(a) * rr, y = gy1 - 300 + Math.sin(a) * rr * .75;
    R.fill(E(x, y, 120, 96), rad(x, y, 0, 124, [[0, dawn ? 'rgba(255,236,180,.5)' : 'rgba(255,214,138,.5)'], [1, 'rgba(255,196,110,0)']]),
      { type: DAB, maxR: 60, group: 'glow', alpha: .34, hgt: .5 });
  }
  R.fill(E(gx1 - 255, gy1 - 300, 54, 54), rad(gx1 - 255, gy1 - 300, 0, 54,
    [[0, 'rgba(255,248,214,.9)'], [.5, 'rgba(255,214,130,.5)'], [1, 'rgba(255,196,110,0)']]),
  { type: DAB, maxR: 26, group: 'core', hgt: .8, alpha: .9 });
  // wet haze right behind the glass
  for (let i = 0; i < 7; i++) R.fill(P([[gx0, gy0 + 60 + i * 92], [gx1, gy0 + 40 + i * 92], [gx1, gy0 + 84 + i * 92], [gx0, gy0 + 104 + i * 92]]),
    `rgba(214,232,238,${dawn ? .03 : .05 + i * .012})`, { dir: 0, group: 'haze' + i, maxR: 30, alpha: .8 });

  // ---- rain on the glass (night only): thin, varied, never a picket fence
  if (!dawn) {
    for (let i = 0; i < 22; i++) {
      const x = gx0 + 30 + (i * 173) % (gx1 - gx0 - 60), y0 = gy0 + ((i * 97) % 300), len = 150 + (i * 53) % 420, w0 = 1.6 + (i % 3) * .9;
      R.line(c => { c.moveTo(x, y0); c.bezierCurveTo(x + 7, y0 + len * .35, x - 6, y0 + len * .7, x + 3, y0 + len); },
        'rgba(226,242,248,.42)', w0, { dir: 90, group: 'rain' + i, maxR: 3, jit: .05 });
    }
    for (let i = 0; i < 16; i++) {
      const x = gx0 + 40 + (i * 233) % (gx1 - gx0 - 80), y = gy0 + 30 + (i * 167) % (gy1 - gy0 - 60), r = 1.8 + (i % 5) * 1.3;
      R.fill(E(x, y, r, r * 1.25), 'rgba(226,242,248,.34)', { type: DAB, maxR: 3, group: 'drop' + i });
      R.fill(E(x - r * .3, y - r * .35, r * .32, r * .38), 'rgba(255,255,255,.8)', { type: DAB, maxR: 2, group: 'dhl' + i });
    }
  } else {
    // dawn: sun low on the right, long raking bands of light on the wet glass, a bird on the sill
    for (let i = 0; i < 4; i++) R.fill(E(gx1 - 380 + i * 30, gy1 - 230 + i * 10, 360, 300), rad(gx1 - 380 + i * 30, gy1 - 230 + i * 10, 0, 380,
      [[0, 'rgba(255,252,224,.5)'], [.4, 'rgba(255,226,150,.26)'], [1, 'rgba(255,190,110,0)']]),
    { type: DAB, maxR: 70, group: 'sun' + i, alpha: .4, hgt: .3 });
    for (let i = 0; i < 9; i++) R.fill(P([[gx0, gy0 + 30 + i * 82], [gx1, gy0 - 10 + i * 82], [gx1, gy0 + 26 + i * 82], [gx0, gy0 + 66 + i * 82]]),
      `rgba(255,238,190,${.13 - i * .011})`, { dir: 4, group: 'ray' + i, maxR: 26, alpha: .9 });
  }

  // ---- frame, its lit edge, the shadow it throws on the wall
  [[gx0 - 48, gy0 - 48, gx1 + 48, gy0], [gx0 - 48, gy1, gx1 + 48, gy1 + 48],
   [gx0 - 48, gy0, gx0, gy1], [gx1, gy0, gx1 + 48, gy1],
   [(gx0 + gx1) / 2 - 16, gy0, (gx0 + gx1) / 2 + 16, gy1],
   [gx0, (gy0 + gy1) / 2 - 16, gx1, (gy0 + gy1) / 2 + 16]]
    .forEach(([x0, y0, x1, y1], i) => R.fill(P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), P_.frame,
      { dir: 90, group: 'frame' + i, maxR: 15, jit: .07, hgt: 1.2 }));
  R.fill(P([[gx0 - 48, gy0 - 48], [gx1 + 48, gy0 - 48], [gx1 + 48, gy0 - 34], [gx0 - 48, gy0 - 34]]), P_.frameLit,
    { dir: 0, group: 'framelit', maxR: 8 });
  R.fill(P([[gx0 - 48, gy1 + 34], [gx1 + 48, gy1 + 34], [gx1 + 48, gy1 + 48], [gx0 - 48, gy1 + 48]]), P_.frameSh,
    { dir: 0, group: 'framesh', maxR: 6 });
  R.fill(P([[gx0 - 78, gy0 - 78], [gx1 + 78, gy0 - 78], [gx1 + 78, gy0 - 48], [gx0 - 78, gy0 - 48]]), P_.cast,
    { dir: 0, group: 'cast1', maxR: 10, alpha: .85 });
  R.fill(P([[gx0 - 78, gy0 - 48], [gx0 - 48, gy0 - 48], [gx0 - 48, gy1 + 78], [gx0 - 78, gy1 + 78]]), P_.cast,
    { dir: 90, group: 'cast2', maxR: 10, alpha: .85 });

  // ---- sill + what sits on it
  R.fill(P([[gx0 - 140, gy1 + 48], [gx1 + 140, gy1 + 48], [gx1 + 140, gy1 + 132], [gx0 - 140, gy1 + 132]]), P_.sill,
    { dir: 0, fallback: 0, group: 'sill', maxR: 22, jit: .05, hgt: 1.2 });
  R.fill(P([[gx0 - 140, gy1 + 132], [gx1 + 140, gy1 + 132], [gx1 + 140, H], [gx0 - 140, H]]), P_.sillDrop,
    { dir: 90, group: 'silldrop', maxR: 20, jit: .05 });
  R.fill(P([[1176, 760], [1268, 760], [1256, 806], [1188, 806]]), P_.cup, { dir: 90, group: 'cup', maxR: 7, hgt: 1.4 });
  R.fill(E(1222, 760, 46, 10), P_.cuplip, { maxR: 5, group: 'cuplip', hgt: 1.3 });
  R.fill(E(1222, 806, 34, 7), P_.cupsh, { maxR: 4, group: 'cupsh' });
  if (dawn) R.fill(c => { c.ellipse(432, 786, 26, 15, 0, 0, 7); c.ellipse(454, 770, 11, 9, 0, 0, 7); }, '#5a4436',
    { maxR: 6, group: 'bird' });

  return done(R, { T: dawn ? 11 : 13 });
}

// ---------------------------------------------------------------- 2 · the room
// She is not in it: her shoes by the bed, her coat on the chair, the shape of her on the sheet.
export function buildRoom() {
  const W = 1920, H = 1080, R = mk(W, H), HZ = 620;
  // wall + paper band + a framed print, one value darker, to give the wall an anchor
  R.fill(P([[0, 0], [W, 0], [W, HZ + 40], [0, HZ + 40]]),
    lin(0, 0, 0, HZ, [[0, '#7d5f45'], [.55, '#8d6b4c'], [1, '#9c7a52']]),
  { dir: 90, fallback: 90, group: 'wall', maxR: 56, jit: .05, detail: 2.1 });
  R.fill(P([[170, 130], [1760, 130], [1760, 470], [170, 470]]), '#997750',
    { dir: 90, fallback: 90, group: 'band', maxR: 44, jit: .04, aj: .2 });
  R.fill(P([[520, 210], [700, 210], [700, 400], [520, 400]]), '#5a4030', { dir: 90, group: 'picf', maxR: 12, hgt: 1.2 });
  R.fill(P([[536, 226], [684, 226], [684, 384], [536, 384]]), '#c9a874', { dir: 90, group: 'pic', maxR: 14, jit: .07 });
  R.fill(P([[560, 300], [660, 300], [660, 384], [560, 384]]), '#7d8c74', { dir: 90, group: 'pic2', maxR: 10, jit: .08 });

  // floor: boards running away from us, with visible seams
  R.fill(P([[0, HZ + 40], [W, HZ + 40], [W, H], [0, H]]),
    lin(0, HZ, 0, H, [[0, '#8a6644'], [.5, '#6b4c31'], [1, '#463120']]),
  { dir: 90, fallback: 90, group: 'floor', maxR: 38, jit: .07 });
  for (let i = 0; i < 7; i++) R.line(c => { c.moveTo(-100 + i * 320, H); c.lineTo(420 + i * 180, HZ + 40); },
    'rgba(70,48,32,.5)', 3, { dir: 90, group: 'seam' + i, maxR: 4 });

  // the light from the window, soft-edged, falling across the boards
  R.fill(P([[190, HZ + 50], [860, HZ + 50], [1150, H], [300, H]]),
    lin(0, HZ, 0, H, [[0, 'rgba(255,232,180,.66)'], [.55, 'rgba(255,220,164,.34)'], [1, 'rgba(255,214,150,.05)']]),
  { dir: 0, fallback: 0, group: 'pool', maxR: 26, alpha: .95, hgt: .35, jit: .08 });

  // window on the left wall, at a slant
  const q = [[30, 175], [420, 240], [420, 650], [30, 715]];
  R.fill(P(q), lin(30, 0, 420, 0, [[0, '#40708a'], [1, '#79a4b2']]), { dir: 60, group: 'glass', maxR: 20, detail: 1.6 });
  R.fill(P([[30, 175], [420, 240], [420, 262], [30, 197]]), '#4a3524', { dir: 60, group: 'wfr1', maxR: 6 });
  R.fill(P([[30, 693], [420, 628], [420, 650], [30, 715]]), '#4a3524', { dir: 60, group: 'wfr2', maxR: 6 });
  R.fill(P([[214, 208], [246, 220], [246, 640], [214, 655]]), '#4a3524', { dir: 60, group: 'wfr3', maxR: 5 });
  R.fill(P([[30, 197], [420, 262], [420, 276], [30, 211]]), '#b08a55', { dir: 60, group: 'wfrlit', maxR: 5 });
  R.fill(P([[0, 150], [46, 168], [46, 742], [0, 760]]), '#8a6244', { dir: 88, group: 'curt', maxR: 16, jit: .07 });

  // rug
  R.fill(P([[980, 900], [1700, 860], [1760, 1010], [1030, 1058]]), '#8a4a3c', { dir: 4, group: 'rug', maxR: 22, jit: .08 });
  R.fill(P([[1000, 916], [1680, 878], [1728, 996], [1046, 1038]]), '#a85c46', { dir: 4, group: 'rug2', maxR: 16, jit: .08 });

  // bed: headboard, frame, mattress, folded duvet, pillow — legible silhouette at thumbnail size
  R.fill(P([[1150, 300], [1806, 268], [1806, 520], [1150, 556]]), '#4a3222', { dir: 90, group: 'head', maxR: 18, jit: .06, hgt: 1.2 });
  R.fill(P([[1162, 318], [1796, 286], [1796, 400], [1162, 430]]), '#5d3f2a', { dir: 90, group: 'head2', maxR: 12, jit: .06 });
  R.fill(P([[1124, 748], [1150, 748], [1162, 980], [1136, 980]]), '#4a3222', { dir: 90, group: 'bl1', maxR: 8 });
  R.fill(P([[1786, 690], [1812, 690], [1824, 900], [1798, 900]]), '#4a3222', { dir: 90, group: 'bl2', maxR: 8 });
  // the frame + mattress, mostly hidden by the bedding: a dark band under the sheet
  R.fill(P([[1110, 640], [1800, 596], [1816, 706], [1128, 764]]), '#553a26', { dir: 0, group: 'bedframe', maxR: 20, jit: .07 });
  R.fill(P([[1116, 566], [1802, 522], [1806, 610], [1122, 648]]), '#8a6a48', { dir: 4, group: 'mattress', maxR: 16, jit: .07 });
  // the sheet: the one bright plane, pulled tight and creased
  R.fill(P([[1114, 520], [1560, 488], [1600, 596], [1120, 640]]), '#d9c6a2', { dir: 4, group: 'sheet', maxR: 20, jit: .08, detail: 1.9, hgt: 1.1 });
  R.fill(P([[1240, 512], [1300, 508], [1310, 600], [1248, 606]]), '#cfbd98', { dir: 90, group: 'crease1', maxR: 9, jit: .1 });
  R.fill(P([[1420, 500], [1478, 496], [1488, 592], [1428, 598]]), '#d6c4a0', { dir: 90, group: 'crease2', maxR: 9, jit: .1 });
  // the duvet folded back over her half: darker, one big fold
  R.fill(c => { c.moveTo(1520, 492); c.lineTo(1802, 470); c.lineTo(1812, 600); c.lineTo(1600, 616); c.lineTo(1540, 560); c.closePath(); },
    '#8f7554', { dir: 6, group: 'duvet', maxR: 18, jit: .08, detail: 1.7 });
  R.fill(c => { c.moveTo(1600, 616); c.lineTo(1812, 600); c.lineTo(1816, 660); c.lineTo(1616, 676); c.closePath(); },
    '#71583d', { dir: 6, group: 'duvet2', maxR: 12, jit: .08 });
  // the dip where she sat, and the shadow the bedding throws
  R.fill(P([[1488, 524], [1712, 508], [1722, 588], [1496, 604]]), '#b8a17c', { dir: 4, group: 'dip', maxR: 11, jit: .08 });
  R.fill(P([[1148, 452], [1356, 438], [1366, 514], [1156, 532]]), '#f2e6c8', { dir: 8, group: 'pillow', maxR: 13, jit: .1 });
  R.fill(P([[1120, 640], [1616, 604], [1620, 630], [1128, 668]]), 'rgba(74,50,34,.55)', { dir: 0, group: 'bedsh', maxR: 10, alpha: .9 });

  // nightstand with the cup, and her shoes on the floor
  R.fill(P([[1816, 640], [1900, 634], [1902, 660], [1818, 666]]), '#6a4a34', { dir: 0, group: 'ns', maxR: 8 });
  R.fill(P([[1822, 666], [1832, 666], [1834, 806], [1824, 806]]), '#543c2a', { dir: 90, group: 'nsl', maxR: 5 });
  R.fill(P([[1886, 662], [1896, 662], [1898, 796], [1888, 796]]), '#543c2a', { dir: 90, group: 'nsr', maxR: 5 });
  R.fill(P([[1846, 606], [1884, 604], [1880, 640], [1850, 642]]), '#c0392b', { dir: 90, group: 'cup', maxR: 6, hgt: 1.3 });
  R.fill(E(1865, 605, 20, 5), '#e0654a', { maxR: 4, group: 'cuplip' });
  R.fill(c => { c.ellipse(980, 968, 42, 17, -.1, 0, 7); }, '#5c3f47', { maxR: 8, group: 'shoe1', hgt: 1.2 });
  R.fill(c => { c.ellipse(1042, 986, 40, 16, .05, 0, 7); }, '#5c3f47', { maxR: 8, group: 'shoe2', hgt: 1.2 });

  // chair: back, seat, legs, rail — with her coat over the back
  R.fill(P([[600, 470], [690, 462], [696, 700], [606, 706]]), '#6a4a34', { dir: 90, group: 'cback', maxR: 12, jit: .07 });
  R.fill(P([[684, 466], [696, 464], [702, 704], [690, 706]]), '#4f3626', { dir: 90, group: 'cbacksh', maxR: 7 });
  R.fill(P([[598, 690], [796, 680], [802, 716], [604, 726]]), '#7d573b', { dir: 0, group: 'seat', maxR: 11, jit: .06 });
  R.fill(P([[608, 726], [622, 726], [626, 906], [612, 906]]), '#5a3d2a', { dir: 90, group: 'cl1', maxR: 6 });
  R.fill(P([[780, 716], [794, 716], [798, 892], [784, 892]]), '#5a3d2a', { dir: 90, group: 'cl2', maxR: 6 });
  R.fill(P([[618, 816], [788, 808], [790, 822], [620, 830]]), '#5a3d2a', { dir: 0, group: 'crail', maxR: 5 });
  R.fill(c => { c.moveTo(590, 452); c.lineTo(706, 444); c.lineTo(732, 560); c.lineTo(690, 700); c.lineTo(616, 690); c.lineTo(630, 556); },
    '#4c5d74', { dir: 100, group: 'coat', maxR: 16, jit: .08, detail: 1.7 });
  R.fill(c => { c.moveTo(666, 448); c.lineTo(706, 444); c.lineTo(732, 560); c.lineTo(690, 700); c.lineTo(666, 694); c.lineTo(684, 556); },
    '#5f7288', { dir: 100, group: 'coat2', maxR: 12, jit: .08 });

  // table under the window
  R.fill(P([[286, 688], [520, 674], [524, 700], [290, 714]]), '#6a4a34', { dir: 0, group: 'tbl', maxR: 10 });
  R.fill(P([[318, 714], [330, 714], [332, 890], [320, 890]]), '#543c2a', { dir: 90, group: 'tl1', maxR: 5 });
  R.fill(P([[482, 700], [494, 700], [496, 876], [484, 876]]), '#543c2a', { dir: 90, group: 'tl2', maxR: 5 });

  // the lamp: a small cone and one soft pool on the wall
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * 6.283, x = 1196 + Math.cos(a) * 22, y = 292 + Math.sin(a) * 20;
    R.fill(E(x, y, 118, 96), rad(x, y, 0, 124, [[0, 'rgba(255,206,130,.3)'], [1, 'rgba(240,180,110,0)']]),
      { type: DAB, maxR: 44, group: 'lamppool', alpha: .3, hgt: .35 });
  }
  R.fill(P([[1162, 228], [1230, 228], [1248, 296], [1144, 296]]), '#f6ca7c', { dir: 90, group: 'lamp', maxR: 7, hgt: 1.3 });
  R.fill(P([[1192, 196], [1200, 196], [1200, 232], [1192, 232]]), '#4a3a2c', { dir: 90, group: 'cord', maxR: 3 });

  return done(R, { T: 12 });
}

// ---------------------------------------------------------------- 3 · the square
// One camera, one plate, two worlds: the `grey` sweep is what turns it from grey to colour.
export const SQ = { w: 2112, h: 1188, HZ: 560, VP: [1080, 560], UMB: [1330, 880] };

export function buildSquare(mode = 'colour', withHer = false) {
  const { w: W, h: H, HZ, UMB } = SQ, R = mk(W, H);
  R.fill(P([[0, 0], [W, 0], [W, HZ + 40], [0, HZ + 40]]),
    lin(0, 0, 0, HZ, [[0, '#3f6a94'], [.4, '#7b9cb8'], [.68, '#dba87a'], [.88, '#f2cb90'], [1, '#f8ddb4']]),
  { dir: -4, fallback: -4, group: 'sky', maxR: 44, jit: .06, detail: 2.3, aj: .28 });

  // clouds: violet-grey banks with warm undersides
  [[420, 150, 300, 62], [1420, 110, 360, 66], [960, 300, 260, 38], [1850, 330, 210, 32]].forEach(([x, y, w0, h0], i) => {
    R.fill(c2 => { c2.ellipse(x, y, w0, h0, 0, 0, 7); c2.ellipse(x - w0 * .5, y + h0 * .3, w0 * .6, h0 * .7, 0, 0, 7); c2.ellipse(x + w0 * .55, y + h0 * .35, w0 * .5, h0 * .6, 0, 0, 7); },
      lin(0, y - h0, 0, y + h0, [[0, '#6a7e9e'], [.6, '#9599ad'], [1, '#eda98a']]),
    { dir: -4, fallback: -4, group: 'cloud' + i, maxR: 24, detail: 1.5, aj: .3 });
  });

  // wet ground: bands, brighter toward the vanishing point, warm reflections near the light
  const gcol = lin(0, HZ, 0, H, [[0, '#e0b98e'], [.12, '#a89499'], [.35, '#6e6478'], [.7, '#4d4656'], [1, '#372f3d']]);
  [[HZ - 20, 600, 5], [600, 660, 8], [660, 760, 12], [760, 900, 18], [900, H, 26]]
    .forEach(([y0, y1, r], i) => R.fill(P([[0, y0], [W, y0], [W, y1], [0, y1]]), gcol,
      { dir: 0, fallback: 0, group: 'ground' + i, maxR: r, aj: .3, jit: .09 }));
  { const c0 = R.ctx; c0.save(); c0.filter = 'blur(34px)'; c0.globalCompositeOperation = 'source-atop';
    c0.beginPath(); P([[1010, HZ], [1170, HZ], [1580, H + 60], [540, H + 60]])(c0);
    c0.fillStyle = lin(0, HZ, 0, H, [[0, 'rgba(255,224,176,.95)'], [.32, 'rgba(232,170,132,.5)'], [1, 'rgba(120,110,150,.08)']])(c0);
    c0.fill(); c0.restore(); }

  // facades
  const L1 = [[0, 40], [520, 300], [520, 700], [0, 900]], R1 = [[W, 40], [W - 520, 300], [W - 520, 700], [W, 900]];
  R.fill(P(L1), lin(0, 0, 0, 900, [[0, '#e0aa6a'], [.55, '#bd8452'], [1, '#8c5c42']]),
    { dir: 90, fallback: 90, group: 'l1', maxR: 32, detail: 1.7 });
  R.fill(P(R1), lin(W, 0, W, 900, [[0, '#d2a072'], [.55, '#ab7852'], [1, '#80543c']]),
    { dir: 90, fallback: 90, group: 'r1', maxR: 32, detail: 1.7 });
  // cornices and the dark eave line
  R.fill(P([[0, 40], [520, 300], [520, 322], [0, 66]]), '#4a3f4e', { dir: 25, group: 'eave1', maxR: 12 });
  R.fill(P([[W, 40], [W - 520, 300], [W - 520, 322], [W, 66]]), '#463b48', { dir: 25, group: 'eave2', maxR: 12 });
  // far street between them
  R.fill(P([[870, 430], [1080, 500], [1080, 566], [870, 592]]), lin(870, 0, 1080, 0, [[0, '#bfa48e'], [1, '#cbb094']]), { dir: 90, maxR: 8, group: 'far' });
  R.fill(P([[1080, 470], [1240, 452], [1240, 566], [1080, 566]]), '#c19a80', { dir: 90, maxR: 8, group: 'far2' });
  R.fill(P([[1150, 470], [1150, 330], [1166, 312], [1182, 330], [1182, 470]]), '#9a8ca4', { dir: 90, maxR: 6, group: 'bel' });
  R.fill(P([[1143, 334], [1166, 258], [1189, 334]]), '#7d7390', { dir: 90, maxR: 5, group: 'bel' });
  R.fill(E(1166, 372, 8, 10), '#ffe0a0', { maxR: 3, group: 'belw' });

  // windows on both facades: gold, a few shutters, a shopfront band
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1, u = .16 + (i % 11) * .072, y = 350 + ((i >> 1) % 4) * 82;
    const x = side < 0 ? u * 400 : W - u * 400, w0 = 15 + (i % 3) * 6;
    R.fill(P([[x, y], [x + w0, y], [x + w0, y + 28], [x, y + 28]]), i % 5 === 0 ? '#5c4a58' : '#f4c878',
      { dir: 90, maxR: 4, group: 'win' + i });
  }
  R.fill(P([[0, 700], [520, 668], [520, 714], [0, 760]]), '#7a4636', { dir: 0, group: 'shop1', maxR: 14 });
  R.fill(P([[W, 700], [W - 520, 668], [W - 520, 714], [W, 760]]), '#6f4032', { dir: 0, group: 'shop2', maxR: 14 });
  // depth on the facades: a plinth in shadow, a cornice line, and dark reveals around every window
  const plinth = (x0, y0, x1, y1, g) => R.fill(P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), '#5c3d30',
    { dir: 90, group: g, maxR: 16, jit: .06 });
  plinth(0, 640, 518, 760, 'pl1'); plinth(W, 640, W - 518, 760, 'pl2');
  R.fill(P([[0, 330], [520, 396], [520, 414], [0, 352]]), '#8a5c46', { dir: 20, group: 'corn1', maxR: 10, alpha: .9 });
  R.fill(P([[W, 330], [W - 520, 396], [W - 520, 414], [W, 352]]), '#8a5c46', { dir: 20, group: 'corn2', maxR: 10, alpha: .9 });
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1, u = .16 + (i % 6) * .13, y = 350 + ((i >> 1) % 3) * 82;
    const x = side < 0 ? u * 400 : W - u * 400, w0 = 15 + (i % 3) * 6;
    R.fill(P([[x - 5, y - 5], [x + w0 + 5, y - 5], [x + w0 + 5, y + 33], [x - 5, y + 33]]), 'rgba(60,40,44,.55)',
      { dir: 90, maxR: 5, group: 'rev' + i, alpha: .8 });
  }
  // three arched doorways at street level
  [[210, 700], [W - 210, 690], [980, 606]].forEach(([x, y], i) => {
    const s = i === 2 ? .55 : 1;
    R.fill(c => { c.moveTo(x - 54 * s, y); c.lineTo(x - 54 * s, y - 96 * s); c.ellipse(x, y - 96 * s, 54 * s, 44 * s, 0, Math.PI, 0); c.lineTo(x + 54 * s, y); },
      '#2f2630', { dir: 90, group: 'door' + i, maxR: 10 });
    R.fill(E(x, y - 96 * s, 40 * s, 32 * s), 'rgba(255,206,130,.28)', { type: DAB, maxR: 14, group: 'doorl' + i, alpha: .8 });
  });

  // two street lamps on the wet ground, each with its horizontal reflection dabs
  [[560, 700, 300], [1620, 690, 300]].forEach(([x, y, h], i) => {
    R.fill(P([[x - 9, y - h], [x + 9, y - h], [x + 12, y - 6], [x - 12, y - 6]]), '#3c342c', { dir: 90, maxR: 6, group: 'post' + i });
    R.fill(P([[x - 20, y - 8], [x + 20, y - 8], [x + 22, y + 4], [x - 22, y + 4]]), '#4a4034', { dir: 0, maxR: 5, group: 'pbase' + i });
    // the lantern: a warm body and a soft halo behind it
    for (let k = 0; k < 3; k++) R.fill(E(x, y - h - 18, 62 + k * 26, 56 + k * 22), rad(x, y - h - 18, 0, 76 + k * 26,
      [[0, 'rgba(255,226,150,.42)'], [1, 'rgba(255,200,110,0)']]), { type: DAB, maxR: 34, group: 'halo' + i + k, alpha: .42, hgt: .4 });
    R.fill(P([[x - 22, y - h - 40], [x + 22, y - h - 40], [x + 16, y - h + 2], [x - 16, y - h + 2]]), '#ffdc9a',
      { dir: 90, maxR: 6, group: 'lamp' + i, hgt: 1.4 });
    R.fill(P([[x - 26, y - h - 48], [x + 26, y - h - 48], [x + 22, y - h - 38], [x - 22, y - h - 38]]), '#4a4034',
      { dir: 0, maxR: 5, group: 'lcap' + i });
    for (let k = 0; k < 8; k++) R.fill(P([[x - 24 + k * 1.6, y + 22 + k * 26], [x + 24 - k * 1.6, y + 22 + k * 26],
      [x + 24 - k * 1.6, y + 38 + k * 26], [x - 24 + k * 1.6, y + 38 + k * 26]]),
      `rgba(252,216,152,${.5 - k * .055})`, { dir: 0, maxR: 6, group: 'refl' + i + '_' + k });
  });

  if (withHer) {
  // ---------------- her: small, off-centre, the only red in the world
  const [ux, uy] = UMB;
  R.fill(P([[ux - 34, uy - 250], [ux + 34, uy - 250], [ux + 52, uy - 40], [ux - 52, uy - 40]]), '#c0392b',
    { dir: 90, group: 'coat', maxR: 13, jit: .07, hgt: 1.2 });
  R.fill(P([[ux - 30, uy - 40], [ux - 6, uy - 40], [ux - 8, uy], [ux - 34, uy]]), '#33404f', { dir: 90, maxR: 8, group: 'leg1' });
  R.fill(P([[ux + 6, uy - 40], [ux + 30, uy - 40], [ux + 34, uy], [ux + 8, uy]]), '#2c3642', { dir: 90, maxR: 8, group: 'leg2' });
  R.fill(E(ux, uy - 274, 27, 32), '#d8ab86', { maxR: 8, group: 'head' });
  R.fill(c => { c.ellipse(ux, uy - 286, 29, 26, 0, Math.PI, 0); c.rect(ux - 29, uy - 286, 9, 28); c.rect(ux + 20, uy - 286, 9, 28); },
    '#2e2530', { maxR: 7, group: 'hair' });
  // the umbrella: scalloped canopy (six panels), lit on the right, shadowed underneath
  const cy = uy - 372, rx = 156, ry = 66;
  const canopy = (sc) => (c) => {
    c.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI; c[i ? 'lineTo' : 'moveTo'](ux + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
    for (let i = 6; i >= 0; i--) { const a = Math.PI + i / 6 * Math.PI; c.lineTo(ux + Math.cos(a) * rx * .995, cy + Math.sin(a) * ry * .995 + 10 + sc); }
    c.closePath();
  };
  R.fill(canopy(0), '#c0392b', { dir: { radial: [ux, cy - 40] }, group: 'umb', maxR: 22, jit: .06, hgt: 1.5, detail: 1.9 });
  R.fill(c => { c.ellipse(ux, cy + 6, rx * .97, ry * .5, 0, 0, Math.PI); }, '#8a2820', { dir: 0, group: 'umbshade', maxR: 14 });
  R.fill(c => { c.ellipse(ux + 54, cy - 24, rx * .46, ry * .46, -.22, Math.PI, 0); }, '#e0684a',
    { dir: { radial: [ux + 62, cy - 32] }, group: 'umblit', maxR: 13 });
  // ribs: one per panel seam, thin and slightly darker
  for (let i = 1; i < 6; i++) { const a = Math.PI + i / 6 * Math.PI; R.line(c => { c.moveTo(ux, cy - ry * .95); c.lineTo(ux + Math.cos(a) * rx, cy + Math.sin(a) * ry * .98); }, '#8a2820', 2, { dir: 'edge', group: 'rib' + i, maxR: 3 }); }
  R.fill(P([[ux - 4, cy - 52], [ux + 4, cy - 52], [ux + 4, uy - 250], [ux - 4, uy - 250]]), '#4a4238',
    { dir: 90, maxR: 3, group: 'shaft' });

  // other people: dark, hooded, each under an umbrella — the square must read as occupied
  [[700, 940, .55], [1050, 862, .38], [1704, 826, .34], [400, 1002, .62], [1450, 992, .5], [1840, 1080, .72]].forEach(([x, y, s], i) => {
    const h0 = 250 * s, cy = y - h0 - 78 * s, rx = 92 * s, ry = 34 * s;
    // body: a tapered coat, one value, hard silhouette
    R.fill(c => { c.moveTo(x - 30 * s, y); c.lineTo(x - 26 * s, y - h0 * .82); c.lineTo(x + 26 * s, y - h0 * .82); c.lineTo(x + 30 * s, y); },
      i % 2 ? '#43394a' : '#3a3244', { dir: 90, group: 'p' + i, maxR: 9, jit: .06 });
    R.fill(E(x, y - h0 * .9, 15 * s, 17 * s), '#c9a184', { maxR: 5, group: 'ph' + i });
    // umbrella: half-ellipse canopy + shaft
    R.fill(c => { c.ellipse(x, cy, rx, ry, 0, Math.PI, 0); c.lineTo(x + rx, cy + 3 * s); c.lineTo(x - rx, cy + 3 * s); },
      i % 3 ? '#2f2a3a' : '#57405e', { dir: { radial: [x, cy - 30] }, group: 'pu' + i, maxR: 12, jit: .07, hgt: 1.2 });
    R.fill(P([[x - 1.6 * s, cy - 20 * s], [x + 1.6 * s, cy - 20 * s], [x + 1.6 * s, y - h0 * .84], [x - 1.6 * s, y - h0 * .84]]),
      '#2a2430', { dir: 90, maxR: 3, group: 'ps' + i });
  });

  }

  // rain
  for (let i = 0; i < 44; i++) {
    const x = (i * 337) % W, y = 60 + (i * 211) % (H - 120), len = 30 + (i % 7) * 14;
    R.line(c => { c.moveTo(x, y); c.lineTo(x - 6, y + len); }, 'rgba(240,244,248,.2)', 1.8,
      { dir: 75, group: 'rain' + i, maxR: 3, jit: .04 });
  }

  // every stroke carries when the knife will reach it: distance from her umbrella / sweep speed
  const rev = (x, y) => Math.hypot(x - UMB[0], y - UMB[1]) / 620;
  return done(R, { T: 13, rev });
}

// ---------------------------------------------------------------- 4 · the mirror
// Two panels of the same face. The left one comes apart; later it is knitted back.
export function buildMirror() {
  const W = 1920, H = 1080, R = mk(W, H);
  const M = { lx: 330, rx: 1030, y0: 150, w: 560, h: 780 };
  // wall: dark warm, with a band of lamplight so it is not a void
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), lin(0, 0, 0, H, [[0, '#4c3a2c'], [.6, '#41322a'], [1, '#332720']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 58, jit: .04, detail: 2 });
  R.fill(P([[0, 0], [W, 0], [W, 300], [0, 360]]), 'rgba(232,186,120,.14)',
    { dir: 20, group: 'wallband', maxR: 40, alpha: .9 });
  [[M.lx, 'A', 1], [M.rx, 'B', 0]].forEach(([x, k, left]) => {
    // glass: cool, darker than the wall lit surface, with a vertical highlight
    R.fill(P([[x, M.y0], [x + M.w, M.y0], [x + M.w, M.y0 + M.h], [x, M.y0 + M.h]]),
      lin(x, M.y0, x + M.w, M.y0 + M.h, [[0, '#38505a'], [.45, '#547078'], [1, '#2b3d45']]),
      { dir: 90, group: 'mir' + k, maxR: 36, jit: .05, detail: 2.1 });
    // the window's reflection in the glass: a bright quad, and the frame line across it
    R.fill(P([[x + 60, M.y0 + 40], [x + M.w * .52, M.y0 + 10], [x + M.w * .58, M.y0 + 300], [x + 70, M.y0 + 330]]),
      'rgba(226,238,236,.22)', { dir: 90, group: 'refl' + k, maxR: 26, alpha: .9 });
    R.fill(P([[x + M.w * .5, M.y0 + 8], [x + M.w * .53, M.y0 + 6], [x + M.w * .59, M.y0 + 700], [x + M.w * .56, M.y0 + 704]]),
      'rgba(226,238,236,.16)', { dir: 90, group: 'refl2' + k, maxR: 18 });
    // the gold frame, lit on the side the lamp is
    [[x - 30, M.y0 - 30, x + M.w + 30, M.y0], [x - 30, M.y0 + M.h, x + M.w + 30, M.y0 + M.h + 30],
     [x - 30, M.y0, x, M.y0 + M.h], [x + M.w, M.y0, x + M.w + 30, M.y0 + M.h]]
      .forEach(([x0, y0, x1, y1], i) => R.fill(P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), '#3a2a16',
        { dir: 90, group: 'mf' + k + i, maxR: 8, jit: .06, hgt: 1.3 }));
    R.fill(P([[x - 30, M.y0 - 30], [x - 10, M.y0 - 30], [x - 10, M.y0 + M.h + 30], [x - 30, M.y0 + M.h + 30]]), '#c69a52',
      { dir: 90, group: 'mflit' + k, maxR: 6 });

    // the face: shoulders, neck, head, hair, then the features — value before detail
    const fx = x + M.w / 2, fy = M.y0 + 400;
    R.fill(c => { c.moveTo(fx - 200, M.y0 + M.h); c.lineTo(fx - 120, fy + 130); c.lineTo(fx + 120, fy + 130); c.lineTo(fx + 200, M.y0 + M.h); },
      left ? '#4c4458' : '#46505e', { dir: 100, group: 'body' + k, maxR: 16, jit: .06 });
    R.fill(P([[fx - 30, fy + 96], [fx + 30, fy + 96], [fx + 34, fy + 140], [fx - 34, fy + 140]]), '#b98f6e',
      { dir: 100, group: 'neck' + k, maxR: 8 });
    R.fill(c => { c.ellipse(fx, fy - 30, 86, 108, 0, 0, 7); }, '#cfa07c', { dir: 100, group: 'face' + k, maxR: 15, jit: .05, detail: 1.6 });
    // the shadow side (light from the lamp, upper left)
    R.fill(c => { c.ellipse(fx + 40, fy - 24, 54, 100, 0, -1.45, 1.45); }, 'rgba(122,74,56,.42)',
      { dir: 100, group: 'shade' + k, maxR: 12, alpha: .92 });
    R.fill(c => { c.ellipse(fx, fy - 96, 94, 74, 0, Math.PI, 0); c.rect(fx - 94, fy - 96, 26, 140); c.rect(fx + 68, fy - 96, 26, 140); },
      '#2c2328', { dir: 95, group: 'hair' + k, maxR: 13, jit: .05 });
    R.fill(c => { c.ellipse(fx - 20, fy - 104, 62, 30, -.2, Math.PI, 0); }, '#4a3a3c',
      { dir: 95, group: 'hairlit' + k, maxR: 9 });
    R.fill(E(fx - 32 - left * 4, fy - 22, 13, 7), '#241d1c', { type: DAB, maxR: 5, group: 'eye' + k + '1' });
    R.fill(E(fx + 32 + left * 4, fy - 22, 13, 7), '#241d1c', { type: DAB, maxR: 5, group: 'eye' + k + '2' });
    R.fill(E(fx - 12 - left * 2, fy - 26, 4, 4), 'rgba(255,248,232,.85)', { type: DAB, maxR: 3, group: 'spk' + k });
    R.fill(E(fx + left * 4, fy + 34, 17, 5), '#a0564a', { type: DAB, maxR: 4, group: 'mouth' + k });
  });
  // the crack: hard, bright, one zigzag and a thinner branch
  R.line(c => { c.moveTo(M.lx + 280, M.y0); c.lineTo(M.lx + 330, M.y0 + 176); c.lineTo(M.lx + 266, M.y0 + 310);
    c.lineTo(M.lx + 352, M.y0 + 444); c.lineTo(M.lx + 282, M.y0 + 574); c.lineTo(M.lx + 322, M.y0 + M.h); },
  '#eef4f6', 5, { dir: 'edge', group: 'crack', maxR: 4, jit: .02 });
  R.line(c => { c.moveTo(M.lx + 310, M.y0 + 280); c.lineTo(M.lx + 168, M.y0 + 406); c.lineTo(M.lx + 112, M.y0 + 610); },
    '#cdd8de', 2.4, { dir: 'edge', group: 'crack2', maxR: 3 });
  // two shards that have shifted, catching the light
  R.fill(P([[M.lx + 300, M.y0 + 430], [M.lx + 392, M.y0 + 470], [M.lx + 330, M.y0 + 560]]), 'rgba(238,246,248,.5)',
    { dir: 40, group: 'shard1', maxR: 8, alpha: .9, hgt: 1.5 });
  R.fill(P([[M.lx + 150, M.y0 + 560], [M.lx + 236, M.y0 + 610], [M.lx + 176, M.y0 + 690]]), 'rgba(238,246,248,.36)',
    { dir: 60, group: 'shard2', maxR: 7, alpha: .85 });

  return done(R, { T: 11 });
}
