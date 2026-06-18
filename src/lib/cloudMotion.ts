import { useEffect, useRef } from "react";

/**
 * Scroll-linked motion for cloud cards. Each registered card is transformed based on how
 * close its vertical centre is to the viewport centre:
 *   - centre of screen → full scale (1) and pulled to the column centre (no x offset)
 *   - top / bottom      → smaller, and shifted horizontally by its own random offset
 * A single rAF loop updates every card per scroll/resize so it stays cheap with many cards.
 */
type Entry = { el: HTMLElement; offset: number };

const entries = new Map<HTMLElement, Entry>();
let raf = 0;
let listening = false;

const MIN_SCALE = 0.7; // edges shrink a lot
const MAX_SCALE = 1.1; // centre blooms past full size
const X_DRIFT = 0.4; // how much of the per-post offset to apply

/**
 * Transform-only effect (no layout changes), so there's no reflow feedback / flicker.
 * Cards gently shrink and drift sideways away from the viewport centre.
 */
function frame() {
  raf = 0;
  const vh = window.innerHeight || 1;
  const cy = vh / 2;
  for (const { el, offset } of entries.values()) {
    const r = el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const dist = Math.min(1, Math.abs(center - cy) / cy); // 0 at centre, 1 at edges
    const p = 1 - dist; // 1 centre, 0 edge
    const eased = p * p * (3 - 2 * p); // smoothstep
    const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * eased;
    const tx = offset * (1 - eased) * X_DRIFT;
    el.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
    // centred card on top of the stack, but kept below app chrome (header z-30, modal z-50)
    el.style.zIndex = `${Math.round(eased * 20)}`;
    // clouds further from centre (further "back") are dimmed slightly for depth
    el.style.filter = `brightness(${(0.78 + 0.22 * eased).toFixed(3)})`;
  }
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function ensureListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

/** Register a card element with its horizontal drift (px). Returns an unregister fn. */
export function registerCloud(el: HTMLElement, offset: number): () => void {
  entries.set(el, { el, offset });
  el.style.transition = "none"; // follow scroll exactly, no smoothing lag
  ensureListening();
  schedule();
  return () => {
    entries.delete(el);
    el.style.transform = "";
    el.style.marginBlock = "";
    el.style.zIndex = "";
    el.style.filter = "";
  };
}

/**
 * Attach scroll-linked cloud motion to an element. Returns a ref to spread onto the cloud
 * card. `seed` gives each card a stable horizontal drift; pass enabled=false to opt out.
 */
export function useCloudMotion<T extends HTMLElement>(seed: number, enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const offset = ((seed % 261) - 130) * 0.85; // ≈ -110..110px, deterministic per card
    return registerCloud(ref.current, offset);
  }, [seed, enabled]);
  return ref;
}
