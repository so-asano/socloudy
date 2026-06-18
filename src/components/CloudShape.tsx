import { themeAtom } from "@/lib/theme";
import { useAtomValue } from "jotai";
import { useLayoutEffect, useRef } from "react";

const BUMP = 26; // target bump radius (px) — kept constant so puffs look the same at any size
const MARGIN = 44; // canvas overflow past the card so outward bumps aren't clipped

function rand(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Build a scalloped-ellipse cloud outline sized exactly to w×h (pixel space). Valley points
 * sit on an inner ellipse; each segment between them is an outward arc (a round bump). Bump
 * COUNT scales with the perimeter so density is constant at any size, and since we generate
 * per actual size the bumps are always true circles. Top bumps trend larger for a cloud
 * profile, with gentle per-bump jitter so the outline looks hand-drawn (kept subtle so
 * nothing spills past the box).
 */
function superPoint(
  cx: number,
  cy: number,
  ra: number,
  rb: number,
  exp: number,
  t: number,
): [number, number] {
  const ct = Math.cos(t);
  const st = Math.sin(t);
  return [
    cx + ra * Math.sign(ct) * Math.abs(ct) ** (2 / exp),
    cy + rb * Math.sign(st) * Math.abs(st) ** (2 / exp),
  ];
}

/**
 * Build a scalloped cloud outline sized exactly to w×h (px). Valley points sit on a
 * SUPERELLIPSE (rounded rectangle) so the body hugs the content box (content fits with
 * little padding). Points are sampled by EQUAL ARC LENGTH so every bump is the same size —
 * otherwise the flatter sides get oversized bumps that spill past the canvas (left/right
 * clipping). Each segment is an outward arc; constant chords → constant, true-circle bumps.
 */
export function cloudPath(w: number, h: number, seed: number, inset = BUMP * 1.05): string {
  const cx = w / 2;
  const cy = h / 2;
  const ra = Math.max(20, w / 2 - inset);
  const rb = Math.max(20, h / 2 - inset);
  const EXP = 4;

  // 1) finely sample the superellipse and measure cumulative arc length
  const FINE = 360;
  const fx: number[] = [];
  const fy: number[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= FINE; i++) {
    const t = -Math.PI / 2 + (i / FINE) * 2 * Math.PI;
    const [x, y] = superPoint(cx, cy, ra, rb, EXP, t);
    fx.push(x);
    fy.push(y);
    if (i > 0) cum.push(cum[i - 1] + Math.hypot(x - fx[i - 1], y - fy[i - 1]));
  }
  const total = cum[FINE];
  const n = Math.max(10, Math.round(total / (BUMP * 2)));

  // 2) resample n points spaced evenly by arc length
  const pts: Array<[number, number]> = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    while (j < FINE && cum[j + 1] < target) j++;
    pts.push([fx[j], fy[j]]);
  }

  // 3) connect with outward arcs (uniform chords → uniform round bumps)
  let path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
  for (let k = 0; k < n; k++) {
    const [x1, y1] = pts[k];
    const [x2, y2] = pts[(k + 1) % n];
    const chord = Math.hypot(x2 - x1, y2 - y1);
    const wobble = 0.96 + rand(seed, k + 263) * 0.12;
    const r = (chord / 2) * wobble;
    path += `A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  return `${path}Z`;
}

/**
 * Cloud outline that fills its positioned parent, painted as a background-image SVG (data
 * URI). A background paints reliably even when an ancestor is CSS-transformed (the scroll
 * animation), unlike a child <svg> element which Chromium can drop in a transformed layer.
 * Measures the parent and regenerates on size or theme change.
 */
export function CloudShape({
  seed = 1,
  className = "",
  onAnimationEnd,
}: {
  seed?: number;
  className?: string;
  onAnimationEnd?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useAtomValue(themeAtom); // re-paint when the theme (fill colour) changes

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const paint = () => {
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      if (!w || !h) return;
      const cs = getComputedStyle(parent);
      const fill = cs.getPropertyValue("--fill").trim() || "#ffffff";
      const stroke = cs.getPropertyValue("--cloud-stroke").trim() || "#ffffff";
      // The canvas extends MARGIN past the card on every side so the outward bumps have
      // room and aren't clipped at the SVG edge. The body sits exactly on the card box,
      // so content (inside the card padding) stays within the cloud.
      const W = w + 2 * MARGIN;
      const H = h + 2 * MARGIN;
      const d = cloudPath(W, H, seed, MARGIN);
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'>` +
        `<defs><filter id='s' x='-20%' y='-20%' width='140%' height='140%'>` +
        `<feDropShadow dx='0' dy='8' stdDeviation='7' flood-color='#1185fe' flood-opacity='0.26'/>` +
        `</filter></defs>` +
        `<path d='${d}' fill='${fill}' stroke='${stroke}' stroke-width='2' filter='url(#s)'/></svg>`;
      el.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [seed, theme]);

  return (
    <div
      ref={ref}
      className={`cloud-shape ${className}`}
      style={{ inset: `-${MARGIN}px` }}
      onAnimationEnd={onAnimationEnd}
      aria-hidden="true"
    />
  );
}
