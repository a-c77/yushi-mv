// 《于是》— 第二批底板：俯视、仰视、门框、水洼、伞面。
// 全部用全彩画（灰世界靠引擎的 grey uniform），和 plates.js 同一套画法。
import { Ref, paintRef } from '../engine/plate.js';
import { KNIFE, DAB } from '../engine/impasto.js';
import { P, E, lin, rad, lerp } from './common.js';

const mk = (w, h, scale = 1) => new Ref(w, h, scale);
const done = (R, o) => ({ ref: R, strokes: paintRef(R, { seed: 1, ...o }), w: R.w, h: R.h });

// ---------------------------------------------------------------- 天花板（仰视）
// 他躺在/坐在暗处看天花板的那两个瞬间。灯是画面里唯一的暖。
export const CEIL = { w: 1920, h: 1080 };
export function buildCeiling() {
  const W = 1920, H = 1080, R = mk(W, H);
  // 顶面：中间亮、四周压暗，靠两支交叉的宽刀痕做出石膏的走向
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]),
    rad(1180, 520, 80, 1500, [[0, '#8a7460'], [.45, '#6d5a49'], [.8, '#4b3d31'], [1, '#33291f']]),
  { dir: 12, fallback: 12, group: 'ceil', maxR: 60, jit: .06, detail: 2.2, aj: .3 });
  R.fill(P([[0, 0], [W, 0], [W, 210], [0, 150]]), '#2e251d', { dir: 0, group: 'ceilsh', maxR: 40, alpha: .9 });
  R.fill(P([[0, 940], [W, 1000], [W, H], [0, H]]), '#2a221b', { dir: 0, group: 'ceilsh2', maxR: 40, alpha: .85 });
  // 一条细裂缝，斜着穿过顶面（后面会和镜子的裂缝呼应）
  R.line(c => { c.moveTo(760, 0); c.bezierCurveTo(820, 300, 700, 520, 790, 760); c.bezierCurveTo(830, 860, 800, 980, 860, H); },
    '#3a2d22', 5, { dir: 'edge', group: 'ccrack', maxR: 5, jit: .03 });
  // 灯：罩子 + 光晕 + 吊线
  for (let i = 0; i < 5; i++) R.fill(E(1180, 520, 150 + i * 40, 120 + i * 34), rad(1180, 520, 0, 190 + i * 40,
    [[0, 'rgba(255,222,160,.34)'], [1, 'rgba(255,200,120,0)']]), { type: DAB, maxR: 56, group: 'glow' + i, alpha: .34, hgt: .4 });
  R.fill(c => { c.ellipse(1180, 520, 150, 60, 0, 0, Math.PI); c.ellipse(1180, 520, 96, 34, 0, 0, Math.PI); },
    lin(0, 460, 0, 560, [[0, '#e8c284'], [1, '#b98a4e']]), { dir: { radial: [1180, 470] }, group: 'shade', maxR: 26, jit: .06, hgt: 1.4, detail: 1.8 });
  R.fill(E(1180, 540, 44, 20), '#fff0c0', { type: DAB, maxR: 16, group: 'bulb', hgt: 1.2 });
  R.fill(P([[1176, 300], [1184, 300], [1184, 470], [1176, 470]]), '#3a2f24', { dir: 90, group: 'cord', maxR: 4 });
  R.fill(E(1180, 296, 30, 10), '#4a3c2c', { maxR: 6, group: 'rose' });
  return done(R, { T: 13 });
}

// ---------------------------------------------------------------- 门框（走廊的光）
// 门开着，光从里面漏出来；他站在门里/门外。构图是竖的，给"留在原地"用。
export const DOOR = { w: 1920, h: 1080 };
export function buildDoorway() {
  const W = 1920, H = 1080, R = mk(W, H);
  // 墙：暗的两片，中间是门洞
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), lin(0, 0, W, H, [[0, '#4a3a2c'], [.5, '#3d3026'], [1, '#2c231b']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 58, jit: .05, detail: 2.1 });
  // 门洞里的光：一间更亮的房间
  R.fill(P([[700, 120], [1230, 96], [1230, 962], [700, 986]]),
    lin(0, 120, 0, 980, [[0, '#f2d9a6'], [.45, '#e0b878'], [1, '#c08a52']]),
  { dir: 90, group: 'opening', maxR: 44, jit: .05, detail: 2 });
  // 门里能看见的一点东西：地板线、一把椅子的腿、墙上的光斑
  R.fill(P([[700, 700], [1230, 686], [1230, 760], [700, 774]]), '#a8764a', { dir: 0, group: 'infloor', maxR: 20 });
  R.fill(P([[900, 560], [1080, 552], [1084, 700], [904, 708]]), 'rgba(120,74,40,.35)', { dir: 90, group: 'inchair', maxR: 14, alpha: .8 });
  R.fill(P([[760, 300], [880, 292], [884, 430], [764, 438]]), 'rgba(255,240,200,.5)', { dir: 0, group: 'inlight', maxR: 18 });
  // 门框：厚木，内侧被光打亮
  const fr = [[660, 90, 700, 1000], [1230, 70, 1276, 1000], [640, 76, 1290, 120], [640, 1000, 1290, 1040]];
  fr.forEach(([x0, y0, x1, y1], i) => R.fill(P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), '#4a3020',
    { dir: 90, group: 'frame' + i, maxR: 14, jit: .06, hgt: 1.2 }));
  R.fill(P([[700, 96], [716, 92], [716, 1000], [700, 1000]]), '#e8c07a', { dir: 90, group: 'framelit', maxR: 8 });
  R.fill(P([[1214, 80], [1230, 78], [1230, 986], [1214, 986]]), '#c9974e', { dir: 90, group: 'framelit2', maxR: 8 });
  // 光洒在门外的地板上
  R.fill(P([[700, 986], [1230, 962], [1560, H], [420, H]]),
    lin(0, 970, 0, H, [[0, 'rgba(255,214,146,.62)'], [1, 'rgba(190,140,86,.06)']]),
  { dir: 0, group: 'spill', maxR: 26, alpha: .9, hgt: .4 });
  // 门缝里飘出来的浮尘（静态的几粒，动的那层在 anim 里）
  for (let i = 0; i < 16; i++) {
    const h1 = Math.sin(i * 12.9) * .5 + .5, h2 = Math.sin(i * 7.3) * .5 + .5;
    R.fill(E(lerp(720, 1210, h1), lerp(200, 900, h2), 2 + (i % 3), 2 + (i % 3)), 'rgba(255,244,214,.55)',
      { type: DAB, maxR: 3, group: 'mot' + i });
  }
  // 墙上一枚挂衣钩 + 一件没带走的外套（呼应房间里的那件）
  R.fill(P([[1560, 300], [1590, 300], [1590, 330], [1560, 330]]), '#2f2820', { dir: 0, group: 'hook', maxR: 5 });
  R.fill(c => { c.moveTo(1500, 340); c.lineTo(1650, 330); c.lineTo(1684, 560); c.lineTo(1620, 660); c.lineTo(1520, 650); c.closePath(); },
    '#42536b', { dir: 100, group: 'coat', maxR: 16, jit: .08, detail: 1.7 });
  return done(R, { T: 12 });
}

// ---------------------------------------------------------------- 俯视石板地
// 人群从头顶走过，伞在雨里像一圈圈颜色。给副歌"错过"那一段用。
export const TOP = { w: 2112, h: 1188 };
export function buildTopGround() {
  const { w: W, h: H } = TOP, R = mk(W, H);
  // 湿石板：一排排不规则的石头，缝里更暗
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), '#332d29', { dir: 0, fallback: 0, group: 'grout', maxR: 44, jit: .06, detail: 2 });
  let row = 0;
  for (let y = 0; y < H; y += 104) {
    const off = (row++ % 2) * 76;
    for (let x = -120 + off; x < W + 120; x += 152) {
      const jx = Math.sin(x * .07 + y * .11) * 10, jy = Math.cos(x * .05 - y * .09) * 8;
      const c = ['#7b6a58', '#8a7660', '#6b5d4e', '#9a8468'][(row + Math.round(x / 152)) & 3];
      R.fill(P([[x + jx, y + jy], [x + 140 + jx, y + 6 + jy], [x + 146 + jx, y + 96 + jy], [x + 6 + jx, y + 92 + jy]]), c,
        { dir: 4, fallback: 4, group: 'st' + row + '_' + Math.round(x / 152), maxR: 22, jit: .07, detail: 1.8 });
    }
  }
  // 积水：几块亮的部分，把天光翻上来
  [[420, 400, 560, 250], [1460, 800, 620, 300]].forEach(([x, y, w0, h0], i) => {
    R.fill(E(x, y, w0, h0), rad(x, y, 0, Math.max(w0, h0),
      [[0, 'rgba(206,220,224,.5)'], [.5, 'rgba(150,172,186,.26)'], [1, 'rgba(120,140,156,0)']]),
    { type: DAB, maxR: 90, group: 'pud' + i, alpha: .55, hgt: .25 });
  });
  // 一条排水沟，给画面一条明确的线
  R.fill(P([[0, 1010], [W, 986], [W, 1030], [0, 1056]]), '#2f2b2a', { dir: 0, group: 'grate', maxR: 16 });
  for (let x = 40; x < W; x += 46) R.fill(P([[x, 1002], [x + 10, 1000], [x + 10, 1046], [x, 1048]]), '#4a4442', { dir: 90, maxR: 5, group: 'bar' + x });
  return done(R, { T: 12 });
}

// ---------------------------------------------------------------- 俯视红伞（伞面特写）
// 雨打在伞上。她抬头，我们只看得到伞和她的一段肩。
export const UMBTOP = { w: 1920, h: 1080 };
export function buildUmbrellaTop() {
  const W = 1920, H = 1080, R = mk(W, H);
  const cx = 960, cy = 620, rx = 620, ry = 560;
  // 背景：暗下来的石板地，虚
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), lin(0, 0, 0, H, [[0, '#3a3430'], [.6, '#2f2a27'], [1, '#241f1d']]),
    { dir: 0, fallback: 0, group: 'bg', maxR: 50, jit: .05, detail: 1.8 });
  // 伞面：八片，相邻两种红；外圈亮、中间暗（伞骨撑起的高度）
  for (let i = 0; i < 8; i++) {
    const a0 = i / 8 * Math.PI * 2, a1 = (i + 1) / 8 * Math.PI * 2;
    R.fill(c => { c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry); c.lineTo(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry); },
      i % 2 ? '#b8332a' : '#a42a24', { dir: { radial: [cx, cy] }, group: 'panel' + i, maxR: 40, jit: .06, detail: 2, hgt: 1.4 });
  }
  // 中心顶帽
  R.fill(E(cx, cy, 54, 48), rad(cx, cy, 0, 56, [[0, '#e0684a'], [.6, '#c0392b'], [1, '#8a241a']]),
    { dir: { radial: [cx, cy] }, group: 'cap', maxR: 18, hgt: 1.6 });
  // 伞骨：八根从中心出去，稍暗
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    R.line(c => { c.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 28); c.lineTo(cx + Math.cos(a) * rx * .98, cy + Math.sin(a) * ry * .98); },
      '#7d1e18', 5, { dir: { radial: [cx, cy] }, group: 'rib' + i, maxR: 6, jit: .02 });
  }
  // 外缘：一道亮边（逆光），下面压一层暗
  for (let i = 0; i < 8; i++) {
    const a0 = i / 8 * Math.PI * 2, a1 = (i + 1) / 8 * Math.PI * 2;
    R.fill(c => { c.ellipse(cx, cy, rx, ry, 0, a0, a1); c.ellipse(cx, cy, rx - 26, ry - 24, 0, a1, a0, true); },
      'rgba(255,170,120,.5)', { dir: { radial: [cx, cy] }, group: 'rim' + i, maxR: 12, hgt: 1.5 });
  }
  // 伞下的她：只露一段肩和头顶
  R.fill(c => { c.ellipse(cx + 40, cy + 300, 180, 120, 0, Math.PI, 0); c.rect(cx - 140, cy + 300, 360, 200); },
    '#41506a', { dir: 100, group: 'shoulder', maxR: 26, jit: .07, detail: 1.7 });
  R.fill(E(cx + 30, cy + 250, 92, 78), '#2c2530', { dir: { radial: [cx + 30, cy + 250] }, group: 'hair', maxR: 18 });
  // 伞面上滚着的水珠（静态的一部分；会动的在 anim 里）
  for (let i = 0; i < 26; i++) {
    const a = Math.sin(i * 12.9) * .5 + .5, r = .25 + (Math.sin(i * 4.1) * .5 + .5) * .68;
    R.fill(E(cx + Math.cos(a * 6.28) * rx * r, cy + Math.sin(a * 6.28) * ry * r, 7, 6),
      'rgba(255,220,208,.6)', { type: DAB, maxR: 5, group: 'bead' + i, hgt: 1 });
  }
  return done(R, { T: 12 });
}

// ---------------------------------------------------------------- 水洼特写
// 他/她的倒影在水里被雨打碎——"镜子两面"的另一种说法。
export const PUD = { w: 1920, h: 1080 };
export function buildPuddle() {
  const W = 1920, H = 1080, R = mk(W, H);
  // 沥青：粗糙、深；上半是路的远侧
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]), lin(0, 0, 0, H, [[0, '#4a4544'], [.4, '#3a3634'], [1, '#262221']]),
    { dir: 0, fallback: 0, group: 'road', maxR: 48, jit: .07, detail: 2.1 });
  // 水洼：一大片不规则的液体，里面是天和灯
  R.fill(c => { c.moveTo(140, 470); c.bezierCurveTo(420, 300, 900, 300, 1240, 380); c.bezierCurveTo(1620, 460, 1800, 620, 1740, 800);
    c.bezierCurveTo(1660, 990, 1180, 1040, 820, 1000); c.bezierCurveTo(420, 960, 60, 760, 140, 470); },
    lin(0, 340, 0, 1030, [[0, '#9fb3bd'], [.35, '#7d919d'], [.72, '#54646e'], [1, '#37424a']]),
  { dir: 0, fallback: 0, group: 'water', maxR: 40, jit: .05, detail: 2 });
  // 水里的倒影：一盏路灯的橙、一段红伞的红、暗掉的楼
  R.fill(E(560, 640, 210, 150), rad(560, 640, 0, 220, [[0, 'rgba(255,206,140,.8)'], [.5, 'rgba(230,170,110,.4)'], [1, 'rgba(200,140,90,0)']]),
    { type: DAB, maxR: 34, group: 'reflLamp', alpha: .85, hgt: .35 });
  for (let k = 0; k < 9; k++) R.fill(P([[470 - k * 6, 780 + k * 26], [660 + k * 6, 780 + k * 26], [660 + k * 6, 800 + k * 26], [470 - k * 6, 800 + k * 26]]),
    `rgba(255,214,150,${.42 - k * .045})`, { dir: 0, maxR: 8, group: 'reflBar' + k });
  R.fill(P([[1240, 700], [1420, 690], [1440, 830], [1258, 842]]), 'rgba(176,52,42,.5)', { dir: 90, group: 'reflUmb', maxR: 20, alpha: .9 });
  R.fill(P([[120, 520], [400, 500], [420, 620], [140, 640]]), 'rgba(40,44,52,.35)', { dir: 90, group: 'reflBld', maxR: 18, alpha: .8 });
  // 水面上的亮点和雨打的凹坑
  for (let i = 0; i < 40; i++) {
    const h1 = Math.sin(i * 9.7) * .5 + .5, h2 = Math.sin(i * 5.3 + 1) * .5 + .5;
    R.fill(E(lerp(200, 1720, h1), lerp(420, 990, h2), 3 + (i % 4) * 2, 2 + (i % 3) * 2),
      'rgba(236,244,248,.55)', { type: DAB, maxR: 4, group: 'sp' + i });
  }
  // 岸：水洼边上的一圈干石头，把水"框"出来
  R.line(c => { c.moveTo(140, 470); c.bezierCurveTo(420, 300, 900, 300, 1240, 380); },
    'rgba(120,112,106,.55)', 6, { dir: 'edge', group: 'edge1', maxR: 5, jit: .04 });
  R.line(c => { c.moveTo(820, 1000); c.bezierCurveTo(1180, 1040, 1660, 990, 1740, 800); },
    'rgba(120,112,106,.45)', 6, { dir: 'edge', group: 'edge2', maxR: 5, jit: .04 });
  return done(R, { T: 12 });
}
