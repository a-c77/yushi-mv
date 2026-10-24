// 《于是》— director's timeline. 28 shots; everything that moves is repainted every frame.
// 4 plates from plates.js (window / room / square / mirror) + 5 from plates2.js
// (ceiling / doorway / overhead ground / umbrella top / puddle), plus burned-in lyrics.
import { Impasto, Strokes, hex, mixc } from './engine/impasto.js';
import { buildWindow, buildRoom, buildSquare, buildMirror, SQ, WIN } from './scenes/plates.js';
import { buildCeiling, buildDoorway, buildTopGround, buildUmbrellaTop, buildPuddle, TOP, UMBTOP } from './scenes/plates2.js';
import { figure, umbrella, walkPose, SIT, STAND } from './scenes/figure.js';
import { rain, drips, stars, ripples, crowd, crack, wipe, clouds, shimmer, canopyDrops, motes, umbrellaTop } from './scenes/anim.js';
import { lerp, clamp, ss, seg, eio, eo, hash } from './scenes/common.js';

const NEVER = 1e6, W = 1920, H = 1080;
const DUR = 232.83;

export const SONG = {
  intro: [0, 14.55], v1: [14.55, 41.39], pre: [41.39, 70.64], c1: [70.64, 112.51],
  bridge: [112.51, 152.47], c2: [152.47, 204.03], bridge2: [204.03, 214.0], outro: [214.0, 232.83],
};
const T = { ...SONG, colourOn: 78.4, dawnOn: 214.0, umbOpen: 76.2 };

const LYR = [
  [14.55, '窗外下着雨 房间里依然很冷清'], [21.22, '等着你出现 从来没改变'],
  [28.47, '昨晚想到你 被寂寞包裹的恐惧'], [35.42, '等待黎明 等待深爱的你'],
  [41.39, '能不能留下来再陪我数次星星'], [48.42, '能不能别提起念念不忘的他'],
  [55.60, '能不能告诉我你这次离开的各种原因'], [63.65, '只能和孤独亲密 像小孩想要星星'],
  [70.64, '忘不了你我互相的甜蜜'], [77.35, '是你给我的最后的记忆'],
  [84.15, '松开的手再抓不紧'], [88.81, '等雨后等天晴'],
  [92.59, '一起走的路都泥泞'], [95.62, '沉睡向往的梦境'],
  [98.88, '说来又说去还放不下你'], [105.57, '最后再求你求你别离去'],
  [112.51, '即便现实都已看清'], [117.45, '镜子两面我破碎又织起'],
  [121.16, '倔强的我最后过回了沉溺'], [128.61, '渐渐两路模糊我视线'],
  [132.26, '有一瞬间就将我冻结'], [135.66, '重新连接的爱却又只能够妥协'],
  [142.59, '于是我们又错过了时间'], [146.23, '乌云密布了整个蓝天'],
  [152.47, '忘不了你我互相的甜蜜'], [159.33, '是你给我的最后的记忆'],
  [166.27, '松开的手再抓不紧'], [170.75, '等雨后等天晴'],
  [174.64, '一起走的路都泥泞'], [177.90, '沉睡向往的梦境'],
  [181.22, '说来又说去还放不下你'], [188.06, '最后再求你求你别离去'],
  [195.07, '即便现实都已看清'], [200.14, '镜子两面我破碎又织起'],
  [204.03, '最后我会承认无法改变结局'],
];
const cueAt = (t) => {
  for (let i = 0; i < LYR.length; i++) {
    const [t0, txt] = LYR[i];
    const t1 = i + 1 < LYR.length ? LYR[i + 1][0] - 0.12 : t0 + 5.2;
    if (t >= t0 - 0.05 && t < t1) return { t0, t1, txt };
    if (t < t0) break;
  }
  return null;
};

let E, P = {}, dyn, subEl;
const mixPose = (a, b, k) => { const o = {}; for (const q of new Set([...Object.keys(a), ...Object.keys(b)])) { o[q] = lerp(a[q] ?? 0, b[q] ?? 0, k); } return o; };

export async function setup(canvas) {
  E = new Impasto(canvas); dyn = new Strokes(32768);
  const up = (built) => ({ b: E.batch(built.strokes.data()), tex: E.texture(built.ref.ctx.canvas), w: built.w, h: built.h });
  P.night = up(buildWindow('night'));
  P.dawn = up(buildWindow('dawn'));
  P.room = up(buildRoom());
  P.sq = up(buildSquare('colour'));
  P.mir = up(buildMirror());
  P.ceil = up(buildCeiling());
  P.door = up(buildDoorway());
  P.top = up(buildTopGround());
  P.umb = up(buildUmbrellaTop());
  P.pud = up(buildPuddle());
  subEl = document.getElementById('sub');
  window.DUR = DUR;
  return frame;
}

function plate(pl, o) {
  const M = o.M || [1, 0, 0, 1, 0, 0];
  if (!o.noUnder && (o.alpha ?? 1) > 0) E.under(pl.tex, pl.w, pl.h, { ...o, M });
  E.draw(pl.b, o);
}
const flush = (o) => { if (dyn.n) E.drawNow(dyn.data(), o); dyn.clear(); };

const POST = {
  night: { expo: 1.07, sat: 1.02, contrast: 1.05, vig: .3, spec: .32, shin: 26, lift: [.015, .013, .018] },
  plain: { expo: 1.03, sat: 1.04, contrast: 1.04, vig: .26, spec: .3, shin: 26 },
  dark: { expo: 1.1, sat: 1.0, contrast: 1.08, vig: .38, spec: .34, shin: 24, lift: [.01, .009, .012] },
  dawn: { expo: 1.06, sat: 1.07, contrast: 1.02, vig: .22, spec: .26, shin: 30, lift: [.025, .018, .012] },
};
const G_MUTE = .42, G_SQ = .72, G_MIR = .5;

// ---- the two performers -------------------------------------------------------
function she(t, o = {}) {
  const x = o.x ?? SQ.UMB[0], footY = o.footY ?? SQ.UMB[1], h = o.h ?? 250;
  const base = o.walk ? walkPose(t * (o.walkSpeed ?? 3.4) + (o.phase ?? 0), .9, .7) : {
    ...STAND, cup: false, lean: .02 + Math.sin(t * .9) * .012, thighL: .06, thighR: -.04,
    armL1: .12, armL2: .18, armR1: .3, armR2: -2.05, headTilt: -.04,
  };
  figure(dyn, { x, footY, h, pose: base, coat: [.72, .22, .17], skin: [.78, .6, .46], hair: [.16, .13, .16], seed: 21, face: false });
  const cy = footY - h * .96 - 14 + Math.sin(t * 1.4) * 2;
  umbrella(dyn, [x, cy], h * .63, h * .25, [.76, .22, .16], 31,
    { open: o.open ?? 1, tilt: .04 + Math.sin(t * .8) * .03, shaftLen: h * .6 });
}
function he(t, x, footY, pose, o = {}) {
  figure(dyn, { x, footY, h: o.h ?? 254, pose, coat: o.coat ?? [.3, .36, .46], skin: [.73, .55, .41], hair: [.17, .15, .18], seed: o.seed ?? 3, face: false });
}

// ================= SHOTS =================

// 1 · 0–6.5  the window paints itself in; the first rain runs down the glass
function s01(t) {
  const u = seg(t, 0, 6.5);
  const cam = { x: lerp(980, 958, ss(u)), y: lerp(496, 466, ss(u)), zoom: lerp(1.18, 1.05, eio(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER, appear: -0.35, appDur: 3.4 });
  rain(dyn, t, { n: 44, x0: WIN.glass[0] + 20, x1: WIN.glass[2] - 20, y0: WIN.glass[1] - 40, y1: WIN.glass[3], speed: 700, alpha: .22, wind: -.05 });
  drips(dyn, t, { n: 10, x0: 360, x1: 1560, y0: 190, y1: 760, alpha: .16 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .35 });
  return POST.night;
}

// 2 · 6.5–14.55  the street lamp behind the glass; heavier rain; the glow breathes
function s02(t) {
  const u = seg(t, 6.5, 14.55);
  const cam = { x: lerp(1120, 1180, ss(u)), y: lerp(420, 440, ss(u)), zoom: lerp(1.65, 1.95, ss(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER });
  rain(dyn, t, { n: 90, x0: 700, x1: 1900, y0: 60, y1: 1080, speed: 820, alpha: .3, wind: -.08 });
  drips(dyn, t, { n: 7, x0: 760, x1: 1780, y0: 120, y1: 900, alpha: .22 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .35 });
  return POST.night;
}

// 3 · 14.55–21.22  the room; he stands at the glass, a cup in his hand
function s03(t) {
  const u = seg(t, 14.55, 21.22);
  const cam = { x: lerp(860, 900, ss(u)), y: lerp(596, 580, ss(u)), zoom: lerp(1.03, 1.08, ss(u)) };
  plate(P.room, { t, cam, grey: G_MUTE, reveal: NEVER });
  const sip = ss(clamp((t - 16.4) / .8)) * (1 - ss(clamp((t - 18.6) / .8)));
  const pose = mixPose({ ...STAND, armL1: .1, armL2: .16 }, { armR1: .28, armR2: -1.75, headTilt: -.12 }, sip);
  pose.bob = Math.sin(t * 1.3) * .8;
  he(t, 620, 950, pose, { h: 430, coat: [.42, .47, .56] });
  motes(dyn, t, { n: 18, x0: 220, x1: 1080, y0: 600, y1: 1040 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 4 · 21.22–28.47  he walks from the window to the bed
function s04(t) {
  const u = seg(t, 21.22, 28.47);
  const cam = { x: lerp(900, 1040, eio(u)), y: lerp(586, 566, ss(u)), zoom: lerp(1.06, 1.12, ss(u)) };
  plate(P.room, { t, cam, grey: G_MUTE, reveal: NEVER });
  const x = lerp(700, 1240, eio(ss(u)));
  const pose = walkPose((t - 21.22) * 3.3, 1, .85);
  pose.lean = .05 + Math.sin((t - 21.22) * 6.6) * .012;
  he(t, x, 950, pose, { h: 430, coat: [.42, .47, .56] });
  motes(dyn, t, { n: 14, x0: 220, x1: 1120, y0: 600, y1: 1040 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 5 · 28.47–35.42  he sits on the edge of the bed; the cup comes up once
function s05(t) {
  const u = seg(t, 28.47, 35.42);
  const cam = { x: lerp(1180, 1240, ss(u)), y: lerp(600, 590, ss(u)), zoom: lerp(1.34, 1.44, ss(u)) };
  plate(P.room, { t, cam, grey: G_MUTE, reveal: NEVER });
  const sit = { ...SIT, hipDrop: 226, thighL: .62, thighR: .58, kneeL: -1.5, kneeR: -1.48, armL1: .5, armL2: .82 };
  const settle = ss(clamp((t - 28.47) / 1.6));
  let pose = mixPose(walkPose(Math.PI * 7 * 3.3, 1, .85), sit, settle);
  const sip = ss(clamp((t - 32.4) / .9)) * (1 - ss(clamp((t - 35.0) / .9)));
  pose = mixPose(pose, { ...sit, armR1: .22, armR2: -1.6, headTilt: -.1 }, sip);
  pose.lean += Math.sin(t * 1.1) * .008;
  pose.bob = Math.sin(t * 1.15) * .7;
  he(t, 1300, 950, pose, { h: 430, coat: [.42, .47, .56] });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 6 · 35.42–41.39  back at the glass, closer: the rain gets heavier ("等待黎明")
function s06(t) {
  const u = seg(t, 35.42, 41.39);
  const cam = { x: lerp(940, 1000, ss(u)), y: lerp(450, 420, ss(u)), zoom: lerp(1.42, 1.58, ss(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER });
  rain(dyn, t, { n: 110, x0: 300, x1: 1750, y0: 60, y1: 1000, speed: 900, alpha: .3, wind: -.09 });
  drips(dyn, t, { n: 12, x0: 420, x1: 1620, y0: 160, y1: 820, alpha: .24 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .3 });
  return POST.night;
}

// 7 · 41.39–48.42  the glass: drops begin to stop where they are
function s07(t) {
  const u = seg(t, 41.39, 48.42);
  const cam = { x: lerp(900, 940, ss(u)), y: lerp(430, 400, eio(u)), zoom: lerp(1.36, 1.44, ss(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER });
  rain(dyn, t, { n: 70, x0: 380, x1: 1700, y0: 120, y1: 900, speed: 640, alpha: .22, wind: -.06 });
  drips(dyn, t, { n: 9, x0: 420, x1: 1620, y0: 170, y1: 800, alpha: .18 });
  stars(dyn, t, 42.6, { x0: 520, x1: 1500, y0: 180, y1: 460 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .3 });
  return POST.night;
}

// 8 · 48.42–55.6  close: the most stars; one drop hangs still
function s08(t) {
  const u = seg(t, 48.42, 55.6);
  const cam = { x: lerp(980, 1010, ss(u)), y: lerp(392, 372, ss(u)), zoom: lerp(1.5, 1.62, ss(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER });
  rain(dyn, t, { n: 44, x0: 420, x1: 1660, y0: 140, y1: 860, speed: 520, alpha: .16, wind: -.05 });
  stars(dyn, t, 42.6, { x0: 540, x1: 1520, y0: 190, y1: 470 });
  const yh = 560 - Math.sin(clamp((t - 48.42) / 3) * Math.PI) * 6;
  dyn.push({ x: 966, y: yh, ang: 0, len: 22, wid: 26, c: [.9, .94, .96], c2: [.76, .82, .86], seed: 555, type: 2, alpha: .85, hgt: 1.1, rev: 0 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .3 });
  return POST.night;
}

// 9 · 55.6–63.65  the ceiling: he has lain back; only the lamp is awake
function s09(t) {
  const u = seg(t, 55.6, 63.65);
  const cam = { x: lerp(1070, 1160, ss(u)), y: lerp(520, 500, ss(u)), zoom: lerp(1.02, 1.16, eio(u)) };
  plate(P.ceil, { t, cam, grey: G_MUTE, reveal: NEVER });
  motes(dyn, t, { n: 26, x0: 620, x1: 1500, y0: 200, y1: 900 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .45 });
  return POST.dark;
}

// 10 · 63.65–70.64  the doorway: he stands in the light, then steps back into the dark
function s10(t) {
  const u = seg(t, 63.65, 70.64);
  const cam = { x: lerp(960, 940, ss(u)), y: lerp(560, 546, ss(u)), zoom: lerp(1.02, 1.1, ss(u)) };
  plate(P.door, { t, cam, grey: G_MUTE, reveal: NEVER });
  const back = ss(clamp((t - 67.2) / 2.6));
  const x = lerp(966, 1150, back), footY = lerp(946, 1030, back);
  he(t, x, footY, { ...STAND, armL1: .1, armL2: .16, lean: -.02, bob: Math.sin(t * 1.2) * .6 },
    { h: lerp(560, 690, back), coat: [.22, .25, .32] });
  motes(dyn, t, { n: 22, x0: 720, x1: 1220, y0: 180, y1: 940 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .45 });
  return POST.dark;
}

// ---- the crowd in the square ---------------------------------------------------
const CROWD = [
  { x0: 240, x1: 1180, y: 980, h: 232, t0: 66, t1: 98, coat: [.35, .3, .4], umb: [.24, .22, .3], seed: 2 },
  { x0: 1860, x1: 1240, y: 880, h: 196, t0: 68, t1: 108, coat: [.42, .32, .3], umb: [.3, .26, .32], seed: 5 },
  { x0: 160, x1: 860, y: 1090, h: 268, t0: 72, t1: 116, coat: [.3, .33, .42], umb: [.26, .28, .36], seed: 8 },
  { x0: 1980, x1: 1420, y: 760, h: 158, t0: 64, t1: 106, coat: [.38, .3, .34], umb: [.28, .24, .3], seed: 11 },
  { x0: 520, x1: 1520, y: 1160, h: 292, t0: 78, t1: 144, coat: [.3, .3, .38], umb: [.22, .24, .3], seed: 14 },
];

// 11 · 70.64–78.4  the square in the rain, all grey; her umbrella still shut
function s11(t) {
  const u = seg(t, 70.64, 78.4);
  const cam = { x: lerp(1116, 1100, ss(u)), y: lerp(622, 606, ss(u)), zoom: lerp(1.0, 1.06, eio(u)) };
  plate(P.sq, { t, cam, grey: G_SQ, reveal: NEVER, wet: .45 });
  crowd(dyn, t, CROWD);
  she(t, { open: .2 });
  ripples(dyn, t, { n: 16, x0: 120, x1: 2000, y0: 640, y1: 1160, alpha: .32 });
  rain(dyn, t, { n: 88, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 920, alpha: .26, wind: -.04, splash: true });
  flush({ t, cam, grey: G_SQ, reveal: NEVER, hgt: .35 });
  return POST.night;
}

// 12 · 78.4–85  the knife re-lays the whole square in colour, from her feet out
function s12(t) {
  const u = seg(t, 78.4, 85);
  const cam = { x: lerp(1110, 1090, ss(u)), y: lerp(610, 600, ss(u)), zoom: lerp(1.02, 1.1, ss(u)) };
  const rev = t - T.colourOn;
  plate(P.sq, { t, cam, grey: G_SQ, reveal: rev, revDur: .6, wet: .45 });
  crowd(dyn, t, CROWD);
  she(t, { open: .2 + .8 * ss(clamp((t - T.umbOpen) / 1.1)) });
  ripples(dyn, t, { n: 14, x0: 120, x1: 2000, y0: 640, y1: 1160, alpha: .28 });
  rain(dyn, t, { n: 70, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 900, alpha: .2, wind: -.04, splash: true });
  flush({ t, cam, grey: G_SQ, reveal: rev, revDur: .6, hgt: .35 });
  return POST.plain;
}

// 13 · 85–92  medium on her: the red under a rain that is starting to thin
function s13(t) {
  const u = seg(t, 85, 92);
  const cam = { x: lerp(1250, 1310, ss(u)), y: lerp(660, 640, ss(u)), zoom: lerp(1.5, 1.62, ss(u)) };
  plate(P.sq, { t, cam, grey: 0, reveal: NEVER, wet: .42 });
  she(t, { open: 1 });
  shimmer(dyn, t, { n: 40, x0: 900, x1: 1750, y0: 800, y1: 1180, alpha: .26, col: [1, .9, .84] });
  rain(dyn, t, { n: 40, x0: 900, x1: 1800, y0: 200, y1: 1180, speed: 760, alpha: .16, wind: -.04 });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 14 · 92–98.88  overhead: the crowd's umbrellas from above, over wet stone
function s14(t) {
  const u = seg(t, 92, 98.88);
  const cam = { x: lerp(1050, 1000, ss(u)), y: lerp(600, 580, ss(u)), zoom: lerp(1.0, 1.14, eio(u)) };
  plate(P.top, { t, cam, grey: .18, reveal: NEVER });
  const list = [
    { x0: -160, x1: 2280, y: 320, r: 96, col: [.24, .24, .32], t0: 92, t1: 100, seed: 2 },
    { x0: 2280, x1: -160, y: 620, r: 112, col: [.3, .26, .3], t0: 93, t1: 101, seed: 5 },
    { x0: -120, x1: 2260, y: 900, r: 128, col: [.22, .26, .3], t0: 94, t1: 103, seed: 8 },
    { x0: 2240, x1: -120, y: 1080, r: 148, col: [.28, .24, .28], t0: 95, t1: 104, seed: 11 },
  ];
  for (const w of list) {
    const k = clamp((t - w.t0) / (w.t1 - w.t0)); if (k <= 0 || k >= 1) continue;
    const x = lerp(w.x0, w.x1, k);
    umbrellaTop(dyn, t, { x, y: w.y + Math.sin(t * 2.2 + w.seed) * 4, r: w.r, col: w.col, seed: w.seed * 3, spin: t * .1 });
    dyn.push({ x: x + 6, y: w.y + w.r * .9, ang: 0, len: w.r * 1.1, wid: w.r * .8, c: [.3, .3, .38], c2: [.24, .24, .3], seed: w.seed * 5, type: 2, alpha: .9, hgt: 1, rev: 0 });
  }
  umbrellaTop(dyn, t, { x: 1240, y: 700, r: 132, col: [.76, .22, .16], seed: 21, spin: -t * .06 });
  shimmer(dyn, t, { n: 70, x0: 0, x1: 2112, y0: 0, y1: 1188, alpha: .16, col: [.92, .94, .94] });
  rain(dyn, t, { n: 60, x0: 0, x1: 2112, y0: 0, y1: 1188, speed: 1000, alpha: .18, wind: -.03, splash: true });
  flush({ t, cam, grey: .18, reveal: NEVER, hgt: .35 });
  return POST.plain;
}

// 15 · 98.88–105.57  wide, colour, pulling back: she is one of many
function s15(t) {
  const u = seg(t, 98.88, 105.57);
  const cam = { x: lerp(1150, 1100, ss(u)), y: lerp(630, 606, ss(u)), zoom: lerp(1.14, 1.02, eio(u)) };
  plate(P.sq, { t, cam, grey: 0, reveal: NEVER, wet: .4 });
  crowd(dyn, t, CROWD);
  she(t, { open: 1 });
  ripples(dyn, t, { n: 12, x0: 120, x1: 2000, y0: 660, y1: 1160, alpha: .24 });
  rain(dyn, t, { n: 44, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 860, alpha: .16, wind: -.03, splash: true });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 16 · 105.57–112.51  a puddle: her red in the water, broken by the rain
function s16(t) {
  const u = seg(t, 105.57, 112.51);
  const cam = { x: lerp(900, 990, ss(u)), y: lerp(660, 640, ss(u)), zoom: lerp(1.1, 1.22, ss(u)) };
  plate(P.pud, { t, cam, grey: .12, reveal: NEVER });
  ripples(dyn, t, { n: 22, x0: 260, x1: 1680, y0: 420, y1: 1000, alpha: .5 });
  shimmer(dyn, t, { n: 46, x0: 200, x1: 1720, y0: 420, y1: 1000, alpha: .22, col: [1, .92, .86] });
  rain(dyn, t, { n: 40, x0: 160, x1: 1780, y0: 120, y1: 1040, speed: 780, alpha: .16, wind: -.05, splash: true });
  flush({ t, cam, grey: .12, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 17 · 112.51–118  the two mirrors; the crack starts at the top
function s17(t) {
  const u = seg(t, 112.51, 118);
  const cam = { x: lerp(936, 948, ss(u)), y: lerp(548, 540, ss(u)), zoom: lerp(.99, 1.05, ss(u)) };
  plate(P.mir, { t, cam, grey: G_MIR, reveal: NEVER });
  crack(dyn, t, { t0: T.bridge[0] + .3, dur: 7.0, x0: 636, y0: 168, y1: 926, wob: 30 });
  flush({ t, cam, grey: G_MIR, reveal: NEVER, hgt: .6 });
  return POST.plain;
}

// 18 · 118–124  close on the face: the crack runs through it
function s18(t) {
  const u = seg(t, 118, 124);
  const cam = { x: lerp(620, 660, ss(u)), y: lerp(470, 452, ss(u)), zoom: lerp(2.0, 2.2, ss(u)) };
  plate(P.mir, { t, cam, grey: G_MIR * .92, reveal: NEVER });
  crack(dyn, t, { t0: T.bridge[0] + .3, dur: 7.0, x0: 636, y0: 168, y1: 926, wob: 30 });
  for (let i = 0; i < 5; i++) {
    const h = hash(i * 7.1 + 3);
    dyn.push({ x: 620 + h * 90 + Math.sin(t * 1.1 + i) * 3, y: 380 + i * 96, ang: .8 + h, len: 24, wid: 10,
      c: [.94, .96, .97], c2: [.76, .82, .86], seed: 970 + i, type: 0, alpha: .42, hgt: 1.4, rev: 0 });
  }
  flush({ t, cam, grey: G_MIR * .92, reveal: NEVER, hgt: .6 });
  return POST.plain;
}

// 19 · 124–132.26  the ceiling again, longer: nothing happens, which is the point
function s19(t) {
  const u = seg(t, 124, 132.26);
  const cam = { x: lerp(1160, 1090, ss(u)), y: lerp(500, 520, ss(u)), zoom: lerp(1.22, 1.08, ss(u)) };
  plate(P.ceil, { t, cam, grey: G_MUTE * 1.1, reveal: NEVER });
  motes(dyn, t, { n: 20, x0: 700, x1: 1400, y0: 260, y1: 860 });
  flush({ t, cam, grey: G_MUTE * 1.1, reveal: NEVER, hgt: .45 });
  return POST.dark;
}

// 20 · 132.26–142.59  the doorway: he comes back to the light, then stops
function s20(t) {
  const u = seg(t, 132.26, 142.59);
  const cam = { x: lerp(930, 960, ss(u)), y: lerp(548, 560, ss(u)), zoom: lerp(1.12, 1.0, ss(u)) };
  plate(P.door, { t, cam, grey: G_MUTE, reveal: NEVER });
  const fwd = ss(clamp((t - 133.0) / 3.2));
  const x = lerp(1150, 960, fwd), footY = lerp(1030, 950, fwd);
  const step = t < 136.2 ? walkPose((t - 133) * 3.1, .8, .6) : { ...STAND, armL1: .1, armL2: .16, bob: Math.sin(t * 1.1) * .5 };
  he(t, x, footY, step, { h: lerp(690, 570, fwd), coat: [.24, .28, .35] });
  motes(dyn, t, { n: 26, x0: 720, x1: 1230, y0: 160, y1: 950 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .45 });
  return POST.dark;
}

// 21 · 142.59–152.47  the square: she walks away, and the picture stays
function s21(t) {
  const u = seg(t, 142.59, 152.47);
  const cam = { x: lerp(1180, 1120, ss(u)), y: lerp(640, 616, ss(u)), zoom: lerp(1.18, 1.04, eio(u)) };
  plate(P.sq, { t, cam, grey: 0, reveal: NEVER, wet: .38 });
  crowd(dyn, t, CROWD.map(w => ({ ...w, t0: w.t0 + 76, t1: w.t1 + 84 })));
  const away = ss(clamp((t - 142.59) / 8));
  she(t, { x: lerp(1330, 880, away), footY: lerp(880, 830, away), h: lerp(250, 196, away), open: 1, walk: away > .04, walkSpeed: 3.0 });
  ripples(dyn, t, { n: 10, x0: 120, x1: 2000, y0: 660, y1: 1160, alpha: .2 });
  rain(dyn, t, { n: 30, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 820, alpha: .12, wind: -.03, splash: true });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 22 · 152.47–160  wide and calm; the crowd has thinned to three umbrellas
function s22(t) {
  const u = seg(t, 152.47, 160);
  const cam = { x: lerp(1080, 1040, ss(u)), y: lerp(610, 596, ss(u)), zoom: lerp(1.0, .96, ss(u)) };
  plate(P.sq, { t, cam, grey: 0, reveal: NEVER, wet: .36 });
  crowd(dyn, t, CROWD.slice(1, 4).map(w => ({ ...w, t0: w.t0 + 88, t1: w.t1 + 96 })));
  she(t, { x: 780, footY: 826, h: 188, open: 1 });
  shimmer(dyn, t, { n: 34, x0: 200, x1: 1900, y0: 700, y1: 1160, alpha: .2, col: [1, .9, .82] });
  rain(dyn, t, { n: 24, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 780, alpha: .1, wind: -.03 });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 23 · 160–170.75  straight down on the red canopy: the rain lands on her
function s23(t) {
  const u = seg(t, 160, 170.75);
  const cam = { x: UMBTOP.w / 2 + Math.sin(t * .3) * 18, y: UMBTOP.h / 2, zoom: lerp(1.12, 1.0, ss(u)) };
  plate(P.umb, { t, cam, grey: 0, reveal: NEVER });
  canopyDrops(dyn, t, { cx: 960, cy: 620, rx: 620, ry: 560, n: 30 });
  rain(dyn, t, { n: 40, x0: 200, x1: 1720, y0: 0, y1: 1080, speed: 900, alpha: .14, wind: -.03 });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .35 });
  return POST.plain;
}

// 24 · 170.75–181.22  the mirrors, quiet: the crack is still there
function s24(t) {
  const u = seg(t, 170.75, 181.22);
  const cam = { x: lerp(950, 962, ss(u)), y: lerp(542, 528, ss(u)), zoom: lerp(1.16, 1.06, ss(u)) + Math.sin(t * .7) * .003 };
  plate(P.mir, { t, cam, grey: G_MIR * .8, reveal: NEVER });
  crack(dyn, t, { t0: -100, dur: 1, x0: 636, y0: 168, y1: 926, wob: 30 });
  const bx = 300 + ((t - 170.75) * 30) % 1000;
  dyn.push({ x: bx, y: 520, ang: Math.PI / 2 - .12, len: 700, wid: 22, c: [.9, .93, .95], c2: [.74, .8, .84], seed: 63, type: 3, alpha: .08, hgt: .3, rev: 0 });
  flush({ t, cam, grey: G_MIR * .8, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 25 · 181.22–195.07  the square with almost nobody in it; the rain is nearly done
function s25(t) {
  const u = seg(t, 181.22, 195.07);
  const cam = { x: lerp(1040, 1000, ss(u)), y: lerp(600, 590, ss(u)), zoom: lerp(.97, 1.04, ss(u)) };
  plate(P.sq, { t, cam, grey: .12, reveal: NEVER, wet: .3 });
  const last = CROWD[3];
  crowd(dyn, t, [{ ...last, t0: last.t0 + 116, t1: last.t1 + 124 }]);
  she(t, { x: 760, footY: 824, h: 184, open: 1 });
  shimmer(dyn, t, { n: 26, x0: 200, x1: 1900, y0: 700, y1: 1160, alpha: .16, col: [1, .92, .86] });
  rain(dyn, t, { n: 16, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 720, alpha: .08, wind: -.02 });
  flush({ t, cam, grey: .12, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 26 · 195.07–204.03  back to the puddle: the reflection is whole, and wrong
function s26(t) {
  const u = seg(t, 195.07, 204.03);
  const cam = { x: lerp(960, 900, ss(u)), y: lerp(640, 664, ss(u)), zoom: lerp(1.24, 1.1, ss(u)) };
  plate(P.pud, { t, cam, grey: .06, reveal: NEVER });
  ripples(dyn, t, { n: 10, x0: 300, x1: 1600, y0: 460, y1: 980, alpha: .3 });
  shimmer(dyn, t, { n: 30, x0: 220, x1: 1700, y0: 440, y1: 980, alpha: .18, col: [1, .94, .9] });
  rain(dyn, t, { n: 14, x0: 200, x1: 1720, y0: 140, y1: 1020, speed: 700, alpha: .1, wind: -.03, splash: true });
  flush({ t, cam, grey: .06, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 27 · 204.03–214  the last line lands on the mirror
function s27(t) {
  const u = seg(t, 204.03, 214);
  const cam = { x: lerp(948, 960, ss(u)), y: lerp(544, 534, ss(u)), zoom: lerp(1.02, 1.14, ss(u)) };
  plate(P.mir, { t, cam, grey: G_MIR * .72, reveal: NEVER });
  crack(dyn, t, { t0: -100, dur: 1, x0: 636, y0: 168, y1: 926, wob: 30 });
  flush({ t, cam, grey: G_MIR * .72, reveal: NEVER, hgt: .5 });
  return POST.dark;
}

// 28 · 214–232.83  the window again: the rain stops, the light comes in
function s28(t) {
  const u = seg(t, 214, DUR);
  const cam = { x: 962, y: lerp(470, 506, ss(u)), zoom: lerp(1.16, 1.0, eio(u)) };
  const app = seg(t, T.dawnOn, T.dawnOn + 4.6);
  if (app < 1) plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER, alpha: 1 - app });
  plate(P.dawn, { t: t - T.dawnOn, cam, grey: 0, reveal: NEVER, appear: 0, appDur: 4.6, alpha: app, noUnder: app < 1 });
  const stop = ss(clamp((t - (T.dawnOn + 7)) / 3));
  if (stop < 1) drips(dyn, t, { n: 5, x0: 420, x1: 1520, y0: 200, y1: 740, alpha: .13 * (1 - stop) });
  rain(dyn, t, { n: Math.round(lerp(14, 0, stop)), x0: 340, x1: 1600, y0: 140, y1: 800, speed: 360, alpha: .07 * (1 - stop), wind: -.04 });
  clouds(dyn, t, { n: 6, y0: 170, y1: 330, speed: 9, col: [.86, .82, .74], lit: [.96, .92, .84] });
  if (t > T.dawnOn + 2) {
    for (let i = 0; i < 7; i++) {
      const ph = ((t * .45 + i * .17) % 1);
      dyn.push({ x: 1222 + Math.sin(ph * 6 + i) * 10, y: 756 - ph * (90 + i * 6), ang: Math.PI / 2 + Math.sin(ph * 5 + i) * .3,
        len: 26 + ph * 26, wid: 9 + i, c: [.96, .95, .9], c2: [.9, .88, .82], seed: 800 + i, type: 3, alpha: .16 * (1 - ph), hgt: .25, rev: 0 });
    }
  }
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.dawn;
}

const SHOTS = [
  { a: 0, b: 6.5, f: s01 }, { a: 6.5, b: 14.55, f: s02 },
  { a: 14.55, b: 21.22, f: s03 }, { a: 21.22, b: 28.47, f: s04 }, { a: 28.47, b: 35.42, f: s05 },
  { a: 35.42, b: 41.39, f: s06 }, { a: 41.39, b: 48.42, f: s07 }, { a: 48.42, b: 55.6, f: s08 },
  { a: 55.6, b: 63.65, f: s09 }, { a: 63.65, b: 70.64, f: s10 },
  { a: 70.64, b: 78.4, f: s11 }, { a: 78.4, b: 85, f: s12 }, { a: 85, b: 92, f: s13 },
  { a: 92, b: 98.88, f: s14 }, { a: 98.88, b: 105.57, f: s15 }, { a: 105.57, b: 112.51, f: s16 },
  { a: 112.51, b: 118, f: s17 }, { a: 118, b: 124, f: s18 }, { a: 124, b: 132.26, f: s19 },
  { a: 132.26, b: 142.59, f: s20 }, { a: 142.59, b: 152.47, f: s21 }, { a: 152.47, b: 160, f: s22 },
  { a: 160, b: 170.75, f: s23 }, { a: 170.75, b: 181.22, f: s24 }, { a: 181.22, b: 195.07, f: s25 },
  { a: 195.07, b: 204.03, f: s26 }, { a: 204.03, b: 214.0, f: s27 }, { a: 214.0, b: DUR + 1, f: s28 },
];

// ---- subtitles: burned in as DOM text over the canvas, reported for readcheck
function subs(t) {
  const c = cueAt(t);
  if (!subEl) return;
  if (!c) { subEl.style.opacity = '0'; return; }
  subEl.textContent = c.txt;
  const fadeIn = clamp((t - c.t0) / .28), fadeOut = clamp((c.t1 - t) / .32);
  subEl.style.opacity = String(Math.min(1, fadeIn, fadeOut) * .96);
}
const TEXTS = (t) => {
  const c = cueAt(t);
  if (!c) return [];
  return [{ id: 'lyric-' + c.t0, text: c.txt, x0: 300, y0: 900, x1: 1620, y1: 1000 }];
};
if (typeof window !== 'undefined') window.TEXTS = TEXTS;

function frame(t) {
  const s = SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  E.begin([.16, .15, .14]);
  const post = s.f(t) || POST.plain;
  // knife wipe over the last 0.34 s of every shot: a transition made of paint
  const out = s.b - t;
  if (out < .34 && s.b < DUR + .5) wipe(dyn, .34 - out, 0, .34, { col: [.3, .27, .25] });
  flush({ t, grey: 0, reveal: NEVER, hgt: .5 });
  E.finish(post);
  subs(t);
}

export { frame, T };
