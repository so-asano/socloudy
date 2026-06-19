import { lightboxAtom } from "@/atoms/lightbox";
import { useAtom } from "jotai";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Fullscreen image viewer. Click outside / Escape to close; arrows to navigate. */
export function Lightbox() {
  const [state, setState] = useAtom(lightboxAtom);

  useEffect(() => {
    if (!state) return;
    // lock the page scroll behind the overlay (gutter is reserved, so no width shift)
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
      else if (e.key === "ArrowRight")
        setState((s) => (s ? { ...s, index: Math.min(s.index + 1, s.images.length - 1) } : s));
      else if (e.key === "ArrowLeft")
        setState((s) => (s ? { ...s, index: Math.max(s.index - 1, 0) } : s));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [state, setState]);

  if (!state) return null;
  const { images, index } = state;
  const src = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const move = (delta: number) =>
    setState((s) =>
      s ? { ...s, index: Math.max(0, Math.min(s.index + delta, s.images.length - 1)) } : s,
    );
  const step = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    move(delta);
  };

  // horizontal swipe on the image navigates between images
  const swipeStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    swipeStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
  };

  return (
    <div className="fixed top-0 left-0 z-[200] grid h-dvh w-screen place-items-center bg-black/85 p-6 backdrop-blur-sm">
      {/* backdrop: clicking outside the image closes */}
      <button
        type="button"
        aria-label="close"
        onClick={() => setState(null)}
        className="absolute inset-0 cursor-zoom-out"
      />
      <img
        src={src}
        alt=""
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative max-h-[92vh] max-w-[92vw] touch-pan-y rounded-2xl object-contain"
      />

      <button
        type="button"
        aria-label="close"
        onClick={() => setState(null)}
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="size-6" />
      </button>

      {hasPrev ? (
        <button
          type="button"
          aria-label="previous"
          onClick={(e) => step(e, -1)}
          className="-translate-y-1/2 absolute top-1/2 left-4 grid size-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}
      {hasNext ? (
        <button
          type="button"
          aria-label="next"
          onClick={(e) => step(e, 1)}
          className="-translate-y-1/2 absolute top-1/2 right-4 grid size-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}

      {images.length > 1 ? (
        <span className="-translate-x-1/2 absolute bottom-5 left-1/2 rounded-full bg-white/15 px-3 py-1 font-medium text-sm text-white">
          {index + 1} / {images.length}
        </span>
      ) : null}
    </div>
  );
}
