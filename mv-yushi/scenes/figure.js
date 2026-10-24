// A figure painted with the same palette knife as the plates, rebuilt every frame.
// The skeleton is keyframed; the strokes are re-laid each frame from FIXED SEEDS, so the
// paint does not boil — it moves the way a hand-painted animation moves.
import { KNIFE, DAB } from '../engine/impasto.js';
import { hash } from './common.js';

// angle 0 = straight down; positive turns towards +x
const dir = (a) => [Math.sin(a), Math.cos(a)];
const add = (p, a, L) => { const d = dir(a); return [p[0] + d[0] * L, p[1] + d[1] * L]; };
const mix2 = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

// one knife stroke along a segment
function stroke(dyn, A, B, w, c, c2, seed, o = {}) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
  if (L < .5) return;
  dyn.push({
    x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, ang: Math.atan2(dy, dx),
    len: L * (o.over ?? 1.12), wid: w, c, c2, seed, type: o.type ?? KNIFE,
    alpha: o.alpha ?? 1, hgt: o.hgt ?? 1, bend: o.bend ?? 0, skew: (hash(seed) - .5) * .5, rev: 0,
  });
}
// a limb: several parallel knife strokes, coarse to fine, jittered by a fixed seed
function limb(dyn, A, B, w, col, seed, o = {}) {
  const n = o.n ?? 4, dark = [col[0] * .78, col[1] * .78, col[2] * .8];
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1), off = (hash(seed + i * 3.1) - .5) * w * .55;
    const nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1;
    const sh = [nx / nl * off, ny / nl * off];
    const a1 = [A[0] + sh[0], A[1] + sh[1]], b1 = [B[0] + sh[0], B[1] + sh[1]];
    const c = mix2(col, dark, o.shade ? k * .7 : k * .35);
    stroke(dyn, a1, b1, w * (.62 + .5 * hash(seed + i * 7.7)), c, col, seed + i, { hgt: 1.15 });
  }
  // the lit edge (light comes from the window: screen left)
  stroke(dyn, A, B, w * .34, [Math.min(1, col[0] * 1.35), Math.min(1, col[1] * 1.3), Math.min(1, col[2] * 1.25)], col, seed + 91, { hgt: 1.3, alpha: .85, over: .92 });
}

// the head: a ring of strokes for the skull, hair over it, then two eye dabs if we see the face
function head(dyn, C, rx, ry, skin, hair, seed, o = {}) {
  for (let i = 0; i < 10; i++) {
    const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2;
    const p0 = [C[0] + Math.cos(a0) * rx * .82, C[1] + Math.sin(a0) * ry * .82];
    const p1 = [C[0] + Math.cos(a1) * rx * .95, C[1] + Math.sin(a1) * ry * .95];
    stroke(dyn, p0, p1, ry * .62, skin, skin, seed + i, { hgt: 1.2, type: i % 3 === 0 ? DAB : KNIFE });
  }
  // hair: covers the crown and falls to the nape, leaving the neck and a little temple skin
  for (let i = 0; i < 7; i++) {
    const k = i / 6, a = Math.PI * (0.06 + 0.88 * k);
    const p0 = [C[0] + Math.cos(a) * rx * .55, C[1] - ry * .78];
    const p1 = [C[0] + Math.cos(a) * rx * 1.0, C[1] + ry * .08];
    stroke(dyn, p0, p1, ry * .34, hair, [hair[0] * 1.22, hair[1] * 1.22, hair[2] * 1.26], seed + 40 + i, { hgt: 1.35 });
  }
  // the crown, one wide stroke across the top so no scalp shows through
  stroke(dyn, [C[0] - rx * .8, C[1] - ry * .55], [C[0] + rx * .8, C[1] - ry * .55], ry * .5, hair, hair, seed + 48, { hgt: 1.4, over: 1.02 });
  // the nape: a short darker line where the hair ends
  stroke(dyn, [C[0] - rx * .55, C[1] + ry * .12], [C[0] + rx * .55, C[1] + ry * .12], ry * .16,
    [hair[0] * .7, hair[1] * .7, hair[2] * .72], hair, seed + 49, { hgt: 1.1 });
  if (o.face) {
    const ey = C[1] - ry * .05, ex = rx * .42, open = o.eyes ?? 1;
    for (const s of [-1, 1]) {
      stroke(dyn, [C[0] + s * ex - 5, ey], [C[0] + s * ex + 5, ey + open * 1.5], 3.2 * open + 1,
        [.12, .1, .1], [.2, .16, .16], seed + 70 + (s > 0 ? 1 : 0), { type: DAB, hgt: .8 });
    }
    stroke(dyn, [C[0] - 5, C[1] + ry * .42], [C[0] + 5, C[1] + ry * .42], 2.6, [.55, .3, .28], [.62, .34, .3], seed + 80, { type: DAB, hgt: .7 });
  }
}

// umbrellas: angle = openness (0 shut, 1 open); panels are painted as knife strokes
export function umbrella(dyn, C, rx, ry, col, seed, o = {}) {
  const open = o.open ?? 1, tilt = o.tilt ?? 0;
  const panels = 6, up = [Math.cos(tilt), Math.sin(tilt)];
  for (let i = 0; i < panels; i++) {
    const a = Math.PI + (i + .5) / panels * Math.PI * open;
    const px = C[0] + Math.cos(a) * rx * open, py = C[1] + Math.sin(a) * ry * open;
    const mid = mix2(C, [px, py], .55);
    const c = i % 2 ? col : [col[0] * .86, col[1] * .84, col[2] * .88];
    stroke(dyn, C, mid, ry * .75 * (.4 + .6 * open), c, col, seed + i, { hgt: 1.5, bend: .12, over: 1.02 });
    stroke(dyn, mid, [px, py], ry * .6 * (.4 + .6 * open), c, col, seed + i + 20, { hgt: 1.4, over: 1.05 });
  }
  // the rim catches the light
  for (let i = 0; i < panels; i++) {
    const a0 = Math.PI + i / panels * Math.PI * open, a1 = Math.PI + (i + 1) / panels * Math.PI * open;
    stroke(dyn, [C[0] + Math.cos(a0) * rx * open, C[1] + Math.sin(a0) * ry * open],
      [C[0] + Math.cos(a1) * rx * open, C[1] + Math.sin(a1) * ry * open],
      3.2, [Math.min(1, col[0] * 1.5), Math.min(1, col[1] * 1.4), Math.min(1, col[2] * 1.35)], col, seed + 50 + i, { hgt: 1.6 });
  }
  // shaft + handle
  if (o.shaft !== false) stroke(dyn, [C[0], C[1] + ry * .1], [C[0] + up[0] * 2, C[1] + (o.shaftLen ?? 150)], 3.4, [.28, .24, .2], [.36, .3, .24], seed + 60, { hgt: 1.2 });
}

/**
 * Draw a person.
 * o = { x, footY, h, pose, coat, skin, hair, seed, alpha, facing }
 * pose = { lean, thighL, thighR, kneeL, kneeR, armL1, armL2, armR1, armR2, headTilt, cup }
 */
export function figure(dyn, o) {
  const h = o.h ?? 250, s = h / 250;
  const p = o.pose || {};
  const lean = p.lean ?? 0;
  const footY = o.footY ?? 900, hipH = 112 * s;

  // hips: the walking bob and the sitting height
  const bob = p.bob ?? 0;
  const hip = [o.x + Math.sin(lean) * 6 * s, footY - (p.hipDrop ?? 0) * s - hipH + bob * s];
  const shoulder = add(hip, Math.PI + lean, 88 * s);       // up from the hip
  const neck = add(shoulder, Math.PI + lean, 10 * s);
  const C = add(neck, Math.PI + (p.headTilt ?? lean * .6), 30 * s);

  const coat = o.coat ?? [.3, .36, .45], skin = o.skin ?? [.72, .54, .4], hair = o.hair ?? [.18, .16, .19];
  const sd = o.seed ?? 1, al = o.alpha ?? 1;

  // ---- legs, front to back (the far leg first, so it reads behind)
  for (const side of [-1, 1]) {
    const th = (side < 0 ? p.thighL : p.thighR) ?? 0;
    const kn = (side < 0 ? p.kneeL : p.kneeR) ?? 0;
    const H = [hip[0] + side * 12 * s, hip[1]];
    const K = add(H, th, 54 * s);
    const F = add(K, th + kn, 54 * s);
    const col = side < 0 ? [coat[0] * .72, coat[1] * .72, coat[2] * .74] : [.16, .17, .2];
    limb(dyn, H, K, 19 * s, side < 0 ? [.22, .24, .29] : [.17, .18, .22], sd + 300 + (side > 0 ? 10 : 0), { n: 3 });
    limb(dyn, K, F, 16 * s, side < 0 ? [.2, .22, .27] : [.15, .16, .2], sd + 320 + (side > 0 ? 10 : 0), { n: 3 });
    stroke(dyn, F, [F[0] + (side < 0 ? -12 : 12) * s, F[1] + 4 * s], 9 * s, [.1, .1, .12], [.14, .14, .16], sd + 340 + side, { type: DAB, hgt: 1.2 });
  }

  // ---- coat / torso: a tapered mass, then its lit edge
  const wS = 26 * s, wH = 36 * s;
  for (let i = 0; i < 7; i++) {
    const k = (i + .5) / 7;
    const A = mix2([shoulder[0] - wS, shoulder[1]], [shoulder[0] + wS, shoulder[1]], k);
    const B = mix2([hip[0] - wH, hip[1]], [hip[0] + wH, hip[1]], k);
    const c = mix2([coat[0] * .8, coat[1] * .8, coat[2] * .82], coat, k);
    stroke(dyn, A, B, 11 * s * (.8 + .5 * hash(sd + i * 5.3)), c, coat, sd + 100 + i, { hgt: 1.25, bend: .05 });
  }
  stroke(dyn, [shoulder[0] - wS * .8, shoulder[1]], [hip[0] - wH * .8, hip[1]], 8 * s,
    [Math.min(1, coat[0] * 1.5), Math.min(1, coat[1] * 1.42), Math.min(1, coat[2] * 1.3)], coat, sd + 130, { hgt: 1.35 });

  // ---- arms
  for (const side of [-1, 1]) {
    const a1 = (side < 0 ? p.armL1 : p.armR1) ?? side * .12;
    const a2 = (side < 0 ? p.armL2 : p.armR2) ?? side * .2;
    const S = [shoulder[0] + side * wS * .9, shoulder[1] + 6 * s];
    // arms hang from the shoulder: angle 0 = straight down, + = outward from the body
    const E = add(S, side * .16 + a1, 46 * s);
    const Hnd = add(E, side * .16 + a2, 42 * s);
    limb(dyn, S, E, 14 * s, coat, sd + 200 + (side > 0 ? 10 : 0), { n: 3 });
    limb(dyn, E, Hnd, 12 * s, [coat[0] * .9, coat[1] * .9, coat[2] * .92], sd + 220 + (side > 0 ? 10 : 0), { n: 3 });
    stroke(dyn, Hnd, [Hnd[0], Hnd[1] + 7 * s], 10 * s, skin, skin, sd + 240 + side, { type: DAB, hgt: 1.15 });
    if (side > 0 && p.cup) {
      const cx = Hnd[0], cy = Hnd[1] - 12 * s;
      stroke(dyn, [cx - 9 * s, cy], [cx + 9 * s, cy], 14 * s, [.75, .22, .16], [.82, .3, .22], sd + 260, { hgt: 1.5 });
      stroke(dyn, [cx - 7 * s, cy - 9 * s], [cx + 7 * s, cy - 9 * s], 5 * s, [.9, .42, .3], [.95, .5, .36], sd + 262, { type: DAB, hgt: 1.3 });
    }
  }

  // ---- neck + head
  limb(dyn, neck, C, 12 * s, skin, sd + 400, { n: 2 });
  head(dyn, C, 17 * s, 21 * s, skin, hair, sd + 500, { face: o.face, eyes: o.eyes });
  return { hip, shoulder, neck, head: C };
}

// ---- walk cycle: phase in radians, amplitude in radians
export function walkPose(ph, amp = 1, armAmp = .8) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return {
    thighL: s * .38 * amp, kneeL: Math.max(0, -s) * .5 * amp + .05,
    thighR: -s * .38 * amp, kneeR: Math.max(0, s) * .5 * amp + .05,
    armL1: -s * .3 * armAmp, armL2: -s * .18 * armAmp + .1,
    armR1: s * .3 * armAmp, armR2: s * .18 * armAmp + .1,
    bob: Math.abs(c) * 3.2 * amp, lean: .03,
  };
}
// ---- sitting: knees bent, hands on knees (or one holding the cup)
export const SIT = { thighL: .55, kneeL: -1.45, thighR: .5, kneeR: -1.4, armL1: .42, armL2: .62, armR1: .36, armR2: .5, hipDrop: 62, lean: .08, cup: true };
// ---- standing still, weight on one leg, one hand at the side
export const STAND = { thighL: .04, kneeL: .03, thighR: -.03, kneeR: .02, armL1: .06, armL2: .08, armR1: .05, armR2: .1, cup: true };
