// 《于是》— director's timeline. Everything that moves is repainted every frame.
// 8 shots, 5 painted plates, one colour arc, burned-in lyrics, knife-wipe transitions.
import { Impasto, Strokes, hex, mixc } from './engine/impasto.js';
import { buildWindow, buildRoom, buildSquare, buildMirror, SQ, WIN } from './scenes/plates.js';
import { figure, umbrella, walkPose, SIT, STAND } from './scenes/figure.js';
import { rain, drips, stars, ripples, crowd, crack, wipe, flicker } from './scenes/anim.js';
import { lerp, clamp, ss, seg, eio, eo, hash } from './scenes/common.js';

const NEVER = 1e6, W = 1920, H = 1080;
const DUR = 232.83;

export const SONG = {
  intro: [0, 14.55], v1: [14.55, 41.39], pre: [41.39, 70.64], c1: [70.64, 112.51],
  bridge: [112.51, 152.47], c2: [152.47, 204.03], bridge2: [204.03, 214.0], outro: [214.0, 232.83],
};
const T = { ...SONG, colourOn: 78.4, dawnOn: 215.0, umbOpen: 76.2 };

// ---- lyrics: [start, text]; the end is the next line's start
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
const key = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [t0, v0, e] = ks[i], [t1, v1] = ks[i + 1]; if (t < t1) { const k = (e || eio)((t - t0) / (t1 - t0)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); } } return ks[ks.length - 1][1]; };
const mixPose = (a, b, k) => { const o = {}; for (const q of new Set([...Object.keys(a), ...Object.keys(b)])) { const va = a[q] ?? 0, vb = b[q] ?? 0; o[q] = lerp(va, vb, k); } return o; };

export async function setup(canvas) {
  E = new Impasto(canvas); dyn = new Strokes(32768);
  const up = (built) => ({ b: E.batch(built.strokes.data()), tex: E.texture(built.ref.ctx.canvas), w: built.w, h: built.h });
  P.night = up(buildWindow('night'));
  P.dawn = up(buildWindow('dawn'));
  P.room = up(buildRoom());
  P.sq = up(buildSquare('colour'));
  P.mir = up(buildMirror());
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
  dawn: { expo: 1.06, sat: 1.07, contrast: 1.02, vig: .22, spec: .26, shin: 30, lift: [.025, .018, .012] },
};
const G_MUTE = .42, G_SQ = .72, G_MIR = .5;

// ================= SHOTS =================

// 1 · the window: the whole painting is laid down, then the rain starts running
function shotWindow(t) {
  const u = seg(t, T.intro[0], T.intro[1]);
  const cam = { x: lerp(975, 952, ss(u)), y: lerp(500, 468, ss(u)), zoom: lerp(1.16, 1.02, eio(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER, appear: -0.35, appDur: 3.2 });
  rain(dyn, t, { n: 40, x0: WIN.glass[0] + 20, x1: WIN.glass[2] - 20, y0: WIN.glass[1] - 40, y1: WIN.glass[3], speed: 700, alpha: .22, wind: -.05 });
  drips(dyn, t, { n: 11, x0: 360, x1: 1560, y0: 190, y1: 760, alpha: .16 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .35 });
  return POST.night;
}

// 2 · the room: he stands at the window, walks to the bed, sits down, drinks
function shotRoom(t) {
  const u = seg(t, T.v1[0], T.v1[1]);
  const cam = { x: lerp(880, 1050, eio(u)), y: lerp(600, 566, ss(u)), zoom: lerp(1.04, 1.15, ss(u)) };
  plate(P.room, { t, cam, grey: G_MUTE, reveal: NEVER });

  // --- the walk: the window (x 700) → the bed's edge (x 1240), 19.6 s → 26.4 s
  const wt0 = 19.6, wt1 = 26.4;
  const wk = clamp((t - wt0) / (wt1 - wt0));
  const x = lerp(700, 1240, eio(wk));
  const standing = { ...STAND, armL1: .1, armL2: .16 };
  let pose, footY = 938;

  if (t < wt0) {
    // waiting at the glass: weight shifts, the cup comes up once
    const sip = ss(clamp((t - 16.6) / .8)) * (1 - ss(clamp((t - 18.4) / .8)));
    pose = mixPose(standing, { armR1: -.9, armR2: -1.5, headTilt: -.12, lean: .02 }, sip);
    pose.bob = Math.sin(t * 1.3) * .8;
  } else if (t < wt1) {
    const ph = (t - wt0) * 1.05 * Math.PI;
    pose = walkPose(ph, 1, .85);
    pose.lean = .05 + Math.sin(ph * 2) * .012;
  } else {
    // sits on the edge of the bed (the mattress edge is at y≈600 in plate space)
    const sk = ss(clamp((t - wt1) / 1.5));
    const sit = { ...SIT, hipDrop: 226, thighL: .62, thighR: .58, kneeL: -1.5, kneeR: -1.48, armL1: .5, armL2: .82 };
    pose = mixPose(walkPose(Math.PI * (wt1 - wt0) * 1.05, 1, .85), sit, sk);
    // breathing, and one slow drink at 33 s
    const sip = ss(clamp((t - 32.6) / .9)) * (1 - ss(clamp((t - 35.4) / .9)));
    pose = mixPose(pose, { ...sit, armR1: -.55, armR2: -1.35, headTilt: -.1 }, sip);
    pose.lean += Math.sin(t * 1.1) * .008;
    pose.bob = Math.sin(t * 1.15) * .7;
  }
  figure(dyn, { x, footY, h: 254, pose, coat: [.3, .36, .46], skin: [.73, .55, .41], hair: [.17, .15, .18], seed: 3, face: false });

  // dust in the window's light
  for (let i = 0; i < 26; i++) {
    const h1 = hash(i * 3.3 + 2), h2 = hash(i * 6.1 + 9), h3 = hash(i * 9.7 + 4);
    const dx = lerp(220, 1120, h1) + Math.sin(t * .5 + i) * 18 + (t * 3) % 40;
    const dy = lerp(600, 1040, h2) - ((t * (5 + h3 * 6)) % 120);
    dyn.push({ x: dx, y: dy, ang: .5, len: 3 + h1 * 6, wid: 2 + h2 * 3, c: [.82, .8, .74], c2: [.7, .68, .62], seed: i * 7, type: 2, alpha: .3 * (.6 + .4 * Math.sin(t * 1.3 + i)), hgt: .6, rev: NEVER });
  }
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 3 · the glass: drops running, then the drops stop where they are and become stars
function shotGlass(t) {
  const u = seg(t, T.pre[0], T.pre[1]);
  const cam = { x: lerp(900, 1015, ss(u)), y: lerp(432, 378, eio(u)), zoom: lerp(1.34, 1.48, ss(u)) };
  plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER });
  const starT = T.pre[0] + 3.4;
  // after the stars arrive the rain thins out: the world is holding its breath
  const thin = ss(clamp((t - starT) / 6));
  rain(dyn, t, { n: Math.round(lerp(64, 26, thin)), x0: 380, x1: 1700, y0: 120, y1: 900, speed: lerp(560, 380, thin), alpha: lerp(.2, .12, thin), wind: -.06 });
  drips(dyn, t, { n: 9, x0: 420, x1: 1620, y0: 170, y1: 800, alpha: lerp(.2, .1, thin) });
  stars(dyn, t, starT, { x0: 520, x1: 1500, y0: 180, y1: 460 });
  flush({ t, cam, grey: G_MUTE, reveal: NEVER, hgt: .3 });
  return POST.night;
}

// ---- the crowd in the square (same people, both passes)
const CROWD = [
  { x0: 240, x1: 1180, y: 980, h: 232, t0: 68, t1: 96, coat: [.35, .3, .4], umb: [.24, .22, .3], seed: 2 },
  { x0: 1860, x1: 1240, y: 880, h: 196, t0: 70, t1: 104, coat: [.42, .32, .3], umb: [.3, .26, .32], seed: 5 },
  { x0: 160, x1: 860, y: 1090, h: 268, t0: 74, t1: 112, coat: [.3, .33, .42], umb: [.26, .28, .36], seed: 8 },
  { x0: 1980, x1: 1420, y: 760, h: 158, t0: 66, t1: 104, coat: [.38, .3, .34], umb: [.28, .24, .3], seed: 11 },
  { x0: 520, x1: 1520, y: 1160, h: 292, t0: 80, t1: 140, coat: [.3, .3, .38], umb: [.22, .24, .3], seed: 14 },
];
function herFigure(t, open) {
  // she stands under the red umbrella, weight shifting, a slow sway
  const sway = Math.sin(t * .9) * .012;
  const pose = { ...STAND, cup: false, lean: .02 + sway, thighL: .06, thighR: -.04, armL1: .12, armL2: .18, armR1: -.55, armR2: -1.15, headTilt: -.04 };
  figure(dyn, { x: SQ.UMB[0], footY: SQ.UMB[1], h: 250, pose, coat: [.72, .22, .17], skin: [.78, .6, .46], hair: [.16, .13, .16], seed: 21, face: false });
  const cy = SQ.UMB[1] - 250 * .96 - 14 + Math.sin(t * 1.4) * 2;
  umbrella(dyn, [SQ.UMB[0], cy], 158, 62, [.76, .22, .16], 31, { open, tilt: .04 + Math.sin(t * .8) * .03, shaftLen: 150 });
}

// 4 · the square: umbrellas walk, hers opens, the knife re-lays the world in colour
function shotSquare(t) {
  const u = seg(t, T.c1[0], T.c1[1]);
  const cam = { x: lerp(1120, 1076, ss(u)), y: lerp(622, 598, ss(u)), zoom: lerp(.99, 1.08, eio(u)) };
  const rev = t - T.colourOn;
  const rv = rev < 0 ? NEVER : rev;
  plate(P.sq, { t, cam, grey: G_SQ, reveal: rv, revDur: .6, wet: .45 });

  const open = ss(clamp((t - T.umbOpen) / 1.1));
  crowd(dyn, t, CROWD);
  herFigure(t, .25 + .75 * open);
  ripples(dyn, t, { n: 16, x0: 120, x1: 2000, y0: 640, y1: 1160, alpha: .34 });
  rain(dyn, t, { n: 80, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 920, alpha: rev > 0 && rev < 3 ? .18 : .26, wind: -.04, splash: true });

  flush({ t, cam, grey: G_SQ, reveal: rv, revDur: .6, hgt: .35 });
  return rev > 1.8 ? POST.plain : POST.night;
}

// 5 · the mirrors: the crack runs, the reflection breathes, the light crosses the glass
function shotMirror(t) {
  const u = seg(t, T.bridge[0], T.bridge[1]);
  const cam = { x: lerp(940, 968, ss(u)), y: lerp(546, 526, ss(u)), zoom: lerp(1.0, 1.1, eio(u)) + Math.sin(t * .9) * .004 };
  plate(P.mir, { t, cam, grey: G_MIR, reveal: NEVER });
  crack(dyn, t, { t0: T.bridge[0] + .6, dur: 6.4, x0: 636, y0: 168, y1: 926, wob: 30 });
  const bx = 380 + ((t - T.bridge[0]) * 46) % 900;
  dyn.push({ x: bx, y: 500, ang: Math.PI / 2 - .18, len: 760, wid: 26, c: [.86, .9, .92], c2: [.7, .76, .8], seed: 61, type: 3, alpha: .1, hgt: .3, rev: NEVER });
  // shards settle: they keep drifting a hair, catching the light
  for (let i = 0; i < 4; i++) {
    const h = hash(i * 7.1 + 3);
    dyn.push({ x: 690 + h * 60 + Math.sin(t * .7 + i) * 2, y: 470 + i * 90, ang: .8 + h, len: 22, wid: 9,
      c: [.92, .95, .97], c2: [.74, .8, .84], seed: 970 + i, type: 0, alpha: .4, hgt: 1.4, rev: NEVER });
  }
  flush({ t, cam, grey: G_MIR, reveal: NEVER, hgt: .6 });
  return POST.plain;
}

// 6 · the square in colour: they keep walking, she does not
function shotSquareColour(t) {
  const u = seg(t, T.c2[0], T.c2[1]);
  const cam = { x: lerp(1152, 1058, eio(u)), y: lerp(640, 588, ss(u)), zoom: lerp(1.13, 1.0, eio(u)) };
  plate(P.sq, { t, cam, grey: 0, reveal: NEVER, wet: .4 });
  crowd(dyn, t, CROWD.map(w => ({ ...w, x0: w.x0 + 160, x1: w.x1 + 160, t0: w.t0 + 84, t1: w.t1 + 92 })));
  herFigure(t, 1);
  ripples(dyn, t, { n: 12, x0: 120, x1: 2000, y0: 660, y1: 1160, alpha: .26 });
  rain(dyn, t, { n: 34, x0: 40, x1: 2060, y0: 40, y1: 1140, speed: 840, alpha: .12, wind: -.03, splash: true });
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.plain;
}

// 7 · the mirrors again: the crack is still there, nothing moves but the light
function shotMirror2(t) {
  const u = seg(t, T.bridge2[0], T.bridge2[1]);
  const cam = { x: lerp(950, 968, ss(u)), y: lerp(540, 522, ss(u)), zoom: lerp(1.14, 1.05, ss(u)) + Math.sin(t * .7) * .003 };
  plate(P.mir, { t, cam, grey: G_MIR * .8, reveal: NEVER });
  crack(dyn, t, { t0: -100, dur: 1, x0: 636, y0: 168, y1: 926, wob: 30 });
  const bx = 300 + ((t - T.bridge2[0]) * 30) % 1000;
  dyn.push({ x: bx, y: 520, ang: Math.PI / 2 - .12, len: 700, wid: 22, c: [.9, .93, .95], c2: [.74, .8, .84], seed: 63, type: 3, alpha: .08, hgt: .3, rev: NEVER });
  flush({ t, cam, grey: G_MIR * .8, reveal: NEVER, hgt: .5 });
  return POST.plain;
}

// 8 · the same window: the rain stops, the light comes in, steam off the cup
function shotDawn(t) {
  const u = seg(t, T.outro[0], T.outro[1]);
  const cam = { x: 960, y: lerp(476, 506, ss(u)), zoom: lerp(1.14, 1.0, eio(u)) };
  const app = seg(t, T.dawnOn, T.dawnOn + 4.6);
  if (app < 1) plate(P.night, { t, cam, grey: G_MUTE, reveal: NEVER, alpha: 1 - app });
  plate(P.dawn, { t: t - T.dawnOn, cam, grey: 0, reveal: NEVER, appear: 0, appDur: 4.6, alpha: app, noUnder: app < 1 });
  // the last drops finish their run; then the glass is still
  const stop = ss(clamp((t - (T.dawnOn + 6)) / 3));
  if (stop < 1) drips(dyn, t, { n: 5, x0: 420, x1: 1520, y0: 200, y1: 740, alpha: .13 * (1 - stop) });
  rain(dyn, t, { n: Math.round(lerp(16, 0, stop)), x0: 340, x1: 1600, y0: 140, y1: 800, speed: 380, alpha: .08 * (1 - stop), wind: -.04 });
  // steam off the cup in the new light
  if (t > T.dawnOn + 2) {
    for (let i = 0; i < 7; i++) {
      const ph = ((t * .45 + i * .17) % 1);
      const sx = 1222 + Math.sin(ph * 6 + i) * 10, sy = 756 - ph * (90 + i * 6);
      dyn.push({ x: sx, y: sy, ang: Math.PI / 2 + Math.sin(ph * 5 + i) * .3, len: 26 + ph * 26, wid: 9 + i, c: [.96, .95, .9], c2: [.9, .88, .82], seed: 800 + i, type: 3, alpha: .16 * (1 - ph), hgt: .25, rev: NEVER });
    }
  }
  flush({ t, cam, grey: 0, reveal: NEVER, hgt: .3 });
  return POST.dawn;
}

const SHOTS = [
  { a: T.intro[0], b: T.intro[1], f: shotWindow },
  { a: T.v1[0], b: T.v1[1], f: shotRoom },
  { a: T.pre[0], b: T.pre[1], f: shotGlass },
  { a: T.c1[0], b: T.c1[1], f: shotSquare },
  { a: T.bridge[0], b: T.bridge[1], f: shotMirror },
  { a: T.c2[0], b: T.c2[1], f: shotSquareColour },
  { a: T.bridge2[0], b: T.bridge2[1], f: shotMirror2 },
  { a: T.outro[0], b: DUR + 1, f: shotDawn },
];

// ---- subtitles: burned in as DOM text over the canvas, and reported for readcheck
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
if (typeof window !== 'undefined') window.TEXTS = TEXTS;   // guard: lets the modules be imported outside a browser

function frame(t) {
  const s = SHOTS.find(s => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
  E.begin([.16, .15, .14]);
  const post = s.f(t) || POST.plain;
  // knife wipe over the last 0.42 s of every shot: a transition made of paint
  const out = s.b - t;
  if (out < .42 && s.b < DUR + .5) wipe(dyn, .42 - out, 0, .42, { col: [.3, .27, .25] });
  flush({ t, grey: 0, reveal: NEVER, hgt: .5 });
  E.finish(post);
  subs(t);
}

export { frame, T };
