// Per-frame stroke emitters: everything in the film that actually moves is built here and
// handed to the renderer every frame. All of it is a pure function of t (fixed seeds), so any
// frame can be rendered alone and the paint never boils.
import { KNIFE, DAB } from '../engine/impasto.js';
import { hash, clamp, lerp, ss } from './common.js';
import { figure, umbrella, walkPose } from './figure.js';

// rev 0 = "follows the colour sweep": stays grey until the knife reaches it.
const push = (dyn, o) => dyn.push({ rev: 0, ...o });

// ---------------------------------------------------------------- rain
// o = { n, x0,x1, y0,y1, speed, wind, alpha, wid, splash }
export function rain(dyn, t, o = {}) {
  const n = o.n ?? 120, x0 = o.x0 ?? 0, x1 = o.x1 ?? 1920, y0 = o.y0 ?? 0, y1 = o.y1 ?? 1080;
  const sp = o.speed ?? 1000, wind = o.wind ?? -.08, alpha = o.alpha ?? .3, wid = o.wid ?? 2.2;
  const span = y1 - y0;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3.1 + 7), h2 = hash(i * 7.7 + 3), h3 = hash(i * 1.3 + 19);
    const x = lerp(x0, x1, h1);
    const y = y0 + ((h2 * span + t * sp * (.82 + h3 * .42)) % span);
    const len = Math.min(48 + h3 * 78, y1 - y);
    if (len < 10) continue;
    push(dyn, { x, y, ang: Math.PI / 2 + wind, len, wid: wid * (.65 + h1 * .9), c: [.66, .73, .78], c2: [.54, .61, .66], seed: i * 13, type: 3, alpha, hgt: .3 });
    // splash: two tiny dabs where it lands (only near the bottom band, and not for every drop)
    if (o.splash && h3 > .72) {
      const gy = y1 - 6;
      push(dyn, { x: x + 6, y: gy, ang: 0, len: 7, wid: 3.4, c: [.8, .85, .88], c2: [.7, .76, .8], seed: i * 29, type: DAB, alpha: alpha * .8, hgt: .5 });
    }
  }
}

// ---------------------------------------------------------------- drops running down glass
// o = { n, x0,x1, y0,y1, speed, alpha }  each drop has its own start, speed and wobble
export function drips(dyn, t, o = {}) {
  const n = o.n ?? 12, x0 = o.x0 ?? 320, x1 = o.x1 ?? 1600, y0 = o.y0 ?? 170, y1 = o.y1 ?? 780;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 5.3 + 1), h2 = hash(i * 8.1 + 4), h3 = hash(i * 2.7 + 9), h4 = hash(i * 6.9 + 15);
    const x = lerp(x0, x1, h1);
    const span = y1 - y0;
    const period = 9 + h2 * 14;                       // seconds per run
    const ph = ((t + h3 * period) % period) / period; // 0..1
    const y = y0 + span * Math.pow(ph, 1.6) * (.55 + h4 * .7);
    if (y > y1 - 4) continue;
    const wob = Math.sin(t * (.7 + h3) + i) * (3 + h4 * 5);
    const r = 3.4 + h4 * 3.4;
    // the wet trail it leaves (two strokes behind it, fading)
    const trail = 40 + h2 * 90;
    for (let k = 0; k < 3; k++) {
      const yt = y - trail * (k + 1) / 3.4;
      if (yt < y0) continue;
      push(dyn, { x: x + wob * (.6 + k * .2), y: yt, ang: Math.PI / 2, len: trail / 3.2, wid: r * (1.3 - k * .28),
        c: [.74, .82, .86], c2: [.62, .7, .74], seed: i * 11 + k, type: 3, alpha: (o.alpha ?? .3) * (.75 - k * .2), hgt: .35 });
    }
    // the drop itself: one round dab and a highlight
    push(dyn, { x: x + wob, y, ang: 0, len: r * 2, wid: r * 2, c: [.82, .9, .93], c2: [.68, .78, .82], seed: i * 17, type: DAB, alpha: (o.alpha ?? .3) * 2.1, hgt: .9 });
    push(dyn, { x: x + wob - r * .3, y: y - r * .35, ang: 0, len: r * .8, wid: r * .8, c: [1, 1, .99], c2: [.9, .94, .95], seed: i * 19, type: DAB, alpha: (o.alpha ?? .3) * 2.4, hgt: .8 });
  }
}

// ---------------------------------------------------------------- stars on wet glass
export function stars(dyn, t, t0, o = {}) {
  for (let i = 0; i < 28; i++) {
    const h1 = hash(i * 5.7 + 1), h2 = hash(i * 2.9 + 11), h3 = hash(i * 8.3 + 5), h4 = hash(i * 4.1 + 23);
    const on = t0 + h1 * 7.5;
    if (t < on) continue;
    const pop = ss(clamp((t - on) / .5));
    const drift = (t - on) * (.6 + h3 * 1.4);
    const x = lerp(o.x0 ?? 500, o.x1 ?? 1500, h1) + Math.sin(t * .8 + i) * 6 + drift * .4;
    const y = lerp(o.y0 ?? 180, o.y1 ?? 470, h2) - drift;
    const r = (4 + h3 * 7) * pop, tw = .55 + .45 * Math.sin(t * (1.6 + h3 * 1.4) + i);
    push(dyn, { x, y, ang: 0, len: r * 2.2, wid: r * 2.2, c: [1, .94, .8], c2: [1, .8, .52], seed: i * 31, type: DAB, alpha: .9 * tw * pop, hgt: 1.1 });
    // a faint four-point glint
    push(dyn, { x, y, ang: 0, len: r * 6 * pop, wid: r * .5, c: [1, .95, .85], c2: [1, .86, .6], seed: i * 37, type: 3, alpha: .32 * tw * pop, hgt: .4 });
    push(dyn, { x, y, ang: Math.PI / 2, len: r * 6 * pop, wid: r * .5, c: [1, .95, .85], c2: [1, .86, .6], seed: i * 41, type: 3, alpha: .26 * tw * pop, hgt: .4 });
  }
}

// ---------------------------------------------------------------- puddle ripples
// rings that expand and fade on the wet ground, driven by rain impacts at fixed spots
export function ripples(dyn, t, o = {}) {
  const n = o.n ?? 14, x0 = o.x0 ?? 0, x1 = o.x1 ?? 2100, y0 = o.y0 ?? 700, y1 = o.y1 ?? 1180;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 4.7 + 2), h2 = hash(i * 9.3 + 5), h3 = hash(i * 6.1 + 13);
    const cx = lerp(x0, x1, h1), cy = lerp(y0, y1, h2);
    const period = 1.6 + h3 * 1.8;
    const ph = ((t + h1 * period) % period) / period;
    const R = (10 + h2 * 26) * ph;
    const a = (o.alpha ?? .45) * (1 - ph) * (.5 + h3 * .5);
    if (a <= .02) continue;
    const seg = 7;
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
      push(dyn, {
        x: cx + Math.cos((a0 + a1) / 2) * R, y: cy + Math.sin((a0 + a1) / 2) * R * .34,
        ang: (a0 + a1) / 2 + Math.PI / 2, len: R * .9, wid: 2.2 + ph * 1.4,
        c: [.88, .9, .9], c2: [.72, .76, .78], seed: i * 23 + k, type: 3, alpha: a, hgt: .3,
      });
    }
  }
}

// ---------------------------------------------------------------- crowd
// walkers in the square: each one a figure + umbrella, walking a line, on the beat
export function crowd(dyn, t, list, o = {}) {
  for (const w of list) {
    const k = clamp((t - w.t0) / (w.t1 - w.t0));
    if (k <= 0 || k >= 1) continue;
    const x = lerp(w.x0, w.x1, k), sp = Math.abs(w.x1 - w.x0) / (w.t1 - w.t0);
    const ph = (t - w.t0) * sp / (w.h * .52) * Math.PI;
    const pose = walkPose(ph, .9, .7);
    const bobOpen = .55 + .45 * Math.sin(t * 1.7 + w.seed);
    figure(dyn, { x, footY: w.y, h: w.h, pose, coat: w.coat, skin: w.skin ?? [.74, .56, .42], hair: [.16, .14, .17], seed: w.seed * 7, face: false });
    umbrella(dyn, [x + Math.sin(t * 1.2 + w.seed) * 2, w.y - w.h * .96 + Math.sin(t * 2.4 + w.seed) * 1.6],
      w.h * .34, w.h * .13, w.umb, w.seed * 11, { open: 1, tilt: .06 * Math.sin(t + w.seed) });
  }
}

// ---------------------------------------------------------------- the crack
export function crack(dyn, t, o = {}) {
  const x0 = o.x0 ?? 620, y0 = o.y0 ?? 160, y1 = o.y1 ?? 930, p = clamp((t - o.t0) / (o.dur ?? 6));
  if (p <= 0) return;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    if (k > p) break;
    pts.push([x0 + Math.sin(k * 9.4) * (o.wob ?? 34) * (k > .2 ? 1 : k * 4), lerp(y0, y1, k)]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1];
    push(dyn, { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, ang: Math.atan2(B[1] - A[1], B[0] - A[0]),
      len: Math.hypot(B[0] - A[0], B[1] - A[1]) * 1.15, wid: 4.6, c: [.93, .96, .97], c2: [.78, .84, .88], seed: 900 + i, type: KNIFE, alpha: .95, hgt: 1.6 });
  }
  // shards catching the light along the crack
  for (let i = 0; i < 5; i++) {
    const k = (i + .5) / 5;
    if (k > p) continue;
    const x = x0 + Math.sin(k * 9.4) * (o.wob ?? 34), y = lerp(y0, y1, k);
    push(dyn, { x: x + 22, y: y + 6, ang: .7, len: 26 + i * 4, wid: 7, c: [.9, .94, .96], c2: [.7, .78, .82], seed: 950 + i, type: KNIFE, alpha: .55, hgt: 1.4 });
  }
}

// ---------------------------------------------------------------- knife wipe (a transition made of paint)
// the incoming picture is painted over the outgoing one with a band of strokes
export function wipe(dyn, t, t0, dur, o = {}) {
  const p = clamp((t - t0) / dur);
  if (p <= 0 || p >= 1) return;
  const front = lerp(-160, 2080, ss(p));
  const col = o.col || [.34, .3, .27];
  for (let i = 0; i < 46; i++) {
    const h1 = hash(i * 3.7 + 5), h2 = hash(i * 6.3 + 1);
    const y = lerp(-40, 1160, h1), x = front - 40 + h2 * 130 - h1 * 40;
    push(dyn, { x, y, ang: -.16 + (h2 - .5) * .3, len: 170 + h2 * 130, wid: 26 + h1 * 34,
      c: col, c2: [col[0] * 1.2, col[1] * 1.16, col[2] * 1.1], seed: 700 + i, type: KNIFE, alpha: .96, hgt: 1.5, skew: (h1 - .5) * 1.4 });
  }
}

// ---------------------------------------------------------------- small life
// lamp flicker: returns a 0..1 multiplier that never quite settles
export const flicker = (t, seed = 1) => .9 + .1 * (hash(Math.floor(t * 9 + seed)) * .6 + Math.sin(t * 7.3 + seed) * .4);
